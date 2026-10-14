"""Tes endpoint dasar Fase 3: auth + CRUD + pay berulang."""
import pytest

from app import create_app
from app.config import Config
from app.extensions import db


class TestConfig(Config):
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "tes-rahasia"


@pytest.fixture()
def client():
    app = create_app(TestConfig)
    app.config.update(TESTING=True)
    with app.test_client() as c:
        with app.app_context():
            db.create_all()
        yield c


def daftar_dan_login(client, email="saya@dev.id"):
    r = client.post("/api/auth/register", json={"email": email, "password": "rahasia123", "display_name": "Saya"})
    assert r.status_code == 201, r.get_json()
    r = client.post("/api/auth/login", json={"email": email, "password": "rahasia123"})
    assert r.status_code == 200, r.get_json()
    body = r.get_json()
    return {"Authorization": f"Bearer {body['access_token']}"}, body["refresh_token"]


def test_register_login_refresh_me(client):
    headers, refresh = daftar_dan_login(client)
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.get_json()["user"]["email"] == "saya@dev.id"
    r = client.post("/api/auth/refresh", headers={"Authorization": f"Bearer {refresh}"})
    assert r.status_code == 200
    assert "access_token" in r.get_json()
    # tanpa token -> 401 format seragam
    r = client.get("/api/auth/me")
    assert r.status_code == 401
    assert r.get_json()["error"]["code"] == "butuh_login"


def test_register_duplikat_ditolak(client):
    daftar_dan_login(client)
    r = client.post("/api/auth/register", json={"email": "saya@dev.id", "password": "lain12345"})
    assert r.status_code == 409


def test_crud_project_task_dan_progres(client):
    h, _ = daftar_dan_login(client, "p@dev.id")
    r = client.post("/api/projects", headers=h, json={"name": "Web Toko"})
    assert r.status_code == 201
    pid = r.get_json()["data"]["id"]
    for judul in ("Desain", "Koding"):
        r = client.post("/api/tasks", headers=h, json={"project_id": pid, "title": judul})
        assert r.status_code == 201
    r = client.get("/api/tasks", headers=h, query_string={"project_id": pid})
    tugas = r.get_json()["data"]
    assert len(tugas) == 2
    # selesaikan 1 -> progres 50% (dihitung klien, tapi data mendukung)
    r = client.put(f"/api/tasks/{tugas[0]['id']}", headers=h, json={"status": "done"})
    assert r.status_code == 200
    r = client.get("/api/tasks", headers=h, query_string={"project_id": pid})
    done = [t for t in r.get_json()["data"] if t["status"] == "done"]
    assert len(done) == 1


def test_reminder_pay_berulang(client):
    h, _ = daftar_dan_login(client, "tagihan@dev.id")
    r = client.post("/api/reminders", headers=h, json={
        "title": "Wifi", "category": "tagihan", "amount": 300000,
        "due_date": "2026-10-20", "repeat_rule": "bulanan",
    })
    assert r.status_code == 201
    rid = r.get_json()["data"]["id"]
    r = client.post(f"/api/reminders/{rid}/pay", headers=h)
    assert r.status_code == 200
    body = r.get_json()
    assert body["data"]["status"] == "lunas"
    assert body["berikutnya"]["due_date"] == "2026-11-20"
    assert body["berikutnya"]["status"] == "belum"


def test_validasi_dan_isolasi_user(client):
    h1, _ = daftar_dan_login(client, "a@dev.id")
    h2, _ = daftar_dan_login(client, "b@dev.id")
    r = client.post("/api/projects", headers=h1, json={"name": ""})
    assert r.status_code == 400
    r = client.post("/api/projects", headers=h1, json={"name": "Milik A"})
    pid = r.get_json()["data"]["id"]
    # user B tidak bisa melihat milik A
    r = client.get(f"/api/projects/{pid}", headers=h2)
    assert r.status_code == 404
