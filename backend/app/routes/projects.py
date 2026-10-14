from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.models.project import Project, Task
from app.routes import crud
from app.routes.common import to_dict
from app.schemas.schemas import ProjectSchema, TaskSchema

bp_projects = Blueprint("projects", __name__)
bp_tasks = Blueprint("tasks", __name__)


@bp_projects.get("")
@jwt_required()
def daftar_projects():
    q = crud.milik_user(Project.query, Project)
    status = request.args.get("status")
    if status:
        q = q.filter_by(status=status)
    q = q.order_by(Project.target_date)
    return {"data": [to_dict(o) for o in q.all()]}


@bp_projects.post("")
@jwt_required()
def buat_project():
    return crud.buat(Project, ProjectSchema)


@bp_projects.get("/<id>")
@jwt_required()
def detail_project(id):
    return crud.detail(Project, id)


@bp_projects.put("/<id>")
@jwt_required()
def ubah_project(id):
    return crud.ubah(Project, ProjectSchema, id)


@bp_projects.delete("/<id>")
@jwt_required()
def hapus_project(id):
    return crud.hapus(Project, id)


@bp_tasks.get("")
@jwt_required()
def daftar_tasks():
    q = crud.milik_user(Task.query, Task)
    for key in ("project_id", "status"):
        val = request.args.get(key)
        if val:
            q = q.filter_by(**{key: val})
    due = request.args.get("due")  # tugas jatuh tempo <= tanggal
    if due:
        q = q.filter(Task.due_date != "", Task.due_date <= due)
    q = q.order_by(Task.sort_order)
    return {"data": [to_dict(o) for o in q.all()]}


@bp_tasks.post("")
@jwt_required()
def buat_task():
    return crud.buat(Task, TaskSchema)


@bp_tasks.put("/<id>")
@jwt_required()
def ubah_task(id):
    return crud.ubah(Task, TaskSchema, id)


@bp_tasks.delete("/<id>")
@jwt_required()
def hapus_task(id):
    return crud.hapus(Task, id)
