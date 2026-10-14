from app.extensions import db
from app.models.base import BaseModel


class StudySchedule(BaseModel):
    __tablename__ = "study_schedules"

    topic = db.Column(db.String(200), nullable=False)
    weekdays = db.Column(db.JSON, nullable=False, default=list)  # array 0-6
    start_time = db.Column(db.String(5), nullable=False, default="")
    duration_min = db.Column(db.Integer, nullable=False, default=30)
    goal = db.Column(db.Text, nullable=False, default="")
    resource_url = db.Column(db.String(500), nullable=False, default="")
    is_active = db.Column(db.Boolean, nullable=False, default=True)


class StudyLog(BaseModel):
    __tablename__ = "study_logs"

    schedule_id = db.Column(db.String(36), nullable=False)
    log_date = db.Column(db.String(10), nullable=False, index=True)
    is_done = db.Column(db.Boolean, nullable=False, default=False)
    done_at = db.Column(db.String(32), nullable=True, default=None)

    __table_args__ = (
        db.UniqueConstraint("user_id", "schedule_id", "log_date", name="uq_studylog_user_sched_date"),
    )
