from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import get_db
from backend.models import models
from backend.schemas import schemas
from backend.crud import crud
from backend.core import security
from backend.api import deps
from pydantic import BaseModel

router = APIRouter(prefix="/api")

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
    
    existing = db.query(models.Candidacy).filter(
        models.Candidacy.category_id == candidacy.category_id,
        models.Candidacy.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a candidate in this category")
        
    created = crud.create_candidacy(db, candidacy, user_id=current_user.id)
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
def cast_vote(vote: schemas.VoteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    settings = crud.get_settings(db)
    if not settings.votacao_aberta:
        raise HTTPException(status_code=403, detail="Voting is closed")
        
    if current_user.id == vote.voted_user_id:
        raise HTTPException(status_code=403, detail="Self-voting is not allowed")
        
    crud.cast_vote(db, vote, voter_id=current_user.id)
    return {"status": "success"}

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
            "podium": podium[:3]
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
def admin_update_settings(settings_update: schemas.SettingsUpdate, db: Session = Depends(get_db), admin: bool = Depends(deps.verify_admin_token)):
    updated = crud.update_settings(db, settings_update)
    return {
        "votacao_aberta": updated.votacao_aberta,
        "reveal_at": updated.reveal_at
    }
