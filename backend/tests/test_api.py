import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import Base, get_db, SessionLocal
from backend.models import models

import os
from sqlalchemy import create_engine

@pytest.fixture(scope="session")
def db_engine(tmp_path_factory):
    # FIX crítico: a fixture usava o ENGINE DE PRODUÇÃO (app.db) e fazia
    # drop_all ao fim — rodar o pytest APAGAVA o banco real. Agora os testes
    # criam e descartam um banco SQLite TEMPORÁRIO, isolado do app.db.
    test_dir = tmp_path_factory.mktemp("testdb")
    test_engine = create_engine(
        f"sqlite:///{test_dir / 'test.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=test_engine)
    yield test_engine
    test_engine.dispose()

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)
    
    settings = session.query(models.Settings).first()
    if not settings:
        settings = models.Settings(votacao_aberta=True)
        session.add(settings)
        session.commit()
        
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_register_duplicate_username(client, db_session):
    response = client.post("/api/register", json={"username": "testuser", "password": "123"})
    assert response.status_code == 200
    assert "access_token" in response.json()
    
    response = client.post("/api/register", json={"username": "testuser", "password": "abc"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Username already registered"

def test_cast_vote_self_vote(client, db_session):
    response = client.post("/api/register", json={"username": "voter1", "password": "123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    me_resp = client.get("/api/me", headers=headers)
    user_id = me_resp.json()["id"]
    
    cat = models.Category(title="Test", emoji="T", reveal_order=1, modo="aberta")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)
    
    vote_data = {"category_id": cat.id, "voted_user_id": user_id}
    resp = client.post("/api/votes", json=vote_data, headers=headers)
    
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Self-voting is not allowed"

def test_results_hidden_before_reveal(client, db_session):
    resp = client.get("/api/results")
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Results are not yet available"


def test_candidacy_limit_four_per_user(client, db_session):
    # Usuário candidato em 4 categorias distintas → a 5ª deve ser bloqueada.
    response = client.post("/api/register", json={"username": "candlimit", "password": "123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    cats = []
    for i in range(5):
        cat = models.Category(title=f"Cat Limite {i}", emoji="X", reveal_order=i + 1, modo="candidatos")
        db_session.add(cat)
        cats.append(cat)
    db_session.commit()
    for cat in cats:
        db_session.refresh(cat)

    # As 4 primeiras candidaturas são aceitas (201).
    for i in range(4):
        resp = client.post(
            "/api/candidacies",
            json={"category_id": cats[i].id, "pitch": f"Pitch {i}"},
            headers=headers,
        )
        assert resp.status_code == 201, resp.text

    # A 5ª candidatura deve retornar 400 pelo limite server-side.
    resp = client.post(
        "/api/candidacies",
        json={"category_id": cats[4].id, "pitch": "Pitch 5"},
        headers=headers,
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Limit of 4 candidacies per user"


def test_upload_avatar_png_valido(client, db_session):
    response = client.post("/api/register", json={"username": "avataruser", "password": "123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # PNG mínimo válido: começa pelos magic bytes \x89PNG\r\n\x1a\n (< 200KB).
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    resp = client.post(
        "/api/users/me/avatar",
        files={"file": ("foto.png", png_bytes, "image/png")},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["avatar_url"] == "/api/users/me/avatar_file"

    # O caminho persistido é relativo (uploads/…) e não expõe disco.
    me = client.get("/api/me", headers=headers)
    avatar = me.json()["avatar"]
    assert avatar is not None
    assert avatar.startswith("uploads/")
    assert avatar.endswith(".png")


def test_upload_avatar_formato_invalido(client, db_session):
    response = client.post("/api/register", json={"username": "avatarfake", "password": "123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Texto puro com nome .png: magic bytes não conferem → 415.
    resp = client.post(
        "/api/users/me/avatar",
        files={"file": ("falso.png", b"hello", "image/png")},
        headers=headers,
    )
    assert resp.status_code == 415
    assert resp.json()["detail"] == "Formato de avatar não suportado (use JPEG, PNG ou WebP)"


def test_upload_avatar_acima_200kb(client, db_session):
    response = client.post("/api/register", json={"username": "avatarbig", "password": "123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Cabeçalho do multipart passa de 200KB → 413.
    big_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 200_001
    resp = client.post(
        "/api/users/me/avatar",
        files={"file": ("grande.png", big_bytes, "image/png")},
        headers=headers,
    )
    assert resp.status_code == 413
    assert resp.json()["detail"] == "Avatar excede 200KB"
