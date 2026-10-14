from flask import Blueprint
from flask_jwt_extended import jwt_required

from app.models.category import Category
from app.routes import crud
from app.schemas.schemas import CategorySchema

bp = Blueprint("categories", __name__)


@bp.get("")
@jwt_required()
def daftar():
    return crud.daftar(Category, Category.sort_order)


@bp.post("")
@jwt_required()
def buat():
    return crud.buat(Category, CategorySchema)


@bp.put("/<id>")
@jwt_required()
def ubah(id):
    return crud.ubah(Category, CategorySchema, id)


@bp.delete("/<id>")
@jwt_required()
def hapus(id):
    # Item yang memakai kategori menjadi tanpa kategori (PRD §5.2)
    from app.extensions import db
    from app.models.project import Project, Task

    from flask_jwt_extended import get_jwt_identity

    uid = get_jwt_identity()
    for m in (Project, Task):
        for o in m.query.filter_by(user_id=uid, category_id=id, deleted_at=None).all():
            o.category_id = None
            o.touch()
    db.session.commit()
    return crud.hapus(Category, id)
