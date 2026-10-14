import uuid

from flask import Blueprint, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from marshmallow import ValidationError
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models.base import utcnow_iso
from app.models.user import User
from app.routes.common import err, to_dict
from app.schemas.schemas import LoginSchema, RegisterSchema

bp = Blueprint("auth", __name__)


@bp.post("/register")
def register():
    try:
        data = RegisterSchema().load(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return err("validasi", str(e.messages), 400)
    if User.query.filter_by(email=data["email"].lower()).first():
        return err("email_terpakai", "Email sudah terdaftar", 409)
    now = utcnow_iso()
    user = User(
        id=str(uuid.uuid4()),
        email=data["email"].lower(),
        password_hash=generate_password_hash(data["password"]),
        display_name=data.get("display_name") or data["email"].split("@")[0],
        created_at=now,
        updated_at=now,
    )
    db.session.add(user)
    db.session.commit()
    return {"user": {"id": user.id, "email": user.email, "display_name": user.display_name}}, 201


@bp.post("/login")
def login():
    try:
        data = LoginSchema().load(request.get_json(force=True, silent=True) or {})
    except ValidationError as e:
        return err("validasi", str(e.messages), 400)
    user = User.query.filter_by(email=data["email"].lower()).first()
    if not user or not check_password_hash(user.password_hash, data["password"]):
        return err("kredensial_salah", "Email atau password salah", 401)
    return {
        "access_token": create_access_token(identity=user.id),
        "refresh_token": create_refresh_token(identity=user.id),
        "user": {"id": user.id, "email": user.email, "display_name": user.display_name},
    }


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    uid = get_jwt_identity()
    return {"access_token": create_access_token(identity=uid)}


@bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, get_jwt_identity())
    if not user:
        return err("tak_dikenal", "Pengguna tidak ditemukan", 404)
    return {"user": {"id": user.id, "email": user.email, "display_name": user.display_name}}


def _profil():
    user = db.session.get(User, get_jwt_identity())
    return {"id": user.id, "email": user.email, "display_name": user.display_name} if user else None
