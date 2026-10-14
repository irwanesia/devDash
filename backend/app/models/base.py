"""Kolom umum semua tabel (PRD §6): id UUID string, user_id, created_at, updated_at, deleted_at."""
from datetime import datetime, timezone

from app.extensions import db


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class BaseModel(db.Model):
    __abstract__ = True

    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    created_at = db.Column(db.String(32), nullable=False, default=utcnow_iso)
    updated_at = db.Column(db.String(32), nullable=False, default=utcnow_iso, onupdate=utcnow_iso)
    deleted_at = db.Column(db.String(32), nullable=True, default=None)

    def touch(self) -> None:
        self.updated_at = utcnow_iso()

    def soft_delete(self) -> None:
        self.deleted_at = utcnow_iso()
