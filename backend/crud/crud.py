import json
import secrets
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from backend.models import models
from backend.schemas import schemas
from backend.core.security import get_password_hash

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(username=user.username, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_profile(db: Session, user, username=None, vulgo=None):
    # Aplica apenas os campos não-None.
    if username is not None and username != user.username:
        # Checa unicidade ANTES: username já em uso por outro id → None.
        existing = db.query(models.User).filter(models.User.username == username).first()
        if existing and existing.id != user.id:
            return None
        user.username = username
    if vulgo is not None:
        user.vulgo = vulgo
    db.commit()
    db.refresh(user)
    return user

def update_user_password(db: Session, user, new_password: str):
    user.password_hash = get_password_hash(new_password)
    db.commit()
    db.refresh(user)
    return user

def get_categories(db: Session):
    return db.query(models.Category).order_by(models.Category.reveal_order).all()

def create_candidacy(db: Session, candidacy: schemas.CandidacyCreate, user_id: int):
    db_candidacy = models.Candidacy(
        category_id=candidacy.category_id,
        user_id=user_id,
        pitch=candidacy.pitch
    )
    db.add(db_candidacy)
    db.commit()
    db.refresh(db_candidacy)
    return db_candidacy

def update_candidacy(db: Session, candidacy_id: int, pitch: str):
    db_candidacy = db.query(models.Candidacy).filter(models.Candidacy.id == candidacy_id).first()
    if db_candidacy:
        db_candidacy.pitch = pitch
        db.commit()
        db.refresh(db_candidacy)
    return db_candidacy

def get_candidacy(db: Session, candidacy_id: int):
    return db.query(models.Candidacy).filter(models.Candidacy.id == candidacy_id).first()

def cast_vote(db: Session, vote: schemas.VoteCreate, voter_id: int):
    existing_vote = db.query(models.Vote).filter(
        models.Vote.voter_id == voter_id,
        models.Vote.category_id == vote.category_id
    ).first()

    if existing_vote:
        existing_vote.voted_user_id = vote.voted_user_id
        existing_vote.created_at = datetime.now()  # re-selo: atualiza o horário no upsert
        db_vote = existing_vote
    else:
        db_vote = models.Vote(
            voter_id=voter_id,
            category_id=vote.category_id,
            voted_user_id=vote.voted_user_id,
            created_at=datetime.now(),
        )
        db.add(db_vote)
    
    db.commit()
    return db_vote

def get_settings(db: Session):
    settings = db.query(models.Settings).first()
    if not settings:
        settings = models.Settings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def get_votes_for_voter(db: Session, voter_id: int):
    """Votos JÁ DADOS por um eleitor (o próprio) — sigilo preservado:
    a rota expõe apenas as cédulas de quem está autenticado."""
    return (
        db.query(models.Vote)
        .filter(models.Vote.voter_id == voter_id)
        .order_by(models.Vote.category_id)
        .all()
    )

def update_settings(db: Session, settings_update: schemas.SettingsUpdate):
    settings = get_settings(db)
    # "exclude_unset" distingue OMISSÃO (não toca) de NULL EXPLÍCITO (limpa).
    valores = settings_update.model_dump(exclude_unset=True)
    if "votacao_aberta" in valores:
        settings.votacao_aberta = valores["votacao_aberta"]
    if "reveal_at" in valores:
        # None explícito LIMPA o agendamento (sem valor → apaga o horário).
        settings.reveal_at = valores["reveal_at"]
    db.commit()
    db.refresh(settings)
    return settings

def get_total_votes(db: Session):
    return db.query(models.Vote).count()

def get_total_users(db: Session):
    return db.query(models.User).count()

def get_total_candidatos(db: Session):
    return db.query(models.Candidacy).count()

# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------
def create_chat_message(db: Session, user_id: int, username: str, text: str):
    db_message = models.ChatMessage(
        user_id=user_id,
        username=username,
        text=text,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def get_recent_chat(db: Session, limit: int = 50):
    """Últimas N mensagens em ordem DECRESCENTE (o endpoint inverte)."""
    return (
        db.query(models.ChatMessage)
        # created_at tem precisão de segundo no SQLite: o id desempata de
        # forma determinística mensagens enviadas no mesmo instante.
        .order_by(models.ChatMessage.created_at.desc(), models.ChatMessage.id.desc())
        .limit(limit)
        .all()
    )


# ---------------------------------------------------------------------------
# Estado da cerimônia (persistido em Settings)
# ---------------------------------------------------------------------------
def get_ceremony_position(db: Session) -> dict:
    """Posição determinística da cerimônia (fonte da verdade para reconexão)."""
    settings = get_settings(db)

    reveladas: list[int] = []
    if settings.ceremony_revealed:
        try:
            parsed = json.loads(settings.ceremony_revealed)
            if isinstance(parsed, list):
                reveladas = [int(item) for item in parsed]
        except (ValueError, TypeError):
            # JSON corrompido não derruba a cerimônia: assume lista vazia.
            reveladas = []

    return {
        "phase": settings.ceremony_phase,
        "category_id": settings.ceremony_category_id,
        "revealed": reveladas,
        # ISO string de propósito: o mesmo payload vai para o SSE via json.dumps.
        "reveal_at": settings.reveal_at.isoformat() if settings.reveal_at else None,
        "votacao_aberta": settings.votacao_aberta,
    }


# ---------------------------------------------------------------------------
# CRUD de categorias (admin)
# ---------------------------------------------------------------------------
def create_category(db: Session, data: schemas.CategoryCreate):
    db_category = models.Category(
        title=data.title,
        emoji=data.emoji,
        modo=data.modo,
        reveal_order=data.reveal_order,
        # String vazia vira NULL: o frontend distingue "sem texto" (mostra
        # fallback cenográfico) de texto preenchido.
        description=data.description or None,
        criteria=data.criteria or None,
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def update_category(db: Session, db_category, data: schemas.CategoryUpdate):
    valores = data.model_dump(exclude_unset=True)
    for campo in ("title", "emoji", "modo", "reveal_order", "description", "criteria"):
        if campo in valores:
            # Texto vazio limpa o campo (=> None) em vez de gravar "".
            setattr(db_category, campo, valores[campo] or None)
    db.commit()
    db.refresh(db_category)
    return db_category


def _delete_orphan_guests(db: Session, user_ids: list[int]) -> None:
    """Remove convidados que ficaram sem candidatura e sem votos.

    Só toca em usuários marcados is_guest: contas reais NUNCA são apagadas por
    efeito colateral de uma remoção feita pelo admin.
    """
    removidos = False
    for user_id in set(user_ids):
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user is None or not user.is_guest:
            continue

        tem_candidatura = (
            db.query(models.Candidacy)
            .filter(models.Candidacy.user_id == user_id)
            .count()
        )
        votos_dados = (
            db.query(models.Vote).filter(models.Vote.voter_id == user_id).count()
        )
        votos_recebidos = (
            db.query(models.Vote).filter(models.Vote.voted_user_id == user_id).count()
        )
        if tem_candidatura == 0 and votos_dados == 0 and votos_recebidos == 0:
            db.delete(user)
            removidos = True

    if removidos:
        db.commit()


def delete_category(db: Session, category_id: int) -> bool:
    """Apaga categoria em cascata manual (votos + candidaturas + categoria).

    Por que manual: o schema atual do SQLite não declara ON DELETE CASCADE e
    a checagem de FK pode estar desligada; apagar na ordem correta evita
    órfãos agora e violação de FK em bancos que a aplicam.
    """
    db_category = (
        db.query(models.Category).filter(models.Category.id == category_id).first()
    )
    if db_category is None:
        return False

    # Guarda os usuários envolvidos para limpar convidados órfãos depois.
    user_ids = [
        row.user_id
        for row in db.query(models.Candidacy)
        .filter(models.Candidacy.category_id == category_id)
        .all()
    ]

    db.query(models.Vote).filter(models.Vote.category_id == category_id).delete(
        synchronize_session=False
    )
    db.query(models.Candidacy).filter(
        models.Candidacy.category_id == category_id
    ).delete(synchronize_session=False)
    db.delete(db_category)
    db.commit()

    _delete_orphan_guests(db, user_ids)
    return True


# ---------------------------------------------------------------------------
# Indicados (convidados sem conta)
# ---------------------------------------------------------------------------
def normalize_guest_username(label: str) -> str:
    """Normaliza o label: trim + colapso de espaços internos (preserva caixa)."""
    return " ".join(label.strip().split())


def get_or_create_guest_user(db: Session, label: str):
    """Reaproveita usuário existente ou cria um convidado com senha aleatória.

    A senha é gerada com secrets.token_urlsafe e NUNCA é retornada; o convidado
    existe apenas para manter íntegras as FKs de Candidacy/Vote e o pódio.
    """
    username = normalize_guest_username(label)
    user = get_user_by_username(db, username)
    if user is not None:
        return user, False

    db_user = models.User(
        username=username,
        # Hash de uma senha aleatória descartada: ninguém consegue logar como
        # convidado pelo fluxo normal de login.
        password_hash=get_password_hash(secrets.token_urlsafe(16)),
        vulgo=username,
        is_guest=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user, True


def create_nominee(db: Session, data: schemas.NomineeCreate):
    """Cria candidatura de indicado. Retorna (candidacy, erro).

    erro: None | "category_not_found" | "duplicate"
    """
    category = (
        db.query(models.Category)
        .filter(models.Category.id == data.category_id)
        .first()
    )
    if category is None:
        return None, "category_not_found"

    user, _criado = get_or_create_guest_user(db, data.username)

    existing = (
        db.query(models.Candidacy)
        .filter(
            models.Candidacy.category_id == data.category_id,
            models.Candidacy.user_id == user.id,
        )
        .first()
    )
    if existing is not None:
        return existing, "duplicate"

    db_candidacy = models.Candidacy(
        category_id=data.category_id,
        user_id=user.id,
        pitch=data.pitch,
    )
    db.add(db_candidacy)
    db.commit()
    db.refresh(db_candidacy)
    return db_candidacy, None


def delete_nominee(db: Session, candidacy_id: int):
    """Apaga candidatura + votos recebidos naquela categoria; limpa convidado."""
    db_candidacy = get_candidacy(db, candidacy_id)
    if db_candidacy is None:
        return None

    user_id = db_candidacy.user_id
    category_id = db_candidacy.category_id

    # Votos QUE ELE RECEBEU naquela categoria (a cédula de quem votou em outra
    # pessoa não é afetada). Sem isso o pódio ficaria apontando para um
    # candidato inexistente.
    db.query(models.Vote).filter(
        models.Vote.category_id == category_id,
        models.Vote.voted_user_id == user_id,
    ).delete(synchronize_session=False)

    db.delete(db_candidacy)
    db.commit()

    # Convidado sem nenhuma candidatura/voto restante → apaga o usuário fake.
    _delete_orphan_guests(db, [user_id])
    return db_candidacy


# ---------------------------------------------------------------------------
# Gerenciamento de usuários (admin)
# ---------------------------------------------------------------------------
def get_admin_users(db: Session):
    """Lista usuários + os três contadores em UMA query (sem N+1).

    Cada contador é uma subquery agregada por usuário; o outerjoin garante que
    quem tem zero votos/candidaturas também apareça (coalesce em 0). O join com
    duas FKs para `users` (voter_id e voted_user_id) é feito em subqueries
    SEPARADAS justamente para não duplicar linhas do usuário.
    """
    candidacies_count = (
        db.query(
            models.Candidacy.user_id.label("user_id"),
            func.count(models.Candidacy.id).label("total"),
        )
        .group_by(models.Candidacy.user_id)
        .subquery()
    )
    votes_given_count = (
        db.query(
            models.Vote.voter_id.label("user_id"),
            func.count(models.Vote.id).label("total"),
        )
        .group_by(models.Vote.voter_id)
        .subquery()
    )
    votes_received_count = (
        db.query(
            models.Vote.voted_user_id.label("user_id"),
            func.count(models.Vote.id).label("total"),
        )
        .group_by(models.Vote.voted_user_id)
        .subquery()
    )

    return (
        db.query(
            models.User,
            func.coalesce(candidacies_count.c.total, 0).label("candidacies_count"),
            func.coalesce(votes_given_count.c.total, 0).label("votes_given_count"),
            func.coalesce(votes_received_count.c.total, 0).label(
                "votes_received_count"
            ),
        )
        .outerjoin(candidacies_count, candidacies_count.c.user_id == models.User.id)
        .outerjoin(votes_given_count, votes_given_count.c.user_id == models.User.id)
        .outerjoin(
            votes_received_count, votes_received_count.c.user_id == models.User.id
        )
        # Usuários antigos primeiro; o id desempata created_at no mesmo segundo.
        .order_by(models.User.created_at.asc(), models.User.id.asc())
        .all()
    )


def get_user_counters(db: Session, user_id: int) -> tuple[int, int, int]:
    """Contadores de UM usuário (usado na resposta do PUT, sem varrer a lista)."""
    candidacies = (
        db.query(func.count(models.Candidacy.id))
        .filter(models.Candidacy.user_id == user_id)
        .scalar()
        or 0
    )
    votes_given = (
        db.query(func.count(models.Vote.id))
        .filter(models.Vote.voter_id == user_id)
        .scalar()
        or 0
    )
    votes_received = (
        db.query(func.count(models.Vote.id))
        .filter(models.Vote.voted_user_id == user_id)
        .scalar()
        or 0
    )
    return int(candidacies), int(votes_given), int(votes_received)


def delete_user_cascade(db: Session, user) -> None:
    """Apaga o usuário e TUDO que aponta para ele, em cascata manual.

    Por que manual: o schema SQLite não declara ON DELETE CASCADE (e a
    checagem de FK pode estar desligada). Bulk deletes explícitos evitam
    órfãos agora e violação de FK em bancos que a aplicam.

    `expunge` antes do delete do User impede o ORM de tentar "desvincular"
    relacionamentos carregados (ex.: UPDATE candidacies SET user_id = NULL),
    o que violaria o NOT NULL das FKs.
    """
    user_id = user.id

    # Votos DADOS e RECEBIDOS pelo usuário saem juntos: em ambos os casos o
    # voto deixa de ter um dos lados válido.
    db.query(models.Vote).filter(
        or_(
            models.Vote.voter_id == user_id,
            models.Vote.voted_user_id == user_id,
        )
    ).delete(synchronize_session=False)

    # Candidaturas do usuário (o pódio não pode apontar para quem não existe).
    db.query(models.Candidacy).filter(
        models.Candidacy.user_id == user_id
    ).delete(synchronize_session=False)

    db.expunge(user)
    db.query(models.User).filter(models.User.id == user_id).delete(
        synchronize_session=False
    )
    db.commit()


# ---------------------------------------------------------------------------
# Ata notarial (audit log administrativo)
# ---------------------------------------------------------------------------
def record_audit(db: Session, actor: str, action: str, detail: str = ""):
    """Registra UMA ação administrativa e persiste imediatamente.

    Sync de propósito: as rotas são async, mas o SQLAlchemy aqui é síncrono e
    chamadas curtas não justificam threadpool. O commit é próprio para a ata
    não se perder caso o chamador decida não commitar o resto.
    """
    entry = models.AuditLog(
        actor=(actor or "admin"),
        action=action,
        detail=(detail or ""),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_recent_audit(db: Session, limit: int = 30):
    """Últimas N entradas em ordem DECRESCENTE (o endpoint inverte)."""
    return (
        db.query(models.AuditLog)
        # created_at tem precisão de segundo no SQLite: o id desempata.
        .order_by(models.AuditLog.created_at.desc(), models.AuditLog.id.desc())
        .limit(limit)
        .all()
    )


def get_audit_for_actor(db: Session, actor: str, limit: int = 20):
    """Atos de UM autor (o perfil do eleitor consome os dele próprio).

    Ordem DECRESCENTE (mais recente primeiro — a timeline do perfil já
    nasce pronta para exibir de cima para baixo).
    """
    return (
        db.query(models.AuditLog)
        .filter(models.AuditLog.actor == actor)
        .order_by(models.AuditLog.created_at.desc(), models.AuditLog.id.desc())
        .limit(limit)
        .all()
    )


def get_podium_for_category(db: Session, category_id: int):
    results = db.query(
        models.Vote.voted_user_id,
        func.count(models.Vote.id).label("votes_count")
    ).filter(models.Vote.category_id == category_id)\
     .group_by(models.Vote.voted_user_id)\
     .order_by(func.count(models.Vote.id).desc())\
     .all()

    podium = []
    for r in results:
        user = db.query(models.User).filter(models.User.id == r.voted_user_id).first()
        candidacy = db.query(models.Candidacy).filter(
            models.Candidacy.category_id == category_id,
            models.Candidacy.user_id == r.voted_user_id
        ).first()
        
        pitch = candidacy.pitch if candidacy else ""
        
        podium.append({
            "user_id": r.voted_user_id,
            "username": user.username if user else "Unknown",
            "votes": r.votes_count,
            "pitch": pitch
        })
    
    return podium
