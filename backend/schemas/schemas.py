from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import List, Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    # Espelha a validação do frontend (mín. 3 chars) — defesa em profundidade
    # para quem burlar o formulário e chamar a API direto.
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=1)

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    vulgo: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    # Campos opcionales: solo se aplican los que vienen en el body.
    username: Optional[str] = Field(None, min_length=3)
    vulgo: Optional[str] = Field(None, max_length=40)

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=4)

class ProfileUpdateResponse(BaseModel):
    user: UserResponse
    # Token presente SOLO si el username cambió (el JWT anterior queda stale).
    access_token: Optional[str] = None

class StateResponse(BaseModel):
    votacao_aberta: bool
    reveal_at: Optional[datetime]
    total_votos: int
    total_users: int
    total_candidatos: int

class CandidacyBase(BaseModel):
    pitch: str = Field(..., max_length=280)

class CandidacyCreate(CandidacyBase):
    category_id: int

class CandidacyUpdate(CandidacyBase):
    pass

class CandidacyResponse(CandidacyBase):
    id: int
    user_id: int
    username: str
    model_config = ConfigDict(from_attributes=True)

class CategoryResponse(BaseModel):
    id: int
    title: str
    emoji: str
    modo: str
    reveal_order: int
    candidacies: List[CandidacyResponse] = []
    model_config = ConfigDict(from_attributes=True)

class VoteCreate(BaseModel):
    category_id: int
    voted_user_id: int

class SettingsUpdate(BaseModel):
    votacao_aberta: Optional[bool] = None
    reveal_at: Optional[datetime] = None

class AdminCandidacyCreate(BaseModel):
    category_id: int
    username: str
    pitch: str = Field(..., max_length=280)

class PodiumItem(BaseModel):
    user_id: int
    username: str
    votes: int
    pitch: str

class CategoryResultResponse(BaseModel):
    category_id: int
    title: str
    podium: List[PodiumItem]
