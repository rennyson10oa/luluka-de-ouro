from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import List, Literal, Optional

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
    # Caminho relativo salvo no servidor (ex.: "uploads/ab12….png"); None se não houver.
    avatar: Optional[str] = None
    # Registro no cartório (exibido no perfil como "Membro desde").
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    # Campos opcionais: apenas os presentes no body são aplicados.
    username: Optional[str] = Field(None, min_length=3)
    vulgo: Optional[str] = Field(None, max_length=40)

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=4)

class ProfileUpdateResponse(BaseModel):
    user: UserResponse
    # Token presente SOMENTE se o username mudou (o JWT anterior fica stale).
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
    description: Optional[str] = None
    criteria: Optional[str] = None
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


class ChatCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=280)


class ChatMessageResponse(BaseModel):
    id: int
    user_id: int
    username: str
    text: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CategoryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=80)
    # Emoji é opcional na criação (categorias sem ícone são válidas).
    emoji: str = Field("", max_length=8)
    modo: Literal["candidatos", "aberta"]
    reveal_order: int = Field(..., ge=1)
    # Texto oficial: descrição + critério auxiliar (o frontend mostra
    # fallback cenográfico quando vierem vazios). String vazia => NULL.
    description: str = Field("", max_length=500)
    criteria: str = Field("", max_length=200)


class CategoryUpdate(BaseModel):
    # Todos opcionais: apenas os campos enviados são aplicados.
    title: Optional[str] = Field(None, min_length=1, max_length=80)
    emoji: Optional[str] = Field(None, max_length=8)
    modo: Optional[Literal["candidatos", "aberta"]] = None
    reveal_order: Optional[int] = Field(None, ge=1)
    description: Optional[str] = Field(None, max_length=500)
    criteria: Optional[str] = Field(None, max_length=200)


class NomineeCreate(BaseModel):
    category_id: int
    # Label exibido do indicado; vira o username normalizado do convidado.
    username: str = Field(..., min_length=1, max_length=30)
    pitch: str = Field("", max_length=280)

class AuditLogResponse(BaseModel):
    id: int
    actor: str
    action: str
    detail: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AdminUserResponse(BaseModel):
    """Item da listagem administrativa de usuários.

    `avatar` expõe o caminho RELATIVO salvo no banco (ex.: "uploads/ab12.png"),
    nunca o caminho de disco: o admin só precisa saber se há avatar; o arquivo
    em si não tem rota pública/de admin (decisão de escopo deste painel).
    """

    id: int
    username: str
    vulgo: Optional[str] = None
    is_guest: bool
    avatar: Optional[str] = None
    created_at: Optional[datetime] = None
    candidacies_count: int
    votes_given_count: int
    votes_received_count: int


class AdminUserUpdate(BaseModel):
    """Edição administrativa: apenas os campos ENVIADOS são aplicados.

    `exclude_unset` no endpoint distingue OMISSÃO (não toca) de NULL/"" (limpa).
    `vulgo` aceita string vazia de propósito: é como o painel limpa o apelido.
    """

    username: Optional[str] = Field(None, max_length=30)
    vulgo: Optional[str] = Field(None, max_length=40)


class PodiumItem(BaseModel):
    user_id: int
    username: str
    votes: int
    pitch: str

class CategoryResultResponse(BaseModel):
    category_id: int
    title: str
    podium: List[PodiumItem]
