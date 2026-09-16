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

class Vote(Base):
    __tablename__ = "votes"
    id = Column(Integer, primary_key=True, index=True)
    voter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    voted_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

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
