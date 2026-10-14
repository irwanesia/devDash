from flask import Blueprint
from flask_jwt_extended import jwt_required

from app.models.category import Category
from app.models.daily import DailyLog, DailyTemplate
from app.models.project import Project, Task
from app.models.reminder import Reminder
from app.models.study import StudyLog, StudySchedule
from app.routes import crud
from app.routes.common import to_dict

bp = Blueprint("export", __name__)


@bp.get("")
@jwt_required()
def ekspor():
    out = {}
    for nama, model, order in [
        ("categories", Category, Category.sort_order),
        ("projects", Project, Project.target_date),
        ("tasks", Task, Task.sort_order),
        ("daily_templates", DailyTemplate, DailyTemplate.sort_order),
        ("daily_logs", DailyLog, DailyLog.log_date),
        ("reminders", Reminder, Reminder.due_date),
        ("study_schedules", StudySchedule, StudySchedule.start_time),
        ("study_logs", StudyLog, StudyLog.log_date),
    ]:
        q = crud.milik_user(model.query, model).order_by(order)
        out[nama] = [to_dict(o) for o in q.all()]
    return {"data": out}
