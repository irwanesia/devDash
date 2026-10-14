import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.extensions import db
from app.models.base import utcnow_iso
from app.models.daily import DailyLog, DailyTemplate
from app.routes import crud
from app.routes.common import err, to_dict
from app.schemas.schemas import DailyTemplateSchema

bp = Blueprint("daily", __name__)


@bp.get("/templates")
@jwt_required()
def daftar_template():
    return crud.daftar(DailyTemplate, DailyTemplate.sort_order)


@bp.post("/templates")
@jwt_required()
def buat_template():
    return crud.buat(DailyTemplate, DailyTemplateSchema)


@bp.put("/templates/<id>")
@jwt_required()
def ubah_template(id):
    return crud.ubah(DailyTemplate, DailyTemplateSchema, id)


@bp.delete("/templates/<id>")
@jwt_required()
def hapus_template(id):
    return crud.hapus(DailyTemplate, id)


@bp.get("/logs")
@jwt_required()
def riwayat():
    q = crud.milik_user(DailyLog.query, DailyLog)
    dari = request.args.get("from")
    sampai = request.args.get("to")
    if dari:
        q = q.filter(DailyLog.log_date >= dari)
    if sampai:
        q = q.filter(DailyLog.log_date <= sampai)
    q = q.order_by(DailyLog.log_date.desc())
    return {"data": [to_dict(o) for o in q.limit(500).all()]}


@bp.put("/logs")
@jwt_required()
def set_centang():
    """Body: {log_date, template_id, is_done} — upsert per unik user+date+template."""
    body = request.get_json(force=True, silent=True) or {}
    for f in ("log_date", "template_id"):
        if not body.get(f):
            return err("validasi", f"Field {f} wajib", 400)
    is_done = bool(body.get("is_done", True))
    now = utcnow_iso()
    log = DailyLog.query.filter_by(
        user_id=get_jwt_identity(), log_date=body["log_date"], template_id=body["template_id"]
    ).first()
    if not log:
        log = DailyLog(
            id=str(uuid.uuid4()), user_id=get_jwt_identity(), created_at=now, updated_at=now,
            log_date=body["log_date"], template_id=body["template_id"],
            is_done=is_done, done_at=now if is_done else None,
        )
        db.session.add(log)
    else:
        log.is_done = is_done
        log.done_at = now if is_done else None
        log.deleted_at = None
        log.touch()
    db.session.commit()
    return {"data": to_dict(log)}
