import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import Base, get_db, SessionLocal
from backend.models import models
from backend.core.config import settings as app_config

import os
from datetime import datetime, timedelta
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
    # Decisão do dono: SEM limite de quantidade — o eleitor concorre em
    # TODAS as categorias. A regra dura é a unicidade por categoria.
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

    # Candidaturas em categorias DISTINTAS são todas aceitas (201).
    for i in range(5):
        resp = client.post(
            "/api/candidacies",
            json={"category_id": cats[i].id, "pitch": f"Pitch {i}"},
            headers=headers,
        )
        assert resp.status_code == 201, resp.text

    # Segunda candidatura na MESMA categoria → 400 pela unicidade.
    resp = client.post(
        "/api/candidacies",
        json={"category_id": cats[0].id, "pitch": "Pitch duplicado"},
        headers=headers,
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Already a candidate in this category"


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


# ---------------------------------------------------------------------------
# Helpers dos testes da onda de tempo real (SSE/chat/cerimônia)
# ---------------------------------------------------------------------------
def _user_headers(client, username: str) -> dict:
    """Registra um usuário novo e devolve o header Authorization com o JWT."""
    resp = client.post("/api/register", json={"username": username, "password": "123"})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _admin_headers(client) -> dict:
    """Faz login administrativo e devolve o header com o JWT de admin."""
    resp = client.post("/api/admin/login", json={"password": app_config.ADMIN_PASSWORD})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ---------------------------------------------------------------------------
# Chat (Objetivo 1)
# ---------------------------------------------------------------------------
def test_chat_requires_auth(client, db_session):
    # Sem ticket/JWT de usuário o chat é fechado (a gala é só do grupo).
    resp = client.post("/api/chat", json={"text": "oi"})
    assert resp.status_code == 401


def test_chat_roundtrip(client, db_session):
    headers = _user_headers(client, "chat_user")

    resp = client.post("/api/chat", json={"text": "Boa noite, gala!"}, headers=headers)
    assert resp.status_code == 201, resp.text
    criada = resp.json()
    assert criada["text"] == "Boa noite, gala!"
    assert criada["username"] == "chat_user"
    assert isinstance(criada["id"], int)
    assert criada["created_at"] is not None

    recentes = client.get("/api/chat/recent", headers=headers)
    assert recentes.status_code == 200, recentes.text
    ids = [msg["id"] for msg in recentes.json()]
    assert criada["id"] in ids


# ---------------------------------------------------------------------------
# Handshake do hub SSE (Objetivo 2/3)
# ---------------------------------------------------------------------------
def test_ticket_flow(client, db_session):
    headers = _user_headers(client, "sse_user")

    # JWT normal troca por um ticket de uso único (o JWT não vai na query).
    resp = client.post("/api/events/ticket", headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["ticket"]

    # Ticket inválido é recusado ANTES de abrir o stream.
    resp = client.get("/api/events", params={"ticket": "ticket-invalido"})
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Cerimônia dirigida (Objetivo 4)
# ---------------------------------------------------------------------------
def test_ceremony_requires_scheduling(client, db_session):
    # Settings do fixture nasce sem reveal_at → iniciar é proibido.
    headers = _admin_headers(client)
    resp = client.post("/api/admin/ceremony/start", headers=headers)
    assert resp.status_code == 403
    assert "Agende" in resp.json()["detail"]


def test_ceremony_start_after_reveal_at(client, db_session):
    # reveal_at no passado = horário mínimo já atingido → admin pode iniciar.
    settings = db_session.query(models.Settings).first()
    settings.reveal_at = datetime.now() - timedelta(minutes=1)
    settings.ceremony_phase = None
    settings.ceremony_category_id = None
    settings.ceremony_revealed = "[]"
    db_session.commit()

    headers = _admin_headers(client)
    resp = client.post("/api/admin/ceremony/start", headers=headers)
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    assert corpo["phase"] == "abertura"
    assert corpo["category_id"] is None
    assert corpo["revealed"] == []

    # A posição pública reflete o mesmo estado (fonte da verdade do cliente).
    posicao = client.get("/api/ceremony/position")
    assert posicao.status_code == 200
    assert posicao.json()["phase"] == "abertura"


def test_ceremony_full_reveal_flow(client, db_session):
    """Fluxo novo (decisão do dono): categoria revelada INTEIRA de uma vez.
    start → next (chama cat) → reveal (sem order) → next (fecha) → abertura."""
    settings = db_session.query(models.Settings).first()
    settings.reveal_at = datetime.now() - timedelta(minutes=1)
    settings.ceremony_phase = None
    settings.ceremony_category_id = None
    settings.ceremony_revealed = "[]"
    db_session.commit()

    # Categoria para a cerimônia operar.
    cat = models.Category(title="Flow Test", emoji="🏆", modo="candidatos", reveal_order=90)
    db_session.add(cat)
    db_session.commit()

    headers = _admin_headers(client)
    assert client.post("/api/admin/ceremony/start", headers=headers).status_code == 200

    chamada = client.post("/api/admin/ceremony/next", headers=headers)
    assert chamada.status_code == 200
    assert chamada.json()["phase"] == "categoria"
    assert chamada.json()["category_id"] == cat.id

    revel = client.post("/api/admin/ceremony/reveal", headers=headers)
    assert revel.status_code == 200
    assert revel.json()["phase"] == "revelacao"
    assert revel.json()["full_reveal"] is True

    fechada = client.post("/api/admin/ceremony/next", headers=headers)
    assert fechada.status_code == 200
    assert fechada.json()["phase"] in ("abertura", "encerramento")
    assert cat.id in fechada.json()["revealed"]


# ---------------------------------------------------------------------------
# CRUD admin de categorias (Objetivo 5)
# ---------------------------------------------------------------------------
def test_admin_categories_crud(client, db_session):
    headers = _admin_headers(client)

    criada = client.post(
        "/api/admin/categories",
        json={
            "title": "Categoria Admin",
            "emoji": "🏆",
            "modo": "candidatos",
            "reveal_order": 1,
        },
        headers=headers,
    )
    assert criada.status_code == 201, criada.text
    categoria = criada.json()
    assert categoria["title"] == "Categoria Admin"
    assert categoria["candidacies"] == []

    editada = client.put(
        f"/api/admin/categories/{categoria['id']}",
        json={"title": "Categoria Editada", "reveal_order": 2},
        headers=headers,
    )
    assert editada.status_code == 200, editada.text
    assert editada.json()["title"] == "Categoria Editada"
    assert editada.json()["reveal_order"] == 2

    apagada = client.delete(
        f"/api/admin/categories/{categoria['id']}", headers=headers
    )
    assert apagada.status_code == 204

    # Depois do DELETE a categoria não existe mais (PUT → 404).
    fantasma = client.put(
        f"/api/admin/categories/{categoria['id']}",
        json={"title": "Não existe"},
        headers=headers,
    )
    assert fantasma.status_code == 404


# ---------------------------------------------------------------------------
# Ata notarial (Objetivo 4)
# ---------------------------------------------------------------------------
def test_audit_log(client, db_session):
    headers = _admin_headers(client)

    # Ata começa vazia neste banco de teste (fixture isolada por transação).
    vazia = client.get("/api/admin/audit", headers=headers)
    assert vazia.status_code == 200, vazia.text
    assert vazia.json() == []

    criada = client.post(
        "/api/admin/categories",
        json={
            "title": "Categoria Audit",
            "emoji": "📜",
            "modo": "candidatos",
            "reveal_order": 7,
        },
        headers=headers,
    )
    assert criada.status_code == 201, criada.text

    ata = client.get("/api/admin/audit", headers=headers)
    assert ata.status_code == 200, ata.text
    registros = ata.json()
    assert len(registros) == 1
    registro = registros[0]
    assert registro["actor"] == "admin"
    assert registro["action"] == "categoria_criada"
    assert "Categoria Audit" in registro["detail"]
    assert registro["created_at"] is not None

    # Sem Bearer de admin a ata não é exposta.
    sem_auth = client.get("/api/admin/audit")
    assert sem_auth.status_code == 401


# ---------------------------------------------------------------------------
# Gerenciamento de usuários (admin)
# ---------------------------------------------------------------------------
def test_admin_list_users(client, db_session):
    # Dois eleitores reais: A dá voto em B e B dá voto em A na MESMA categoria
    # (a unicidade é por voter+category, então os dois votos coexistem).
    headers_a = _user_headers(client, "listuser_a")
    headers_b = _user_headers(client, "listuser_b")
    id_a = client.get("/api/me", headers=headers_a).json()["id"]
    id_b = client.get("/api/me", headers=headers_b).json()["id"]

    cat = models.Category(
        title="Cat Lista", emoji="L", reveal_order=50, modo="aberta"
    )
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)

    resp_a = client.post(
        "/api/votes",
        json={"category_id": cat.id, "voted_user_id": id_b},
        headers=headers_a,
    )
    assert resp_a.status_code == 200, resp_a.text
    resp_b = client.post(
        "/api/votes",
        json={"category_id": cat.id, "voted_user_id": id_a},
        headers=headers_b,
    )
    assert resp_b.status_code == 200, resp_b.text

    admin_headers = _admin_headers(client)
    resp = client.get("/api/admin/users", headers=admin_headers)
    assert resp.status_code == 200, resp.text

    por_nome = {u["username"]: u for u in resp.json()}
    assert "listuser_a" in por_nome
    assert "listuser_b" in por_nome

    a = por_nome["listuser_a"]
    assert a["id"] == id_a
    assert a["is_guest"] is False
    assert a["avatar"] is None
    assert a["created_at"] is not None
    assert a["candidacies_count"] == 0
    assert a["votes_given_count"] == 1
    assert a["votes_received_count"] == 1

    b = por_nome["listuser_b"]
    assert b["votes_given_count"] == 1
    assert b["votes_received_count"] == 1


def test_admin_update_user(client, db_session):
    headers = _user_headers(client, "updatable")
    _user_headers(client, "already_taken")
    user_id = client.get("/api/me", headers=headers).json()["id"]
    admin_headers = _admin_headers(client)

    # PUT do vulgo → resposta e GET refletem.
    resp = client.put(
        f"/api/admin/users/{user_id}",
        json={"vulgo": "O Grande"},
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["vulgo"] == "O Grande"

    lista = client.get("/api/admin/users", headers=admin_headers).json()
    alvo = next(u for u in lista if u["id"] == user_id)
    assert alvo["vulgo"] == "O Grande"

    # Username já usado por OUTRO id → 409 com a mensagem exata.
    conflito = client.put(
        f"/api/admin/users/{user_id}",
        json={"username": "already_taken"},
        headers=admin_headers,
    )
    assert conflito.status_code == 409
    assert conflito.json()["detail"] == "Já existe um usuário com esse nome"

    # Vulgo vazio LIMPA o apelido (vira null no JSON).
    limpo = client.put(
        f"/api/admin/users/{user_id}",
        json={"vulgo": ""},
        headers=admin_headers,
    )
    assert limpo.status_code == 200, limpo.text
    assert limpo.json()["vulgo"] is None


def test_admin_delete_user(client, db_session):
    headers_a = _user_headers(client, "deluser_a")
    headers_b = _user_headers(client, "deluser_b")
    id_a = client.get("/api/me", headers=headers_a).json()["id"]
    id_b = client.get("/api/me", headers=headers_b).json()["id"]

    cat = models.Category(
        title="Cat Delete", emoji="D", reveal_order=51, modo="candidatos"
    )
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)

    # A é candidato; A vota em B e B vota em A (A terá voto dado e recebido).
    candidatura = client.post(
        "/api/candidacies",
        json={"category_id": cat.id, "pitch": "A"},
        headers=headers_a,
    )
    assert candidatura.status_code == 201, candidatura.text
    assert (
        client.post(
            "/api/votes",
            json={"category_id": cat.id, "voted_user_id": id_b},
            headers=headers_a,
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/votes",
            json={"category_id": cat.id, "voted_user_id": id_a},
            headers=headers_b,
        ).status_code
        == 200
    )

    admin_headers = _admin_headers(client)
    apagado = client.delete(f"/api/admin/users/{id_a}", headers=admin_headers)
    assert apagado.status_code == 204

    # Sumiu da listagem administrativa.
    lista = client.get("/api/admin/users", headers=admin_headers).json()
    assert all(u["id"] != id_a for u in lista)

    # Candidatura sumiu do endpoint público de categorias.
    categorias = client.get("/api/categories").json()
    cat_publica = next(c for c in categorias if c["id"] == cat.id)
    assert all(c["user_id"] != id_a for c in cat_publica["candidacies"])

    # Votos dados/recebidos do usuário sumiram do banco.
    db_session.expire_all()
    votos = (
        db_session.query(models.Vote)
        .filter(
            (models.Vote.voter_id == id_a) | (models.Vote.voted_user_id == id_a)
        )
        .count()
    )
    assert votos == 0

    # Segunda tentativa de DELETE → 404.
    novamente = client.delete(f"/api/admin/users/{id_a}", headers=admin_headers)
    assert novamente.status_code == 404



# ---------------------------------------------------------------------------
# Ata pessoal do eleitor (/api/audit/me)
# ---------------------------------------------------------------------------
def test_audit_me(client, db_session):
    headers_a = _user_headers(client, "atauser_a")
    headers_b = _user_headers(client, "atauser_b")
    admin_headers = _admin_headers(client)

    # Categoria com B candidato, para A poder votar em B.
    categoria = client.post(
        "/api/admin/categories",
        json={
            "title": "Ata Pessoal Teste",
            "emoji": "📋",
            "modo": "candidatos",
            "reveal_order": 9,
        },
        headers=admin_headers,
    ).json()
    candidatura = client.post(
        "/api/candidacies",
        json={"category_id": categoria["id"], "pitch": "pitch do B"},
        headers=headers_b,
    )
    assert candidatura.status_code == 201, candidatura.text

    # A vota em B: o ato entra na ata com actor = A.
    voto = client.post(
        "/api/votes",
        json={
            "category_id": categoria["id"],
            "voted_user_id": candidatura.json()["user_id"],
        },
        headers=headers_a,
    )
    assert voto.status_code == 200, voto.text

    # Ata pessoal de A: só atos de A, e o voto está lá.
    minha = client.get("/api/audit/me", headers=headers_a)
    assert minha.status_code == 200, minha.text
    registros = minha.json()
    assert all(r["actor"] == "atauser_a" for r in registros)
    assert any(r["action"] == "voto_registrado" for r in registros)
    assert any("voto em @atauser_b" in r["detail"] for r in registros)

    # B tem a candidatura dele na PRÓPRIA ata — e o voto de A NÃO vaza para B.
    minha_b = client.get("/api/audit/me", headers=headers_b)
    assert minha_b.status_code == 200
    registros_b = minha_b.json()
    assert all(r["actor"] == "atauser_b" for r in registros_b)
    assert any(r["action"] == "candidatura_criada" for r in registros_b)
    assert all(r["action"] != "voto_registrado" for r in registros_b)

    # Sem sessão, a ata pessoal é fechada.
    assert client.get("/api/audit/me").status_code == 401


# ---------------------------------------------------------------------------
# Sugestões de candidatura
# ---------------------------------------------------------------------------
def _create_category(db_session, title: str, reveal_order: int = 1):
    """Categoria direto no banco: evita depender do CRUD de admin no teste."""
    cat = models.Category(
        title=title, emoji="🎯", reveal_order=reveal_order, modo="aberta"
    )
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)
    return cat


def test_suggestion_full_flow(client, db_session):
    """A sugere para B → B vê na caixa → aceita → candidatura + ata."""
    headers_a = _user_headers(client, "sugflow_a")
    headers_b = _user_headers(client, "sugflow_b")
    id_b = client.get("/api/me", headers=headers_b).json()["id"]
    cat = _create_category(db_session, "Sugestão Fluxo", reveal_order=30)

    enviada = client.post(
        "/api/suggestions",
        json={
            "category_id": cat.id,
            "target_username": "sugflow_b",
            "pitch": "Ele quebrou o grupo em 2019",
        },
        headers=headers_a,
    )
    assert enviada.status_code == 201, enviada.text
    corpo = enviada.json()
    assert corpo["target_username"] == "sugflow_b"
    assert corpo["author_username"] == "sugflow_a"
    assert corpo["status"] == "pending"
    assert corpo["created_at"] is not None
    sugestao_id = corpo["id"]

    # Caixa de entrada do ALVO (e não do autor).
    caixa_b = client.get("/api/suggestions/me", headers=headers_b)
    assert caixa_b.status_code == 200, caixa_b.text
    item = next(s for s in caixa_b.json() if s["id"] == sugestao_id)
    assert item["category_title"] == "Sugestão Fluxo"
    assert item["category_emoji"] == "🎯"
    assert item["author_username"] == "sugflow_a"
    assert item["status"] == "pending"
    assert client.get("/api/suggestions/me", headers=headers_a).json() == []

    # B aceita → candidatura criada com o pitch sugerido.
    aceite = client.post(
        f"/api/suggestions/{sugestao_id}/accept", headers=headers_b
    )
    assert aceite.status_code == 200, aceite.text
    candidatura = aceite.json()
    assert candidatura["user_id"] == id_b
    assert candidatura["username"] == "sugflow_b"
    assert candidatura["category_id"] == cat.id
    assert candidatura["pitch"] == "Ele quebrou o grupo em 2019"

    # Sugestão decidida aparece como accepted na caixa do alvo.
    caixa_b = client.get("/api/suggestions/me", headers=headers_b).json()
    decidida = next(s for s in caixa_b if s["id"] == sugestao_id)
    assert decidida["status"] == "accepted"
    assert decidida["decided_at"] is not None

    # A candidatura é pública e única na categoria.
    publicas = client.get("/api/categories").json()
    cat_publica = next(c for c in publicas if c["id"] == cat.id)
    minhas = [c for c in cat_publica["candidacies"] if c["user_id"] == id_b]
    assert len(minhas) == 1
    assert minhas[0]["pitch"] == "Ele quebrou o grupo em 2019"

    # Contador global de candidatos reflete a criação.
    estado = client.get("/api/state").json()
    assert estado["total_candidatos"] == 1

    # Ata: os DOIS lados ficaram registrados.
    ata = client.get("/api/admin/audit", headers=_admin_headers(client)).json()
    assert any(
        r["actor"] == "sugflow_b"
        and r["action"] == "candidatura_aceita_de_sugestao"
        and "sugflow_a" in r["detail"]
        for r in ata
    )
    assert any(
        r["actor"] == "sugflow_a"
        and r["action"] == "sugestao_aceita"
        and "sugflow_b" in r["detail"]
        for r in ata
    )
    assert any(
        r["actor"] == "sugflow_a" and r["action"] == "sugestao_enviada"
        for r in ata
    )

    # Histórico do autor também enxerga a decisão.
    criadas = client.get("/api/suggestions/created", headers=headers_a).json()
    criada = next(s for s in criadas if s["id"] == sugestao_id)
    assert criada["status"] == "accepted"
    assert criada["target_username"] == "sugflow_b"


def test_suggestion_accept_replaces_existing_pitch(client, db_session):
    """B já concorre: aceitar SUBSTITUI o pitch e preserva o id (sem 2ª candidatura)."""
    headers_a = _user_headers(client, "sugrep_a")
    headers_b = _user_headers(client, "sugrep_b")
    id_b = client.get("/api/me", headers=headers_b).json()["id"]
    cat = _create_category(db_session, "Sugestão Replace", reveal_order=31)

    original = client.post(
        "/api/candidacies",
        json={"category_id": cat.id, "pitch": "pitch antigo do B"},
        headers=headers_b,
    )
    assert original.status_code == 201, original.text
    candidacy_id = original.json()["id"]

    enviada = client.post(
        "/api/suggestions",
        json={
            "category_id": cat.id,
            "target_username": "sugrep_b",
            "pitch": "pitch novo lembrado por A",
        },
        headers=headers_a,
    )
    assert enviada.status_code == 201, enviada.text

    aceite = client.post(
        f"/api/suggestions/{enviada.json()['id']}/accept", headers=headers_b
    )
    assert aceite.status_code == 200, aceite.text
    # Id preservado: é a MESMA candidatura, só com pitch novo.
    assert aceite.json()["id"] == candidacy_id
    assert aceite.json()["pitch"] == "pitch novo lembrado por A"

    publicas = client.get("/api/categories").json()
    cat_publica = next(c for c in publicas if c["id"] == cat.id)
    minhas = [c for c in cat_publica["candidacies"] if c["user_id"] == id_b]
    assert len(minhas) == 1
    assert minhas[0]["id"] == candidacy_id
    assert minhas[0]["pitch"] == "pitch novo lembrado por A"


def test_suggestion_self_and_guest_blocked(client, db_session):
    headers_a = _user_headers(client, "sugself_a")
    cat = _create_category(db_session, "Sugestão Self", reveal_order=32)

    self_resp = client.post(
        "/api/suggestions",
        json={
            "category_id": cat.id,
            "target_username": "sugself_a",
            "pitch": "eu mesmo",
        },
        headers=headers_a,
    )
    assert self_resp.status_code == 400
    assert self_resp.json()["detail"] == "Você não pode sugerir para você mesmo"

    # Convidado (indicado sem conta) não tem caixa de entrada.
    convidado = models.User(
        username="sugguest_alvo", password_hash="x", is_guest=True
    )
    db_session.add(convidado)
    db_session.commit()

    guest_resp = client.post(
        "/api/suggestions",
        json={
            "category_id": cat.id,
            "target_username": "sugguest_alvo",
            "pitch": "memória",
        },
        headers=headers_a,
    )
    assert guest_resp.status_code == 400
    assert (
        guest_resp.json()["detail"]
        == "Convidados não acessam a caixa de sugestões"
    )


def test_suggestion_limits_pending(client, db_session):
    headers_a = _user_headers(client, "suglim_a")
    _user_headers(client, "suglim_b")

    # Limite de 3 pendentes por par (alvo, categoria) — de qualquer autor.
    cat1 = _create_category(db_session, "Limite Par", reveal_order=33)
    for i in range(3):
        resp = client.post(
            "/api/suggestions",
            json={
                "category_id": cat1.id,
                "target_username": "suglim_b",
                "pitch": f"memória {i}",
            },
            headers=headers_a,
        )
        assert resp.status_code == 201, resp.text

    quarta = client.post(
        "/api/suggestions",
        json={
            "category_id": cat1.id,
            "target_username": "suglim_b",
            "pitch": "memória 4",
        },
        headers=headers_a,
    )
    assert quarta.status_code == 400
    assert (
        quarta.json()["detail"]
        == "Este eleitor já tem 3 sugestões pendentes nesta categoria"
    )

    # Limite de 5 pendentes por AUTOR: mais 2 em categorias novas = 5 no total.
    for i, ordem in enumerate((34, 35), start=1):
        cat = _create_category(db_session, f"Limite Autor {i}", reveal_order=ordem)
        resp = client.post(
            "/api/suggestions",
            json={
                "category_id": cat.id,
                "target_username": "suglim_b",
                "pitch": f"outra memória {i}",
            },
            headers=headers_a,
        )
        assert resp.status_code == 201, resp.text

    cat6 = _create_category(db_session, "Limite Autor 6", reveal_order=36)
    sexta = client.post(
        "/api/suggestions",
        json={
            "category_id": cat6.id,
            "target_username": "suglim_b",
            "pitch": "memória excedente",
        },
        headers=headers_a,
    )
    assert sexta.status_code == 400
    assert (
        sexta.json()["detail"] == "Limite de 5 sugestões pendentes por autor"
    )


def test_suggestion_reject_and_authorization(client, db_session):
    headers_a = _user_headers(client, "sugrej_a")
    headers_b = _user_headers(client, "sugrej_b")
    headers_c = _user_headers(client, "sugrej_c")
    cat = _create_category(db_session, "Sugestão Rejeição", reveal_order=37)

    enviada = client.post(
        "/api/suggestions",
        json={
            "category_id": cat.id,
            "target_username": "sugrej_b",
            "pitch": "memória rejeitável",
        },
        headers=headers_a,
    )
    assert enviada.status_code == 201, enviada.text
    sugestao_id = enviada.json()["id"]

    # Sem sessão → 401; quem não é o alvo → 403.
    assert (
        client.post(f"/api/suggestions/{sugestao_id}/accept").status_code == 401
    )
    fora_do_alvo = client.post(
        f"/api/suggestions/{sugestao_id}/accept", headers=headers_c
    )
    assert fora_do_alvo.status_code == 403

    # O alvo rejeita: status rejected e visível ao autor em /created.
    rejeitada = client.post(
        f"/api/suggestions/{sugestao_id}/reject", headers=headers_b
    )
    assert rejeitada.status_code == 200, rejeitada.text
    assert rejeitada.json() == {"status": "rejected"}

    criadas = client.get("/api/suggestions/created", headers=headers_a).json()
    item = next(s for s in criadas if s["id"] == sugestao_id)
    assert item["status"] == "rejected"
    assert item["decided_at"] is not None

    # Sugestão já processada não pode ser aceita depois.
    aceite_tardio = client.post(
        f"/api/suggestions/{sugestao_id}/accept", headers=headers_b
    )
    assert aceite_tardio.status_code == 400
    assert aceite_tardio.json()["detail"] == "Sugestão já processada"


# ---------------------------------------------------------------------------
# Sugestão de candidatura: urnas fechadas congelam o dossiê
# ---------------------------------------------------------------------------
def test_suggestion_accept_requires_open_voting(client, db_session):
    headers_a = _user_headers(client, "sugclose_a")
    headers_b = _user_headers(client, "sugclose_b")
    admin_headers = _admin_headers(client)

    categoria = client.post(
        "/api/admin/categories",
        json={"title": "Sugestão Fechada", "emoji": "🛑", "modo": "aberta", "reveal_order": 8},
        headers=admin_headers,
    ).json()

    criada = client.post(
        "/api/suggestions",
        json={"category_id": categoria["id"], "target_username": "sugclose_b", "pitch": "memória"},
        headers=headers_a,
    )
    assert criada.status_code == 201, criada.text

    # Fecha as urnas.
    fechou = client.put(
        "/api/admin/settings", json={"votacao_aberta": False}, headers=admin_headers
    )
    assert fechou.status_code == 200, fechou.text

    # Aceitar com urnas fechadas → 403 (mesma regra do POST /candidacies).
    aceito = client.post(
        f"/api/suggestions/{criada.json()['id']}/accept", headers=headers_b
    )
    assert aceito.status_code == 403
    assert aceito.json()["detail"] == "Voting is closed"

    # A sugestão continua PENDENTE (reabrir as urnas destrava a decisão).
    inbox = client.get("/api/suggestions/me", headers=headers_b)
    pendentes = [s for s in inbox.json() if s["status"] == "pending"]
    assert len(pendentes) == 1

    # Rejeitar com urna fechada é PERMITIDO: recusar não muda o dossiê.
    rejeitada = client.post(
        f"/api/suggestions/{criada.json()['id']}/reject", headers=headers_b
    )
    assert rejeitada.status_code == 200
    assert rejeitada.json()["status"] == "rejected"
