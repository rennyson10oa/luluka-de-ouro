from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    vulgo = Column(String, nullable=True) # nome de exibição na gala
    # Caminho RELATIVO do avatar em disco (ex.: "uploads/ab12….png").
    # O arquivo em si vive em UPLOAD_DIR (volume no deploy); nada de BLOB no banco.
    avatar = Column(String, nullable=True)
    # Convidado criado automaticamente pelo admin (indicado sem conta).
    # A senha é aleatória e nunca exposta; a flag permite limpar o usuário
    # quando a candidatura dele é removida, sem tocar em contas reais.
    is_guest = Column(Boolean, nullable=False, default=False, server_default="0")
    created_at = Column(DateTime, server_default=func.now())

    candidacies = relationship("Candidacy", back_populates="user")
    votes_given = relationship("Vote", foreign_keys="[Vote.voter_id]", back_populates="voter")
    votes_received = relationship("Vote", foreign_keys="[Vote.voted_user_id]", back_populates="voted_user")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    emoji = Column(String, nullable=False)
    reveal_order = Column(Integer, nullable=False)
    modo = Column(String, nullable=False) # "candidatos" | "aberta"
    # Texto oficial da categoria (landing/substitui a copy cenográfica mock).
    # Nullable: categorias antigas podem nascer sem texto — o frontend cai
    # na copy cenográfica default quando vier vazio.
    description = Column(String, nullable=True)
    # Textinho auxiliar de critério exibido no rodapé do card da landing
    # (ex.: "Critério: destruição retórica").
    criteria = Column(String, nullable=True)

    candidacies = relationship("Candidacy", back_populates="category")
    votes = relationship("Vote", back_populates="category")

class Candidacy(Base):
    __tablename__ = "candidacies"
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pitch = Column(String(280), nullable=False)

    category = relationship("Category", back_populates="candidacies")
    user = relationship("User", back_populates="candidacies")

    __table_args__ = (
        UniqueConstraint("category_id", "user_id", name="_category_user_uc"),
    )

class CandidacySuggestion(Base):
    """Sugestão de candidatura: alguém lembra de uma situação de OUTRA pessoa.

    Mecânica: o AUTOR descreve um pitch para um ALVO; o alvo decide na caixa de
    entrada (aceita ou rejeita). Aceitar NÃO cria uma segunda candidatura do
    alvo na mesma categoria: se ele já concorre ali, o pitch da candidatura
    existente é substituído (id preservado); se não concorre, uma candidatura
    é criada. Isso mantém a regra dura de UniqueConstraint(category_id,
    user_id) em Candidacy — nunca duas candidaturas do mesmo usuário na mesma
    categoria. O histórico fica nesta tabela separada, sem inflar a urna.

    Tabela NOVA: o create_all do main.py já a cria em bancos existentes (sem
    ALTER TABLE). Relacionamentos com User têm foreign_keys explícitas porque
    existem DUAS FKs para users (autor e alvo).
    """

    __tablename__ = "candidacy_suggestions"
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pitch = Column(String(280), nullable=False)
    # "pending" | "accepted" | "rejected" — o default também vale para inserts
    # feitos fora do ORM (ex.: SQL manual em manutenção).
    status = Column(String, nullable=False, default="pending", server_default="pending")
    created_at = Column(DateTime, server_default=func.now())
    # Preenchido SOMENTE quando o alvo decide; pending mantém NULL.
    decided_at = Column(DateTime, nullable=True)

    category = relationship("Category")
    target_user = relationship("User", foreign_keys=[target_user_id])
    author_user = relationship("User", foreign_keys=[author_user_id])


class Vote(Base):
    __tablename__ = "votes"
    id = Column(Integer, primary_key=True, index=True)
    voter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    voted_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Timestamp do voto (permite rehidratar o "Horário do Registro" da cédula).
    # Nullable: votos anteriores à migração não têm timestamp.
    created_at = Column(DateTime, nullable=True)

    voter = relationship("User", foreign_keys=[voter_id], back_populates="votes_given")
    category = relationship("Category", back_populates="votes")
    voted_user = relationship("User", foreign_keys=[voted_user_id], back_populates="votes_received")

    __table_args__ = (
        UniqueConstraint("voter_id", "category_id", name="_voter_category_uc"),
        CheckConstraint("voter_id != voted_user_id", name="_no_self_vote_cc"),
    )

class Settings(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    votacao_aberta = Column(Boolean, nullable=False, default=True)
    reveal_at = Column(DateTime, nullable=True)
    # Estado da cerimônia dirigida (persistido, fonte da verdade para reconexão).
    # Fases possíveis: None (não iniciada) | "abertura" | "categoria" |
    # "revelacao" | "encerramento".
    ceremony_phase = Column(String, nullable=True)
    # Categoria em pauta (id de categories) enquanto phase == "categoria"/"revelacao".
    ceremony_category_id = Column(Integer, nullable=True)
    # JSON string com os ids das categorias já reveladas (ex.: "[1,2]").
    ceremony_revealed = Column(String, nullable=True)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Username denormalizado: o histórico preserva o nome usado no momento do
    # envio (o usuário pode trocar de username depois).
    username = Column(String, nullable=False)
    text = Column(String(280), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class AuditLog(Base):
    """Ata notarial das ações administrativas (quem fez, o quê e quando).

    Tabela NOVA: o create_all do main.py já a cria em bancos existentes, sem
    precisar de ALTER TABLE. `actor` guarda o username do admin autenticado e
    `action` é uma chave curta (ex.: "categoria_criada") traduzida no frontend.
    """

    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    detail = Column(String, nullable=False, default="")
    created_at = Column(DateTime, server_default=func.now())
