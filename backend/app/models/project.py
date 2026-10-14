from app.extensions import db
from app.models.base import BaseModel


class Project(BaseModel):
    __tablename__ = "projects"

    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    client = db.Column(db.String(200), nullable=False, default="")
    status = db.Column(db.String(16), nullable=False, default="ide")  # ide|berjalan|ditunda|selesai
    start_date = db.Column(db.String(10), nullable=False, default="")
    target_date = db.Column(db.String(10), nullable=False, default="")
    value_amount = db.Column(db.Integer, nullable=True, default=None)
    notes = db.Column(db.Text, nullable=False, default="")
    category_id = db.Column(db.String(36), nullable=True, default=None)


class Task(BaseModel):
    __tablename__ = "tasks"

    project_id = db.Column(db.String(36), nullable=True, default=None, index=True)
    category_id = db.Column(db.String(36), nullable=True, default=None)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    priority = db.Column(db.String(16), nullable=False, default="sedang")
    status = db.Column(db.String(16), nullable=False, default="todo", index=True)
    due_date = db.Column(db.String(10), nullable=False, default="")
    sort_order = db.Column(db.Integer, nullable=False, default=0)
