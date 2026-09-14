from sqlalchemy.orm import Session
from sqlalchemy import func
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
        db_vote = existing_vote
    else:
        db_vote = models.Vote(
            voter_id=voter_id,
            category_id=vote.category_id,
            voted_user_id=vote.voted_user_id
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

def update_settings(db: Session, settings_update: schemas.SettingsUpdate):
    settings = get_settings(db)
    if settings_update.votacao_aberta is not None:
        settings.votacao_aberta = settings_update.votacao_aberta
    if settings_update.reveal_at is not None:
        settings.reveal_at = settings_update.reveal_at
    db.commit()
    db.refresh(settings)
    return settings

def get_total_votes(db: Session):
    return db.query(models.Vote).count()

def get_total_users(db: Session):
    return db.query(models.User).count()

def get_total_candidatos(db: Session):
    return db.query(models.Candidacy).count()

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
