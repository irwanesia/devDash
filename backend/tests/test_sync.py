"""Tes sinkronisasi Fase 4: dua perangkat, last-write-wins, hapus, log."""
import pytest

from app import create_app
from app.config import Config
from app.extensions import db


class TestConfig(Config):
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "tes-rahasia-sync-cukup-panjang-1234567890"


@pytest.fixture()
def client():
    app = create_app(TestConfig)
    app.config.update(TESTING=True)
    with app.test_client() as c:
        with app.app_context():
            db.create_all()
        yield c


def buat_akun(client, email):
    assert client.post("/api/auth/register", json={"email": email, "password": "rahasia123"}).status_code == 201
    r = client.post("/api/auth/login", json={"email": email, "password": "rahasia123"})
    return {"Authorization": f"Bearer {r.get_json()['access_token']}"}


def test_sync_dua_perangkat(client):
    """Data dibuat offline di A muncul di B setelah keduanya sinkron (PRD §5.6)."""
    h = buat_akun(client, "sync@dev.id")
    # Perangkat A: buat proyek offline lalu sync (push)
    proyek = {"id": "aaa-1", "name": "Dari A", "description": "", "client": "",
              "status": "berjalan", "start_date": "", "target_date": "",
              "value_amount": None, "notes": "", "category_id": None,
              "updated_at": "2026-10-14T10:00:00+00:00", "deleted_at": None}
    r = client.post("/api/sync", headers=h, json={"last_synced_at": None, "changes": {"projects": [proyek]}})
    assert r.status_code == 200
    synced = r.get_json()["synced_at"]
    assert synced

    # Perangkat B: sync dengan last_synced_at lama -> menerima proyek A
    r = client.post("/api/sync", headers=h, json={"last_synced_at": "2020-01-01T00:00:00+00:00", "changes": {}})
    assert r.get_json()["changes"]["projects"][0]["name"] == "Dari A"


def test_last_write_wins(client):
    h = buat_akun(client, "lww@dev.id")
    lama = {"id": "p-1", "name": "Lama", "description": "", "client": "", "status": "ide",
            "start_date": "", "target_date": "", "value_amount": None, "notes": "",
            "category_id": None, "updated_at": "2026-10-14T10:00:00+00:00", "deleted_at": None}
    client.post("/api/sync", headers=h, json={"last_synced_at": None, "changes": {"projects": [lama]}})
    # Tulisan usang ditolak (server lebih baru)
    usang = dict(lama, name="Usang", updated_at="2026-10-13T10:00:00+00:00")
    client.post("/api/sync", headers=h, json={"last_synced_at": None, "changes": {"projects": [usang]}})
    r = client.post("/api/sync", headers=h, json={"last_synced_at": "2020-01-01T00:00:00+00:00", "changes": {}})
    assert r.get_json()["changes"]["projects"][0]["name"] == "Lama"
    # Tulisan baru menang
    baru = dict(lama, name="Baru", updated_at="2026-10-15T10:00:00+00:00")
    client.post("/api/sync", headers=h, json={"last_synced_at": None, "changes": {"projects": [baru]}})
    r = client.post("/api/sync", headers=h, json={"last_synced_at": "2020-01-01T00:00:00+00:00", "changes": {}})
    assert r.get_json()["changes"]["projects"][0]["name"] == "Baru"


def test_hapus_merambat(client):
    h = buat_akun(client, "hapus@dev.id")
    rec = {"id": "t-1", "project_id": None, "category_id": None, "title": "X",
           "description": "", "priority": "sedang", "status": "todo", "due_date": "",
           "sort_order": 0, "updated_at": "2026-10-14T10:00:00+00:00", "deleted_at": None}
    client.post("/api/sync", headers=h, json={"last_synced_at": None, "changes": {"tasks": [rec]}})
    hapus = dict(rec, deleted_at="2026-10-14T11:00:00+00:00", updated_at="2026-10-14T11:00:00+00:00")
    client.post("/api/sync", headers=h, json={"last_synced_at": None, "changes": {"tasks": [hapus]}})
    r = client.post("/api/sync", headers=h, json={"last_synced_at": "2020-01-01T00:00:00+00:00", "changes": {}})
    tugas = r.get_json()["changes"]["tasks"]
    assert len(tugas) == 1 and tugas[0]["deleted_at"] is not None
    # daftar CRUD tidak menampilkan yang terhapus
    r = client.get("/api/tasks", headers=h)
    assert r.get_json()["data"] == []


def test_log_kunci_alami(client):
    h = buat_akun(client, "log@dev.id")
    log = {"log_date": "2026-10-14", "template_id": "tpl-1", "is_done": True,
           "done_at": "2026-10-14T10:00:00+00:00",
           "updated_at": "2026-10-14T10:00:00+00:00", "deleted_at": None}
    r = client.post("/api/sync", headers=h, json={"last_synced_at": None, "changes": {"daily_logs": [log]}})
    assert r.status_code == 200
    # kirim lagi tanpa id (id lokal auto-increment) -> tetap 1 baris (upsert)
    r = client.post("/api/sync", headers=h, json={"last_synced_at": "2020-01-01T00:00:00+00:00", "changes": {}})
    logs = r.get_json()["changes"]["daily_logs"]
    assert len(logs) == 1 and logs[0]["is_done"] is True


def test_butuh_login(client):
    r = client.post("/api/sync", json={"changes": {}})
    assert r.status_code == 401
