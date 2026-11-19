import json
import logging
import hashlib

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Header,
    Path,
    Query,
    Response,
)
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import uuid4
import os
from backend.database import get_db
from backend.models import models
from backend.schemas import schemas
from backend.crud import crud
from backend.core import security
from backend.core.config import settings as app_settings
from backend.api import deps, events
from pydantic import BaseModel

router = APIRouter(prefix="/api")

logger = logging.getLogger("gala.sse")

@router.get("/state", response_model=schemas.StateResponse)
def get_state(db: Session = Depends(get_db)):
    settings = crud.get_settings(db)
    total_votos = crud.get_total_votes(db)
    total_users = crud.get_total_users(db)
    total_candidatos = crud.get_total_candidatos(db)
    return {
        "votacao_aberta": settings.votacao_aberta,
        "reveal_at": settings.reveal_at,
        "total_votos": total_votos,
        "total_users": total_users,
        "total_candidatos": total_candidatos
    }

@router.post("/register", response_model=schemas.Token)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    created_user = crud.create_user(db=db, user=user)
    access_token = security.create_access_token(data={"sub": created_user.username, "role": "user"})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if not db_user or not security.verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = security.create_access_token(data={"sub": db_user.username, "role": "user"})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(deps.get_current_user)):
    return current_user

@router.patch("/users/me", response_model=schemas.ProfileUpdateResponse)
def update_profile(update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    # Normalização: apenas strip de espaços (o frontend normaliza o resto).
    username = update.username.strip() if update.username is not None else None
    vulgo = update.vulgo.strip() if update.vulgo is not None else None

    # Se o username mudou, o JWT atual (sub=username antigo) fica stale.
    # Emitimos um token novo na resposta; o frontend o troca imediatamente.
    username_changed = username is not None and username != current_user.username

    updated = crud.update_user_profile(db, current_user, username=username, vulgo=vulgo)
    if updated is None:
        # Username já em uso por outro usuário.
        raise HTTPException(status_code=400, detail="Username already registered")

    access_token = None
    if username_changed:
        access_token = security.create_access_token(data={"sub": updated.username, "role": "user"})

    return {"user": updated, "access_token": access_token}

@router.patch("/users/me/password")
def update_password(payload: schemas.PasswordChange, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    if not security.verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    crud.update_user_password(db, current_user, payload.new_password)
    return {"status": "success"}

@router.post("/users/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    # Lê o conteúdo real em memória: não confiamos no Content-Length nem no
    # accept="image/*" do frontend (ambos são apenas UX e burláveis via curl).
    data = await file.read()

    # Limite rígido de 200KB (checado no servidor, conforme decisão do dono).
    if len(data) > 200_000:
        raise HTTPException(status_code=413, detail="Avatar excede 200KB")

    # Validação server-side por magic bytes (JPEG / PNG / WebP).
    ext = None
    if data[:3] == b"\xff\xd8\xff":
        ext = "jpg"
    elif data[:8] == b"\x89PNG\r\n\x1a\n":
        ext = "png"
    elif len(data) >= 12 and data[0:4] == b"RIFF" and data[8:12] == b"WEBP":
        ext = "webp"

    if ext is None:
        raise HTTPException(
            status_code=415,
            detail="Formato de avatar não suportado (use JPEG, PNG ou WebP)",
        )

    # Nome aleatório gerado no servidor: o nome original NUNCA é persistido.
    filename = f"{uuid4().hex}.{ext}"
    os.makedirs(app_settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(app_settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as out:
        out.write(data)

    # Persiste somente o caminho relativo (o diretório pode virar volume Docker).
    current_user.avatar = f"uploads/{filename}"
    db.commit()
    db.refresh(current_user)

    # A resposta expõe a URL da API, nunca o caminho de disco.
    return {"avatar_url": "/api/users/me/avatar_file"}


@router.get("/users/me/avatar_file")
def get_avatar_file(current_user: models.User = Depends(deps.get_current_user)):
    if not current_user.avatar:
        raise HTTPException(status_code=404, detail="User has no avatar")

    # Mime derivado da extensão salva (sempre image/*, nunca executável).
    ext = os.path.splitext(current_user.avatar)[1].lstrip(".").lower()
    # basename protege contra path traversal mesmo se o campo for adulterado.
    filepath = os.path.join(app_settings.UPLOAD_DIR, os.path.basename(current_user.avatar))
    return FileResponse(
        filepath,
        media_type=f"image/{ext}",
        headers={"Content-Disposition": "inline"},
    )


@router.delete("/users/me/avatar", status_code=204)
def delete_avatar(db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    """Remove o avatar: apaga o ARQUIVO em disco (o nome é aleatório, gerado
    no upload) e zera a referência no banco. Idempotente: sem avatar → 204."""
    if current_user.avatar:
        # basename: o campo é sempre "uploads/<arquivo>" — defesa extra contra
        # path traversal mesmo se o campo for adulterado no banco.
        caminho = os.path.join(app_settings.UPLOAD_DIR, os.path.basename(current_user.avatar))
        try:
            if os.path.isfile(caminho):
                os.remove(caminho)
        except OSError:
            # Falha ao apagar o arquivo não impede de limpar a referência.
            pass
    current_user.avatar = None
    db.commit()
    return None

@router.get("/categories", response_model=list[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    categories = crud.get_categories(db)
    result = []
    for cat in categories:
        cat_dict = {
            "id": cat.id,
            "title": cat.title,
            "emoji": cat.emoji,
            "modo": cat.modo,
            "reveal_order": cat.reveal_order,
            "description": cat.description,
            "criteria": cat.criteria,
            "candidacies": []
        }
        for cand in cat.candidacies:
            cat_dict["candidacies"].append({
                "id": cand.id,
                "user_id": cand.user_id,
                "username": cand.user.username,
                "pitch": cand.pitch
            })
        result.append(cat_dict)
    return result

@router.post("/candidacies", response_model=schemas.CandidacyResponse, status_code=status.HTTP_201_CREATED)
def create_candidacy(candidacy: schemas.CandidacyCreate, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    settings = crud.get_settings(db)
    if not settings.votacao_aberta:
        raise HTTPException(status_code=403, detail="Voting is closed")
    
    # Limite de 4 candidaturas por eleitor — espelha a regra da cédula no frontend
    limite = db.query(models.Candidacy).filter(models.Candidacy.user_id == current_user.id).count()
    if limite >= 4:
        raise HTTPException(status_code=400, detail="Limit of 4 candidacies per user")

    existing = db.query(models.Candidacy).filter(
        models.Candidacy.category_id == candidacy.category_id,
        models.Candidacy.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a candidate in this category")
        
    created = crud.create_candidacy(db, candidacy, user_id=current_user.id)

    # Ato do eleitor na ata (consumida pelo perfil dele em /audit/me).
    categoria = (
        db.query(models.Category)
        .filter(models.Category.id == candidacy.category_id)
        .first()
    )
    crud.record_audit(
        db,
        current_user.username,
        "candidatura_criada",
        f"candidatura em '{categoria.title}'" if categoria else "candidatura criada",
    )

    return {
        "id": created.id,
        "pitch": created.pitch,
        "user_id": current_user.id,
        "username": current_user.username
    }

@router.put("/candidacies/{candidacy_id}", response_model=schemas.CandidacyResponse)
def update_candidacy(candidacy_id: int, candidacy: schemas.CandidacyUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    settings = crud.get_settings(db)
    if not settings.votacao_aberta:
        raise HTTPException(status_code=403, detail="Voting is closed")
        
    db_candidacy = crud.get_candidacy(db, candidacy_id)
    if not db_candidacy:
        raise HTTPException(status_code=404, detail="Candidacy not found")
    if db_candidacy.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this pitch")
        
    updated = crud.update_candidacy(db, candidacy_id, candidacy.pitch)
    return {
        "id": updated.id,
        "pitch": updated.pitch,
        "user_id": current_user.id,
        "username": current_user.username
    }

@router.post("/votes")
async def cast_vote(vote: schemas.VoteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    settings = crud.get_settings(db)
    if not settings.votacao_aberta:
        raise HTTPException(status_code=403, detail="Voting is closed")
        
    if current_user.id == vote.voted_user_id:
        raise HTTPException(status_code=403, detail="Self-voting is not allowed")
        
    crud.cast_vote(db, vote, voter_id=current_user.id)

    # O ato do eleitor entra na ata (o perfil dele consome via /audit/me).
    # O VOTO em si é sigiloso no pódio, mas o AUTOR do voto é o próprio
    # eleitor — ele já sabe em quem votou; a ata é o diário dele.
    votado = crud.get_user(db, vote.voted_user_id)
    categoria = (
        db.query(models.Category).filter(models.Category.id == vote.category_id).first()
    )
    crud.record_audit(
        db,
        current_user.username,
        "voto_registrado",
        f"voto em @{votado.username} na categoria '{categoria.title}'"
        if votado and categoria
        else "voto registrado",
    )

    # Persistiu → difunde. Apenas o TOTAL: o voto individual é sigiloso.
    await events.hub.broadcast(
        "votes.counter", {"total": crud.get_total_votes(db)}
    )
    return {"status": "success"}

@router.get("/votes/me")
def read_my_votes(db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    # Cédulas do PRÓPRIO eleitor autenticado — retorna a cesta de votos dele.
    votes = crud.get_votes_for_voter(db, current_user.id)
    return [
        {
            "category_id": v.category_id,
            "voted_user_id": v.voted_user_id,
            "voted_username": crud.get_user(db, v.voted_user_id).username,
            # Horário do registro no cartório (None em votos pré-migração).
            "voted_at": v.created_at.isoformat() if v.created_at else None,
        }
        for v in votes
    ]

@router.get("/votes/me/stamp")
def my_vote_stamp(db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    """Selo notarial REAL: hash SHA-256 da cesta atual do eleitor, calculado
    NO SERVIDOR (antes era cosmético gerado no cliente). Determinístico:
    a mesma cesta produz o mesmo selo — dá para auditar depois."""
    votes = crud.get_votes_for_voter(db, current_user.id)
    if not votes:
        raise HTTPException(status_code=404, detail="Sem votos para selar")
    # Ordena por categoria para o hash ser estável (ordem de inserção não conta).
    cesta = ";".join(
        f"{v.category_id}-{v.voted_user_id}"
        for v in sorted(votes, key=lambda x: x.category_id)
    )
    digest = hashlib.sha256(f"luluka-gala:{current_user.id}:{cesta}".encode()).hexdigest().upper()
    return {"stamp": f"#GALA-2026-{digest[:6]}", "ballot_size": len(votes)}

@router.get("/results", response_model=list[schemas.CategoryResultResponse])
def get_results(db: Session = Depends(get_db)):
    settings = crud.get_settings(db)
    if settings.votacao_aberta:
        if not settings.reveal_at or datetime.now() < settings.reveal_at:
            raise HTTPException(status_code=403, detail="Results are not yet available")
            
    categories = crud.get_categories(db)
    results = []
    for cat in categories:
        podium = crud.get_podium_for_category(db, cat.id)
        results.append({
            "category_id": cat.id,
            "title": cat.title,
            "podium": podium[:4]
        })
    return results

class AdminLogin(BaseModel):
    password: str

@router.post("/admin/login", response_model=schemas.Token)
def admin_login(admin_login: AdminLogin):
    from backend.core.config import settings
    if admin_login.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    
    access_token = security.create_access_token(data={"sub": "admin", "role": "admin"})
    return {"access_token": access_token, "token_type": "bearer"}

@router.put("/admin/settings", response_model=schemas.SettingsUpdate)
async def admin_update_settings(settings_update: schemas.SettingsUpdate, db: Session = Depends(get_db), admin: bool = Depends(deps.verify_admin_token)):
    updated = crud.update_settings(db, settings_update)

    # Ata notarial: guarda o agendamento resultante (ou "sem agendamento").
    crud.record_audit(
        db,
        "admin",
        "agendamento_alterado",
        updated.reveal_at.isoformat() if updated.reveal_at else "sem agendamento",
    )

    # Persistiu → difunde o estado espelhando GET /api/state (timestamps em ISO:
    # o payload do SSE é serializado com json.dumps).
    await events.hub.broadcast("state.change", {
        "votacao_aberta": updated.votacao_aberta,
        "reveal_at": updated.reveal_at.isoformat() if updated.reveal_at else None,
        "total_votos": crud.get_total_votes(db),
        "total_users": crud.get_total_users(db),
        "total_candidatos": crud.get_total_candidatos(db),
    })

    return {
        "votacao_aberta": updated.votacao_aberta,
        "reveal_at": updated.reveal_at
    }


# ---------------------------------------------------------------------------
# Chat em tempo real (REST persiste; o hub difunde chat.message)
# ---------------------------------------------------------------------------
@router.post(
    "/chat",
    response_model=schemas.ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_chat_message(
    payload: schemas.ChatCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    texto = payload.text.strip()
    if not texto:
        raise HTTPException(status_code=400, detail="Mensagem vazia")

    message = crud.create_chat_message(
        db,
        user_id=current_user.id,
        username=current_user.username,
        text=texto,
    )

    # created_at pode vir do server_default; ISO garante payload JSON-safe.
    created_at = (
        message.created_at.isoformat() if message.created_at else datetime.now().isoformat()
    )
    await events.hub.broadcast("chat.message", {
        "id": message.id,
        "user_id": message.user_id,
        "username": message.username,
        "text": message.text,
        "created_at": created_at,
    })
    return message


@router.get("/chat/recent", response_model=list[schemas.ChatMessageResponse])
def get_recent_chat_messages(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    # O CRUD busca os mais recentes (DESC); a resposta é cronológica.
    mensagens = crud.get_recent_chat(db, limit=limit)
    return list(reversed(mensagens))


# ---------------------------------------------------------------------------
# Hub SSE: ticket de sessão + stream
# ---------------------------------------------------------------------------
@router.post("/events/ticket")
def issue_events_ticket(
    current_user: models.User = Depends(deps.get_current_user),
    token: str = Depends(deps.oauth2_scheme),
):
    # O EventSource não envia header Authorization; o ticket curto (60s, uso
    # único) é o que autentica o handshake. O JWT nunca vai na query string.
    payload = security.decode_access_token(token) or {}
    role = payload.get("role", "user")
    ticket = events.create_ticket(current_user.id, role)
    return {"ticket": ticket}


@router.get("/events")
async def stream_events(
    ticket: str | None = None,
    # EventSource reenvia automaticamente o último seq recebido no reconnect.
    last_event_id: str | None = Header(default=None, alias="Last-Event-ID"),
):
    # Validação FORA do gerador: ticket inválido vira 401 HTTP comum, antes de
    # abrir o stream (o StreamingResponse só é criado se o handshake passar).
    session_info = events.consume_ticket(ticket)
    if session_info is None:
        raise HTTPException(
            status_code=401, detail="Ticket de evento inválido ou expirado"
        )

    start_seq = None
    if last_event_id is not None:
        try:
            start_seq = int(last_event_id)
        except (TypeError, ValueError):
            start_seq = None

    logger.info(
        "SSE conectado: user_id=%s role=%s",
        session_info["user_id"],
        session_info["role"],
    )

    fila = events.hub.connect()
    # Quem entrou soma na contagem exibida no chat (o próprio recém-chegado
    # recebe o presence.update dele pelo fanout acima).
    events.hub.broadcast_presence()
    return StreamingResponse(
        events.event_stream(fila, start_seq),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            # Nginx: desliga o buffering para o SSE chegar imediatamente.
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ---------------------------------------------------------------------------
# Cerimônia dirigida
# ---------------------------------------------------------------------------
@router.get("/ceremony/position")
def ceremony_position(db: Session = Depends(get_db)):
    # Sem auth: a cerimônia é observável; a posição é determinística e serve
    # para o cliente reconstruir a tela ao abrir a página do zero.
    return crud.get_ceremony_position(db)


@router.post("/admin/ceremony/start")
async def ceremony_start(
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    settings = crud.get_settings(db)

    # reveal_at é o HORÁRIO MÍNIMO de início da cerimônia.
    if settings.reveal_at is None:
        raise HTTPException(
            status_code=403,
            detail="Agende o horário de início da cerimônia no painel",
        )
    if datetime.now() < settings.reveal_at:
        raise HTTPException(
            status_code=403,
            detail="A cerimônia ainda não pode começar (horário mínimo não atingido)",
        )

    settings.ceremony_phase = "abertura"
    settings.ceremony_category_id = None
    settings.ceremony_revealed = "[]"
    db.commit()
    db.refresh(settings)

    crud.record_audit(db, "admin", "cerimonia_comando", settings.ceremony_phase)

    posicao = crud.get_ceremony_position(db)
    await events.hub.broadcast("ceremony.step", posicao)
    return posicao


@router.post("/admin/ceremony/next")
async def ceremony_next(
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    settings = crud.get_settings(db)
    fase = settings.ceremony_phase

    # Nenhum comando antes de /start: cerimônia não iniciada.
    if fase is None:
        raise HTTPException(status_code=403, detail="A cerimônia não foi iniciada")

    posicao = crud.get_ceremony_position(db)
    reveladas = posicao["revealed"]

    if fase == "abertura":
        # Categoria de menor reveal_order ainda não revelada.
        pendentes = [
            cat for cat in crud.get_categories(db) if cat.id not in reveladas
        ]
        if pendentes:
            settings.ceremony_phase = "categoria"
            settings.ceremony_category_id = pendentes[0].id
        else:
            # Não há mais nada a chamar: encerra a cerimônia.
            settings.ceremony_phase = "encerramento"
            settings.ceremony_category_id = None

    elif fase == "categoria":
        # A categoria já foi chamada; re-difunde a posição (idempotente).
        pass

    elif fase == "revelacao":
        # Fecha a categoria em pauta como revelada.
        categoria_atual = settings.ceremony_category_id
        if categoria_atual is not None and categoria_atual not in reveladas:
            reveladas.append(categoria_atual)
        settings.ceremony_revealed = json.dumps(reveladas)

        restantes = [
            cat for cat in crud.get_categories(db) if cat.id not in reveladas
        ]
        settings.ceremony_phase = "abertura" if restantes else "encerramento"
        settings.ceremony_category_id = None

    elif fase == "encerramento":
        raise HTTPException(status_code=403, detail="A cerimônia já foi encerrada")
    else:
        # Valor inesperado no banco: trata como estado inválido.
        raise HTTPException(status_code=403, detail="Estado da cerimônia inválido")

    db.commit()
    db.refresh(settings)

    crud.record_audit(db, "admin", "cerimonia_comando", settings.ceremony_phase)

    posicao = crud.get_ceremony_position(db)
    await events.hub.broadcast("ceremony.step", posicao)
    return posicao


@router.post("/admin/ceremony/prev")
async def ceremony_prev(
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    """Volta UM passo na cerimônia (mestre de cerimônias erra o timing):
      - em 'categoria'/'revelacao': reabre a categoria ANTERIOR (por reveal_order);
      - em 'abertura'/'encerramento': reabre a ÚLTIMA categoria fechada
        (tira o id dela do conjunto de fechadas — pode ser re-revelada).
    Votos/apuração não mudam: é só posição de palco."""
    settings = crud.get_settings(db)
    fase = settings.ceremony_phase

    if fase is None:
        raise HTTPException(status_code=403, detail="A cerimônia não foi iniciada")

    posicao = crud.get_ceremony_position(db)
    fechadas = posicao["revealed"]

    if fase in ("categoria", "revelacao"):
        categoria_atual = settings.ceremony_category_id
        atual = (
            db.query(models.Category)
            .filter(models.Category.id == categoria_atual)
            .first()
        )
        if atual is None:
            raise HTTPException(status_code=403, detail="Categoria em palco inexistente")
        anterior = (
            db.query(models.Category)
            .filter(
                models.Category.reveal_order < atual.reveal_order,
                models.Category.id != atual.id,
            )
            .order_by(models.Category.reveal_order.desc())
            .first()
        )
        if anterior is None:
            raise HTTPException(status_code=403, detail="Já está na primeira categoria")
        settings.ceremony_phase = "categoria"
        settings.ceremony_category_id = anterior.id

    elif fase in ("abertura", "encerramento"):
        # Reabre a última categoria fechada (remove o id do conjunto fechado).
        if not fechadas:
            raise HTTPException(status_code=403, detail="Não há categoria para voltar")
        ultima_id = fechadas.pop()
        settings.ceremony_revealed = json.dumps(fechadas)
        settings.ceremony_phase = "categoria"
        settings.ceremony_category_id = ultima_id

    else:
        raise HTTPException(status_code=403, detail="Estado da cerimônia inválido")

    db.commit()
    db.refresh(settings)

    crud.record_audit(db, "admin", "cerimonia_comando", settings.ceremony_phase)

    posicao = crud.get_ceremony_position(db)
    await events.hub.broadcast("ceremony.step", posicao)
    return posicao


@router.post("/admin/ceremony/reset")
async def ceremony_reset(
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    """Reinicia a cerimônia: fase volta a "não iniciada", categoria em pauta
    e conjunto de fechadas zerados. Os VOTOS NÃO são apagados — é só o palco
    que volta ao estado de antes do start (permite o ensaio geral de novo).
    Mudar o reveal_at NÃO reinicia nada por desenho: horário e fase de palco
    são estados independentes."""
    settings = crud.get_settings(db)
    settings.ceremony_phase = None
    settings.ceremony_category_id = None
    settings.ceremony_revealed = "[]"
    db.commit()
    db.refresh(settings)

    crud.record_audit(db, "admin", "cerimonia_reset", "palco reiniciado")

    posicao = crud.get_ceremony_position(db)
    await events.hub.broadcast("ceremony.step", posicao)
    return posicao


@router.post("/admin/ceremony/reveal")
async def ceremony_reveal_all(
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    """Revela a categoria em pauta INTEIRA (pódio 1º/2º/3º de uma vez).

    Simplificação decidida pelo dono: o card visual mostra o pódio completo
    num único reveal — os botões 3º/2º/1º (reveal/{order}) revelavam tudo
    ao mesmo tempo e eram controle de palco sem efeito visual. O comando
    antigo continua disponível por compatibilidade; o console usa ESTE."""
    settings = crud.get_settings(db)

    if (
        settings.ceremony_phase != "categoria"
        or settings.ceremony_category_id is None
    ):
        raise HTTPException(
            status_code=403,
            detail="Chame uma categoria antes de revelar",
        )

    settings.ceremony_phase = "revelacao"
    db.commit()
    db.refresh(settings)

    crud.record_audit(
        db,
        "admin",
        "cerimonia_comando",
        f"{settings.ceremony_phase} (categoria {settings.ceremony_category_id})",
    )

    posicao = crud.get_ceremony_position(db)
    payload = {**posicao, "full_reveal": True}
    await events.hub.broadcast("ceremony.step", payload)
    return payload


@router.post("/admin/ceremony/reveal/{order}")
async def ceremony_reveal(
    order: int = Path(..., ge=1, le=3),
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    settings = crud.get_settings(db)

    # O reveal só faz sentido com uma categoria em pauta.
    if (
        settings.ceremony_phase not in ("categoria", "revelacao")
        or settings.ceremony_category_id is None
    ):
        raise HTTPException(
            status_code=403,
            detail="Não há categoria em pauta para revelar",
        )

    # Extensão documentada do fluxo: a PRIMEIRA revelação (3º, 2º ou 1º) tira a
    # cerimônia de "categoria" e entra em "revelacao"; as seguintes já são
    # aceitas nessa fase para completar a sequência 3º→2º→1º.
    if settings.ceremony_phase == "categoria":
        settings.ceremony_phase = "revelacao"
        db.commit()
        db.refresh(settings)

    posicao = crud.get_ceremony_position(db)
    # Campo extra do comando: o frontend anima o pódio na ordem revelada.
    posicao["revealed_order"] = order

    crud.record_audit(
        db,
        "admin",
        "cerimonia_comando",
        f"reveal ordem {order} ({settings.ceremony_phase})",
    )

    await events.hub.broadcast("ceremony.step", posicao)
    return posicao


# ---------------------------------------------------------------------------
# CRUD de categorias e indicados (admin)
# ---------------------------------------------------------------------------
def _category_payload(cat) -> dict:
    return {
        "id": cat.id,
        "title": cat.title,
        "emoji": cat.emoji,
        "modo": cat.modo,
        "reveal_order": cat.reveal_order,
        "description": cat.description,
        "criteria": cat.criteria,
        "candidacies": [
            {
                "id": cand.id,
                "user_id": cand.user_id,
                "username": cand.user.username,
                "pitch": cand.pitch,
            }
            for cand in cat.candidacies
        ],
    }


@router.post(
    "/admin/categories",
    response_model=schemas.CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_category(
    payload: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    created = crud.create_category(db, payload)

    crud.record_audit(
        db,
        "admin",
        "categoria_criada",
        f"{created.title} — {len(created.candidacies)} indicados",
    )

    await events.hub.broadcast(
        "state.change", {"total_candidatos": crud.get_total_candidatos(db)}
    )
    return _category_payload(created)


@router.put("/admin/categories/{category_id}", response_model=schemas.CategoryResponse)
async def admin_update_category(
    category_id: int,
    payload: schemas.CategoryUpdate,
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    category = (
        db.query(models.Category)
        .filter(models.Category.id == category_id)
        .first()
    )
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    updated = crud.update_category(db, category, payload)

    crud.record_audit(db, "admin", "categoria_editada", updated.title)

    await events.hub.broadcast(
        "state.change", {"total_candidatos": crud.get_total_candidatos(db)}
    )
    return _category_payload(updated)


@router.delete("/admin/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    # Guarda o título ANTES do delete: a ata precisa identificar o que saiu.
    category = (
        db.query(models.Category)
        .filter(models.Category.id == category_id)
        .first()
    )
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    titulo = category.title

    # Cascata manual (votos → candidaturas → categoria): o schema SQLite não
    # declara ON DELETE CASCADE e não queremos órfãos/violação de FK.
    deleted = crud.delete_category(db, category_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Category not found")

    crud.record_audit(db, "admin", "categoria_excluida", titulo)

    await events.hub.broadcast(
        "state.change", {"total_candidatos": crud.get_total_candidatos(db)}
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/admin/nominees",
    response_model=schemas.CandidacyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_nominee(
    payload: schemas.NomineeCreate,
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    candidacy, erro = crud.create_nominee(db, payload)

    if erro == "category_not_found":
        raise HTTPException(status_code=404, detail="Category not found")
    if erro == "duplicate":
        raise HTTPException(
            status_code=400,
            detail="Indicado já cadastrado nesta categoria",
        )

    user = crud.get_user(db, candidacy.user_id)
    category = (
        db.query(models.Category)
        .filter(models.Category.id == payload.category_id)
        .first()
    )
    crud.record_audit(
        db,
        "admin",
        "indicado_adicionado",
        f"{user.username if user else payload.username} em "
        f"{category.title if category else 'categoria'}",
    )

    await events.hub.broadcast(
        "state.change", {"total_candidatos": crud.get_total_candidatos(db)}
    )
    return {
        "id": candidacy.id,
        "user_id": candidacy.user_id,
        "username": user.username if user else "Unknown",
        "pitch": candidacy.pitch,
    }


@router.delete("/admin/nominees/{candidacy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_nominee(
    candidacy_id: int,
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    # Guarda os rótulos ANTES do delete (a candidatura some após o commit).
    candidacy = crud.get_candidacy(db, candidacy_id)
    if candidacy is None:
        raise HTTPException(status_code=404, detail="Candidacy not found")
    username = candidacy.user.username if candidacy.user else f"#{candidacy.user_id}"
    category_title = (
        candidacy.category.title
        if candidacy.category
        else f"categoria #{candidacy.category_id}"
    )

    deleted = crud.delete_nominee(db, candidacy_id)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Candidacy not found")

    crud.record_audit(
        db, "admin", "indicado_removido", f"{username} de {category_title}"
    )

    await events.hub.broadcast(
        "state.change", {"total_candidatos": crud.get_total_candidatos(db)}
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Gerenciamento de usuários (admin)
# ---------------------------------------------------------------------------
def _admin_user_payload(
    user: models.User,
    candidacies_count: int = 0,
    votes_given_count: int = 0,
    votes_received_count: int = 0,
) -> dict:
    """Serializa o usuário no formato do painel (caminho de avatar cru)."""
    return {
        "id": user.id,
        "username": user.username,
        "vulgo": user.vulgo,
        "is_guest": bool(user.is_guest),
        # Caminho RELATIVO ("uploads/xxx.png"): o painel exibe iniciais; não há
        # rota admin de arquivo de avatar (decisão de escopo, sem rota extra).
        "avatar": user.avatar,
        "created_at": user.created_at,
        "candidacies_count": int(candidacies_count),
        "votes_given_count": int(votes_given_count),
        "votes_received_count": int(votes_received_count),
    }


@router.get("/admin/users", response_model=list[schemas.AdminUserResponse])
def admin_list_users(
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    # UMA query com subqueries agregadas (sem N+1 por usuário).
    rows = crud.get_admin_users(db)
    return [
        _admin_user_payload(
            user, candidacies_count, votes_given_count, votes_received_count
        )
        for user, candidacies_count, votes_given_count, votes_received_count in rows
    ]


@router.put("/admin/users/{user_id}", response_model=schemas.AdminUserResponse)
async def admin_update_user(
    user_id: int,
    payload: schemas.AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    user = crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # `exclude_unset` distingue campo OMITIDO (não toca) de vulgo "" (limpa).
    valores = payload.model_dump(exclude_unset=True)
    username_anterior = user.username

    if "username" in valores:
        novo_username = (valores["username"] or "").strip()
        if not novo_username:
            raise HTTPException(
                status_code=400, detail="Username não pode ser vazio"
            )
        # Unicidade ignorando o PRÓPRIO usuário (reenviar o mesmo username vale).
        conflito = (
            db.query(models.User)
            .filter(
                models.User.username == novo_username,
                models.User.id != user_id,
            )
            .first()
        )
        if conflito is not None:
            raise HTTPException(
                status_code=409, detail="Já existe um usuário com esse nome"
            )
        user.username = novo_username

    if "vulgo" in valores:
        novo_vulgo = valores["vulgo"]
        if isinstance(novo_vulgo, str):
            novo_vulgo = novo_vulgo.strip()
        # String vazia (ou None explícito) limpa o apelido.
        user.vulgo = novo_vulgo or None

    db.commit()
    db.refresh(user)

    if user.username != username_anterior:
        detalhe = f"{username_anterior} → {user.username}"
    else:
        detalhe = user.username
    crud.record_audit(db, "admin", "usuario_editado", detalhe)

    candidacies_count, votes_given_count, votes_received_count = (
        crud.get_user_counters(db, user.id)
    )
    return _admin_user_payload(
        user, candidacies_count, votes_given_count, votes_received_count
    )


@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    user = crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Captura os dados ANTES do delete: a ata precisa sobreviver ao usuário.
    username = user.username
    avatar = user.avatar

    crud.delete_user_cascade(db, user)

    crud.record_audit(db, "admin", "usuario_excluido", username)

    # Apaga o arquivo de avatar do disco (mesmo padrão de DELETE /users/me/avatar).
    # Silencioso de propósito: um arquivo ausente já é o estado desejado.
    if avatar:
        caminho = os.path.join(app_settings.UPLOAD_DIR, os.path.basename(avatar))
        try:
            if os.path.isfile(caminho):
                os.remove(caminho)
        except OSError:
            pass

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/admin/audit", response_model=list[schemas.AuditLogResponse])
def admin_audit_log(
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: bool = Depends(deps.verify_admin_token),
):
    # O CRUD devolve DESC (mais recentes primeiro); a ata é exposta em ordem
    # CRONOLÓGICA para o painel exibir o histórico do mais antigo ao mais novo.
    return list(reversed(crud.get_recent_audit(db, limit=limit)))


@router.get("/audit/me", response_model=list[schemas.AuditLogResponse])
def my_audit_trail(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """Atividade do PRÓPRIO eleitor na assembleia (atos que ELE praticou).

    Alimenta a timeline do perfil (/perfil). Não expõe ações alheias: o
    filtro é pelo actor == username do token. Admin continua com a ata
    completa em /admin/audit.
    """
    return crud.get_audit_for_actor(db, current_user.username, limit=20)
