"""Sinkronisasi dua arah last-write-wins (PRD §4).

Kontrak:
  POST /api/sync  (JWT access)
  Body: {"last_synced_at": str | null, "changes": {tabel: [record]}}
  Balasan: {"changes": {tabel: [record server yg berubah]}, "synced_at": now}

Aturan:
- Setiap tulis memperbarui updated_at (jam server).
- Hapus = soft delete (deleted_at ikut tersinkron seperti field biasa).
- Menang = updated_at paling baru (last-write-wins).
- daily_logs dicocokkan via (log_date, template_id),
  study_logs via (schedule_id, log_date) — karena id lokal Dexie
  berupa auto-increment, bukan UUID.
"""
import uuid
from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.base import utcnow_iso
from app.models.category import Category
from app.models.daily import DailyLog, DailyTemplate
from app.models.project import Project, Task
from app.models.reminder import Reminder
from app.models.study import StudyLog, StudySchedule
from app.routes.common import to_dict

bp = Blueprint("sync", __name__)

STANDAR = {
    "categories": Category,
    "projects": Project,
    "tasks": Task,
    "daily_templates": DailyTemplate,
    "reminders": Reminder,
    "study_schedules": StudySchedule,
}

# Field yang boleh ditulis klien per tabel (id/user_id/timestamp dikelola server)
FIELD = {
    "categories": ("name", "color", "sort_order"),
    "projects": ("name", "description", "client", "status", "start_date", "target_date",
                 "value_amount", "notes", "category_id"),
    "tasks": ("project_id", "category_id", "title", "description", "priority",
              "status", "due_date", "sort_order"),
    "daily_templates": ("title", "sort_order", "is_active", "mulai_tanggal"),
    "daily_logs": ("log_date", "template_id", "is_done", "done_at"),
    "reminders": ("title", "category", "amount", "due_date", "repeat_rule",
                  "remind_days_before", "status", "paid_at", "project_id", "notes"),
    "study_schedules": ("topic", "weekdays", "start_time", "duration_min",
                        "goal", "resource_url", "is_active"),
    "study_logs": ("schedule_id", "log_date", "is_done", "done_at"),
}


def _parse(ts: str | None) -> datetime:
    if not ts:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _terapkan_standar(model, uid: str, rec: dict, now: str) -> None:
    rid = rec.get("id")
    if not rid:
        return
    obj = model.query.filter_by(id=rid, user_id=uid).first()
    if obj is None:
        obj = model(id=rid, user_id=uid, created_at=now, updated_at=now)
        db.session.add(obj)
    elif _parse(rec.get("updated_at")) <= _parse(obj.updated_at):
        return  # server lebih baru -> last-write-wins, abaikan
    for f in _table_fields(model):
        if f in rec:
            setattr(obj, f, rec[f])
    obj.deleted_at = rec.get("deleted_at")
    obj.updated_at = rec.get("updated_at") or now
    if not obj.created_at:
        obj.created_at = now


def _table_fields(model) -> tuple:
    # nama tabel -> daftar field (kunci FIELD memakai nama logis)
    for nama, m in {**STANDAR, "daily_logs": DailyLog, "study_logs": StudyLog}.items():
        if m is model:
            return FIELD[nama]
    return ()


def _terapkan_log(model, uid: str, rec: dict, now: str, kunci: tuple) -> None:
    filt = {k: rec.get(k) for k in kunci}
    if any(v is None for v in filt.values()):
        # fallback ke id bila kunci alami tak lengkap
        if rec.get("id"):
            obj = model.query.filter_by(id=rec["id"], user_id=uid).first()
            if obj and _parse(rec.get("updated_at")) <= _parse(obj.updated_at):
                return
            if obj:
                for f in _table_fields(model):
                    if f in rec:
                        setattr(obj, f, rec[f])
                obj.deleted_at = rec.get("deleted_at")
                obj.updated_at = rec.get("updated_at") or now
                return
        return
    obj = model.query.filter_by(user_id=uid, **filt).first()
    if obj is None:
        obj = model(id=rec.get("id") or str(uuid.uuid4()), user_id=uid,
                    created_at=now, updated_at=now, **{k: filt[k] for k in kunci})
        db.session.add(obj)
    else:
        if _parse(rec.get("updated_at")) <= _parse(obj.updated_at):
            return
    for f in _table_fields(model):
        if f in rec:
            setattr(obj, f, rec[f])
    obj.deleted_at = rec.get("deleted_at")
    obj.updated_at = rec.get("updated_at") or now


@bp.post("")
@jwt_required()
def sinkron():
    uid = get_jwt_identity()
    body = request.get_json(force=True, silent=True) or {}
    changes = body.get("changes") or {}
    last = body.get("last_synced_at")
    now = utcnow_iso()
    last_dt = _parse(last)

    for nama, model in STANDAR.items():
        for rec in changes.get(nama) or []:
            if not isinstance(rec, dict):
                continue
            _terapkan_standar(model, uid, rec, now)
    for rec in changes.get("daily_logs") or []:
        if isinstance(rec, dict):
            _terapkan_log(DailyLog, uid, rec, now, ("log_date", "template_id"))
    for rec in changes.get("study_logs") or []:
        if isinstance(rec, dict):
            _terapkan_log(StudyLog, uid, rec, now, ("schedule_id", "log_date"))
    db.session.commit()

    # Balasan: semua baris milik user yg berubah setelah last_synced_at
    keluar: dict[str, list] = {}
    for nama, model in {**STANDAR, "daily_logs": DailyLog, "study_logs": StudyLog}.items():
        rows = model.query.filter_by(user_id=uid).all()
        keluar[nama] = [to_dict(o) for o in rows if _parse(o.updated_at) > last_dt]
    return {"changes": keluar, "synced_at": now}
