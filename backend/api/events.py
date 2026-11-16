"""
Hub de eventos em memória + tickets de sessão para o stream SSE.

Decisão do ADR-0003: um único processo FastAPI/SQLite, sem Redis. O hub
entrega eventos de LEITURA para todas as conexões vivas; nenhuma mutação
entra por aqui (comandos continuam via REST autenticado).
"""

import asyncio
import json
import secrets
import time
from collections import deque
from typing import Any, AsyncGenerator, Optional

# TTL do ticket de sessão do EventSource. Curto de propósito: o ticket só
# serve para o handshake (o JWT nunca aparece na query string do stream).
TICKET_TTL_SECONDS = 60

# Buffer curto para reconexão via Last-Event-ID (últimos 100 eventos).
BUFFER_MAX_LEN = 100

# Heartbeat para manter vivos proxies e conexões ociosas.
HEARTBEAT_SECONDS = 15


class EventHub:
    """Registro de conexões ativas e difusão de eventos (fanout O(n))."""

    def __init__(self) -> None:
        # Uma fila por cliente conectado. O set permite remover conexões mortas.
        self.connections: set[asyncio.Queue] = set()
        # Sequência monotônica por servidor (usada pelo cliente para dedupe).
        self.seq: int = 0
        # Buffer dos últimos eventos, reenviados no reconnect (Last-Event-ID).
        self.buffer: deque[dict[str, Any]] = deque(maxlen=BUFFER_MAX_LEN)

    async def broadcast(self, type_: str, payload: dict[str, Any]) -> None:
        """Persistiu? Então difunde. Fila que falhar é descartada do registro."""
        self.seq += 1
        evento = {"seq": self.seq, "type": type_, "payload": payload}
        self.buffer.append(evento)

        # list(...) porque o set pode ser alterado durante a iteração.
        for fila in list(self.connections):
            try:
                fila.put_nowait(evento)
            except Exception:
                # Conexão morta/lenta: não deixa a fila inviabilizar o fanout.
                self.connections.discard(fila)

    def connect(self) -> asyncio.Queue:
        fila: asyncio.Queue = asyncio.Queue()
        self.connections.add(fila)
        return fila

    def disconnect(self, fila: asyncio.Queue) -> None:
        self.connections.discard(fila)


# Singleton do processo (uvicorn worker único, conforme ADR).
hub = EventHub()


# ---------------------------------------------------------------------------
# Tickets de sessão do EventSource
# ---------------------------------------------------------------------------
# {token: {"user_id": int, "role": str, "exp": float}}
tickets: dict[str, dict[str, Any]] = {}


def _purge_expired_tickets() -> None:
    agora = time.time()
    for token in [t for t, info in tickets.items() if info["exp"] <= agora]:
        tickets.pop(token, None)


def create_ticket(user_id: int, role: str) -> str:
    """Gera um ticket de uso único (o JWT não trafega na query do stream)."""
    _purge_expired_tickets()
    token = secrets.token_urlsafe(32)
    tickets[token] = {
        "user_id": user_id,
        "role": role,
        "exp": time.time() + TICKET_TTL_SECONDS,
    }
    return token


def consume_ticket(token: Optional[str]) -> Optional[dict[str, Any]]:
    """Valida e CONSOME o ticket. Retorna os dados da sessão ou None.

    Uso único: o token é removido mesmo quando expirado (não pode ser reusado).
    """
    if not token:
        return None
    info = tickets.pop(token, None)
    if info is None:
        return None
    if info["exp"] <= time.time():
        return None
    return info


async def event_stream(
    fila: asyncio.Queue, last_event_id: Optional[int]
) -> AsyncGenerator[str, None]:
    """Gerador do corpo SSE: replay opcional + eventos novos + heartbeat."""
    ultimo_enviado = last_event_id if last_event_id is not None else 0
    try:
        # Primeira saída IMEDIATA: o StreamingResponse só manda os headers
        # quando o gerador produz o 1º chunk — sem isso, o EventSource ficava
        # 3-15s em "conectando" até o próximo evento/heartbeat. Um comentário
        # SSE já libera a conexão no handshake (visível ao cliente: onopen).
        yield ": conectado ao palco\n\n"

        # Replay SOMENTE em reconexão (Last-Event-ID presente). Conexão nova
        # reconstrói a tela via GET /api/ceremony/position + /api/chat/recent.
        if last_event_id is not None:
            # Snapshot: o buffer pode mudar enquanto o gerador cede controle.
            for evento in list(hub.buffer):
                if evento["seq"] > last_event_id:
                    # O campo "id:" é o que faz o EventSource nativo guardar o
                    # seq e reenviar o header Last-Event-ID sozinho no reconnect
                    # (sem ele o replay do ADR-0003 nunca dispararia).
                    yield (
                        f"id: {evento['seq']}\n"
                        f"data: {json.dumps(evento, ensure_ascii=False)}\n\n"
                    )
                    ultimo_enviado = evento["seq"]

        while True:
            try:
                evento = await asyncio.wait_for(fila.get(), timeout=HEARTBEAT_SECONDS)
            except asyncio.TimeoutError:
                # Linha de comentário SSE: mantém a conexão viva nos proxies.
                yield ": ping\n\n"
                continue

            # Evita duplicar evento que já saiu no replay do buffer.
            if evento["seq"] <= ultimo_enviado:
                continue
            ultimo_enviado = evento["seq"]
            # "id:" também nos eventos ao vivo: mantém o Last-Event-ID do
            # EventSource sempre apontando para o último seq entregue.
            yield (
                f"id: {evento['seq']}\n"
                f"data: {json.dumps(evento, ensure_ascii=False)}\n\n"
            )
    finally:
        # Sempre desregistra, inclusive em desconexão/cancelamento do cliente.
        hub.disconnect(fila)