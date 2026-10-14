from app.extensions import db
from app.models.base import BaseModel


class DailyTemplate(BaseModel):
    __tablename__ = "daily_templates"

    title = db.Column(db.String(200), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    mulai_tanggal = db.Column(db.String(10), nullable=True, default=None)


class DailyLog(BaseModel):
    __tablename__ = "daily_logs"

    log_date = db.Column(db.String(10), nullable=False, index=True)
    template_id = db.Column(db.String(36), nullable=False)
    is_done = db.Column(db.Boolean, nullable=False, default=False)
    done_at = db.Column(db.String(32), nullable=True, default=None)

    __table_args__ = (
        db.UniqueConstraint("user_id", "log_date", "template_id", name="uq_dailylog_user_date_tpl"),
    )
