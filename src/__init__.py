from flask import Flask
from .config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    from .routes.ask_route import ask_bp
    from .routes.upload_route import upload_bp

    app.register_blueprint(ask_bp)
    app.register_blueprint(upload_bp)

    return app
