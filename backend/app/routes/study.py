import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.extensions import db
from app.models.base import utcnow_iso
from app.models.study import StudyLog, StudySchedule
from app.routes import crud
from app.routes.common import err, to_dict
from app.schemas.schemas import StudyScheduleSchema

bp = Blueprint("study", __name__)


@bp.get("/schedules")
@jwt_required()
def daftar():
    return crud.daftar(StudySchedule, StudySchedule.start_time)


@bp.post("/schedules")
@jwt_required()
def buat():
    return crud.buat(StudySchedule, StudyScheduleSchema)


@bp.put("/schedules/<id>")
@jwt_required()
def ubah(id):
    return crud.ubah(StudySchedule, StudyScheduleSchema, id)


@bp.delete("/schedules/<id>")
@jwt_required()
def hapus(id):
    return crud.hapus(StudySchedule, id)


@bp.put("/logs")
@jwt_required()
def tandai():
    """Body: {schedule_id, log_date, is_done}."""
    body = request.get_json(force=True, silent=True) or {}
    for f in ("schedule_id", "log_date"):
        if not body.get(f):
            return err("validasi", f"Field {f} wajib", 400)
    is_done = bool(body.get("is_done", True))
    now = utcnow_iso()
    log = StudyLog.query.filter_by(
        user_id=get_jwt_identity(), schedule_id=body["schedule_id"], log_date=body["log_date"]
    ).first()
    if not log:
        log = StudyLog(
            id=str(uuid.uuid4()), user_id=get_jwt_identity(), created_at=now, updated_at=now,
            schedule_id=body["schedule_id"], log_date=body["log_date"],
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
