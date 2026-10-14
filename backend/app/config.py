import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-ganti-di-prod")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///devdash.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "ganti-dengan-string-acak-panjang")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get("JWT_ACCESS_MINUTES", "15")) * 60
    JWT_REFRESH_TOKEN_EXPIRES = int(os.environ.get("JWT_REFRESH_DAYS", "30")) * 86400
    _cors_raw = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173").strip()
    # "*" = izinkan semua origin (dev/tunnel; JANGAN dipakai bila data sensitif multipengguna)
    CORS_ORIGINS = (
        "*"
        if _cors_raw == "*"
        else [o.strip() for o in _cors_raw.split(",") if o.strip()]
    )
