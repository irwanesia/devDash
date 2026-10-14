"""Helper bersama: format error seragam (PRD §7) + serialisasi model."""
from flask import jsonify


def err(code: str, message: str, status: int):
    return jsonify({"error": {"code": code, "message": message}}), status


def to_dict(obj) -> dict:
    data = {}
    for col in obj.__table__.columns:
        data[col.name] = getattr(obj, col.name)
    return data
