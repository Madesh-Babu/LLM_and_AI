from flask import Flask
from .config import Config
from .services.rag_chain import build_rag_chain

rag_chain = None   # global container

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    global rag_chain
    with app.app_context():
        rag_chain = build_rag_chain()

    from .routes.ask_route import ask_bp
    app.register_blueprint(ask_bp)

    return app
