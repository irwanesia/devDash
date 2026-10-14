import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.base import utcnow_iso
from app.models.reminder import Reminder
from app.routes import crud
from app.routes.common import err, to_dict
from app.schemas.schemas import ReminderSchema
from app.services.recurrence import tambah_periode

bp = Blueprint("reminders", __name__)


@bp.get("")
@jwt_required()
def daftar():
    q = crud.milik_user(Reminder.query, Reminder)
    status = request.args.get("status")
    if status:
        q = q.filter_by(status=status)
    dari = request.args.get("from")
    sampai = request.args.get("to")
    if dari:
        q = q.filter(Reminder.due_date >= dari)
    if sampai:
        q = q.filter(Reminder.due_date <= sampai)
    return {"data": [to_dict(o) for o in q.order_by(Reminder.due_date).all()]}


@bp.post("")
@jwt_required()
def buat():
    return crud.buat(Reminder, ReminderSchema)


@bp.put("/<id>")
@jwt_required()
def ubah(id):
    return crud.ubah(Reminder, ReminderSchema, id)


@bp.delete("/<id>")
@jwt_required()
def hapus(id):
    return crud.hapus(Reminder, id)


@bp.post("/<id>/pay")
@jwt_required()
def bayar(id):
    """Tandai lunas; bila berulang, buat jatuh tempo berikutnya (PRD §5.4)."""
    obj = crud.milik_user(Reminder.query, Reminder).filter_by(id=id).first()
    if not obj:
        return err("tak_ditemukan", "Data tidak ditemukan", 404)
    now = utcnow_iso()
    obj.status = "lunas"
    obj.paid_at = now
    obj.touch()
    berikut = None
    if obj.repeat_rule != "tidak":
        berikut = Reminder(
            id=str(uuid.uuid4()), user_id=get_jwt_identity(), created_at=now, updated_at=now,
            title=obj.title, category=obj.category, amount=obj.amount,
            due_date=tambah_periode(obj.due_date, obj.repeat_rule),
            repeat_rule=obj.repeat_rule, remind_days_before=obj.remind_days_before,
            status="belum", project_id=obj.project_id, notes=obj.notes,
        )
        db.session.add(berikut)
    db.session.commit()
    return {"data": to_dict(obj), "berikutnya": to_dict(berikut) if berikut else None}
