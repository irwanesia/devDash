from app.extensions import db
from app.models.base import BaseModel


class Category(BaseModel):
    __tablename__ = "categories"

    name = db.Column(db.String(120), nullable=False)
    color = db.Column(db.String(16), nullable=False, default="#6C8CFF")
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    __table_args__ = (db.UniqueConstraint("user_id", "name", name="uq_category_user_name"),)
