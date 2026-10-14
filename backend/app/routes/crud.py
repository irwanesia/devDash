"""CRUD generik: list (filter deleted), create (uuid), get/update (soft delete)."""
import uuid

from flask import request
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError

from app.extensions import db
from app.models.base import utcnow_iso
from app.routes.common import err, to_dict


def milik_user(query, model):
    return query.filter_by(user_id=get_jwt_identity(), deleted_at=None)


def daftar(model, order=None):
    q = milik_user(model.query, model)
    if order is not None:
        q = q.order_by(order)
    return {"data": [to_dict(o) for o in q.all()]}


def buat(model, schema_cls):
    try:
        data = schema_cls().load(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return err("validasi", str(e.messages), 400)
    now = utcnow_iso()
    obj = model(id=str(uuid.uuid4()), user_id=get_jwt_identity(), created_at=now, updated_at=now, **data)
    db.session.add(obj)
    db.session.commit()
    return {"data": to_dict(obj)}, 201


def detail(model, id):
    obj = milik_user(model.query, model).filter_by(id=id).first()
    if not obj:
        return err("tak_ditemukan", "Data tidak ditemukan", 404)
    return {"data": to_dict(obj)}


def ubah(model, schema_cls, id, partial=True):
    obj = milik_user(model.query, model).filter_by(id=id).first()
    if not obj:
        return err("tak_ditemukan", "Data tidak ditemukan", 404)
    try:
        data = schema_cls().load(request.get_json(force=True, silent=True) or {}, partial=partial)
    except ValidationError as e:
        return err("validasi", str(e.messages), 400)
    for k, v in data.items():
        setattr(obj, k, v)
    obj.touch()
    db.session.commit()
    return {"data": to_dict(obj)}


def hapus(model, id):
    obj = milik_user(model.query, model).filter_by(id=id).first()
    if not obj:
        return err("tak_ditemukan", "Data tidak ditemukan", 404)
    obj.soft_delete()
    db.session.commit()
    return {"ok": True}
