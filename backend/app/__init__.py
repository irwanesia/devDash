from flask import Flask

from app.config import Config
from app.extensions import cors, db, jwt, migrate


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    # JWT pakai detik (konversi dari config menit/hari)
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = config_class.JWT_ACCESS_TOKEN_EXPIRES
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = config_class.JWT_REFRESH_TOKEN_EXPIRES

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, origins=config_class.CORS_ORIGINS)

    # Model harus diimpor agar migrasi mendeteksinya
    from app.models import category, daily, project, reminder, study, user  # noqa: F401

    from app.routes import auth, categories, daily as daily_r, export, projects, reminders, study as study_r, sync as sync_r

    app.register_blueprint(auth.bp, url_prefix="/api/auth")
    app.register_blueprint(categories.bp, url_prefix="/api/categories")
    app.register_blueprint(projects.bp_projects, url_prefix="/api/projects")
    app.register_blueprint(projects.bp_tasks, url_prefix="/api/tasks")
    app.register_blueprint(daily_r.bp, url_prefix="/api/daily")
    app.register_blueprint(reminders.bp, url_prefix="/api/reminders")
    app.register_blueprint(study_r.bp, url_prefix="/api/study")
    app.register_blueprint(export.bp, url_prefix="/api/export")
    app.register_blueprint(sync_r.bp, url_prefix="/api/sync")

    @app.get("/api/health")
    def health():
        return {"ok": True}

    @jwt.expired_token_loader
    def expired(_h, _p):
        return {"error": {"code": "token_kadaluarsa", "message": "Token kadaluarsa"}}, 401

    @jwt.invalid_token_loader
    def invalid(_m):
        return {"error": {"code": "token_tak_valid", "message": "Token tidak valid"}}, 422

    @jwt.unauthorized_loader
    def unauthorized(_m):
        return {"error": {"code": "butuh_login", "message": "Butuh header Authorization: Bearer <token>"}}, 401

    return app
