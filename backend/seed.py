import os
from backend.database import SessionLocal, engine, Base
from backend.models import models
from backend.core.security import get_password_hash
from datetime import datetime, timedelta

def seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Create Settings
    settings = db.query(models.Settings).first()
    if not settings:
        settings = models.Settings(votacao_aberta=True, reveal_at=datetime.now() + timedelta(hours=1))
        db.add(settings)
        db.commit()

    # Create Categories
    categories_data = [
        {"title": "Melhor participação especial", "emoji": "🎬", "reveal_order": 1, "modo": "aberta"},
        {"title": "Membro com mais pataquadas do ano", "emoji": "💸", "reveal_order": 2, "modo": "candidatos"},
        {"title": "Membro com mais mitadas", "emoji": "⚡", "reveal_order": 3, "modo": "aberta"},
        {"title": "Membro com QI de temperatura ambiente", "emoji": "🧊", "reveal_order": 4, "modo": "candidatos"},
    ]

    for cat in categories_data:
        if not db.query(models.Category).filter_by(title=cat["title"]).first():
            db.add(models.Category(**cat))
    db.commit()

    # Create Users (con vulgo de exibição na gala)
    users_data = [
        ("joao", "@ReiDoZap"),
        ("maria", "@DonaDaAta"),
        ("carlos", "@FiscalDeChurras"),
        ("ana", "@MestreDoSticker"),
        ("pedro", "@CavaleiroDaZoeira"),
        ("julia", "@VovoDoGrupo"),
    ]
    user_ids = []
    for uname, vulgo in users_data:
        user = db.query(models.User).filter_by(username=uname).first()
        if not user:
            user = models.User(username=uname, password_hash=get_password_hash("123"), vulgo=vulgo)
            db.add(user)
            db.commit()
            db.refresh(user)
        elif not user.vulgo:
            # Usuário já existente sem vulgo → atualiza (idempotente, não recria).
            user.vulgo = vulgo
            db.commit()
        user_ids.append(user.id)
    
    # Create Candidacies
    categories = db.query(models.Category).all()
    if categories and user_ids:
        # Some candidacies
        c1 = models.Candidacy(category_id=categories[0].id, user_id=user_ids[0], pitch="Apareci no meio do nada!")
        c2 = models.Candidacy(category_id=categories[1].id, user_id=user_ids[1], pitch="Gastei dinheiro com besteira!")
        c3 = models.Candidacy(category_id=categories[3].id, user_id=user_ids[2], pitch="Eu não sei nem onde estou.")
        c4 = models.Candidacy(category_id=categories[1].id, user_id=user_ids[3], pitch="Bati o carro no portão de casa.")
        c5 = models.Candidacy(category_id=categories[3].id, user_id=user_ids[4], pitch="Eu sou uma porta.")
        c6 = models.Candidacy(category_id=categories[0].id, user_id=user_ids[5], pitch="Voltei só pra essa zoeira.")
        
        for c in [c1, c2, c3, c4, c5, c6]:
            if not db.query(models.Candidacy).filter_by(category_id=c.category_id, user_id=c.user_id).first():
                db.add(c)
        db.commit()

        # Distribute votes
        votes = [
            (user_ids[0], categories[1].id, user_ids[1]),
            (user_ids[2], categories[1].id, user_ids[1]),
            (user_ids[3], categories[1].id, user_ids[1]),
            (user_ids[4], categories[1].id, user_ids[3]),
            (user_ids[1], categories[0].id, user_ids[5]),
            (user_ids[2], categories[0].id, user_ids[5]),
            (user_ids[4], categories[0].id, user_ids[0]),
            (user_ids[0], categories[3].id, user_ids[2]),
            (user_ids[1], categories[3].id, user_ids[2]),
            (user_ids[5], categories[3].id, user_ids[2]),
            (user_ids[3], categories[3].id, user_ids[4]),
            (user_ids[2], categories[3].id, user_ids[4]),
        ]
        
        for v in votes:
            if not db.query(models.Vote).filter_by(voter_id=v[0], category_id=v[1]).first():
                db.add(models.Vote(voter_id=v[0], category_id=v[1], voted_user_id=v[2]))
        db.commit()
    
    print("Seed completo!")
    db.close()

if __name__ == "__main__":
    seed_db()
