from marshmallow import Schema, fields, validate

HEX_COLOR = validate.Regexp(r"^#[0-9A-Fa-f]{6}$", error="Warna harus hex #RRGGBB")


class CategorySchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    color = fields.Str(load_default="#6C8CFF", validate=HEX_COLOR)
    sort_order = fields.Int(load_default=0)


class ProjectSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    description = fields.Str(load_default="")
    client = fields.Str(load_default="")
    status = fields.Str(load_default="ide", validate=validate.OneOf(["ide", "berjalan", "ditunda", "selesai"]))
    start_date = fields.Str(load_default="")
    target_date = fields.Str(load_default="")
    value_amount = fields.Int(load_default=None, allow_none=True)
    notes = fields.Str(load_default="")
    category_id = fields.Str(load_default=None, allow_none=True)


class TaskSchema(Schema):
    project_id = fields.Str(load_default=None, allow_none=True)
    category_id = fields.Str(load_default=None, allow_none=True)
    title = fields.Str(required=True, validate=validate.Length(min=1, max=300))
    description = fields.Str(load_default="")
    priority = fields.Str(load_default="sedang", validate=validate.OneOf(["rendah", "sedang", "tinggi"]))
    status = fields.Str(load_default="todo", validate=validate.OneOf(["todo", "doing", "done"]))
    due_date = fields.Str(load_default="")
    sort_order = fields.Int(load_default=0)


class DailyTemplateSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    sort_order = fields.Int(load_default=0)
    is_active = fields.Bool(load_default=True)
    mulai_tanggal = fields.Str(load_default=None, allow_none=True)


class ReminderSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    category = fields.Str(load_default="tagihan", validate=validate.OneOf(["tagihan", "dp_proyek", "langganan", "lainnya"]))
    amount = fields.Int(load_default=None, allow_none=True)
    due_date = fields.Str(required=True)
    repeat_rule = fields.Str(load_default="tidak", validate=validate.OneOf(["tidak", "mingguan", "bulanan", "tahunan"]))
    remind_days_before = fields.Int(load_default=3)
    status = fields.Str(load_default="belum", validate=validate.OneOf(["belum", "lunas"]))
    project_id = fields.Str(load_default=None, allow_none=True)
    notes = fields.Str(load_default="")


class StudyScheduleSchema(Schema):
    topic = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    weekdays = fields.List(fields.Int(validate=validate.Range(min=0, max=6)), required=True)
    start_time = fields.Str(load_default="")
    duration_min = fields.Int(load_default=30, validate=validate.Range(min=1, max=1440))
    goal = fields.Str(load_default="")
    resource_url = fields.Str(load_default="")
    is_active = fields.Bool(load_default=True)


class RegisterSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6, max=128))
    display_name = fields.Str(load_default="")


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)
