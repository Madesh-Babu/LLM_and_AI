from flask import Flask, send_from_directory
from flask_cors import CORS
from .config import Config
import os

def create_app():
    # Get the parent directory (project root)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    static_folder = os.path.join(base_dir, 'static')

    app = Flask(__name__, static_folder=static_folder, static_url_path='/static')
    app.config.from_object(Config)

    # Enable CORS for all routes
    CORS(app, resources={
        r"/*": {
            "origins": ["http://localhost:5000", "http://127.0.0.1:5000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]
        }
    })

    # Register blueprints
    from .routes.ask_route import ask_bp
    from .routes.upload_route import upload_bp

    app.register_blueprint(ask_bp)
    app.register_blueprint(upload_bp)

    # Serve the frontend
    @app.route('/')
    def index():
        return send_from_directory(static_folder, 'index.html')

    return app
