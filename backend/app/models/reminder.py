from app.extensions import db
from app.models.base import BaseModel


class Reminder(BaseModel):
    __tablename__ = "reminders"

    title = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(16), nullable=False, default="tagihan")
    amount = db.Column(db.Integer, nullable=True, default=None)
    due_date = db.Column(db.String(10), nullable=False, default="", index=True)
    repeat_rule = db.Column(db.String(16), nullable=False, default="tidak")
    remind_days_before = db.Column(db.Integer, nullable=False, default=3)
    status = db.Column(db.String(16), nullable=False, default="belum", index=True)
    paid_at = db.Column(db.String(32), nullable=True, default=None)
    project_id = db.Column(db.String(36), nullable=True, default=None)
    notes = db.Column(db.Text, nullable=False, default="")
