import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import Base, engine, get_db, SessionLocal
from backend.models import models

import os

@pytest.fixture(scope="session")
def db_engine():
    test_engine = engine
    Base.metadata.create_all(bind=test_engine)
    yield test_engine
    Base.metadata.drop_all(bind=test_engine)

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
