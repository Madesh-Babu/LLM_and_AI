from src.mock_ragent import (
    WebApp,
    WebFrameworkAdapter,
    WebSocketHandler,
    UniversalSocketIOHandler,
)
from flask import request


# -----------------------------
# WebApp Wrapper (Flask)
# -----------------------------
class FlaskWebApp(WebApp):
    def __init__(self, app):
        self._app = app

    def add_route(self, rule, endpoint, view_func, **options):
        self._app.add_url_rule(rule, endpoint, view_func, **options)

    # 🔥 REQUIRED BY RAGENT (runtime)
    def route(self, rule, **options):
        return self._app.route(rule, **options)

    def run(self, host="0.0.0.0", port=5000, **options):
        self._app.run(host=host, port=port, **options)

    def get_wsgi_app(self):
        return self._app

# -----------------------------
# WebSocket Wrapper (Flask-SocketIO)
# -----------------------------
class FlaskSocketHandler(WebSocketHandler):
    def __init__(self, socketio):
        self._socketio = socketio
        self._handler = UniversalSocketIOHandler(socketio)

    def on(self, event, handler):
        self._handler.on(event, handler)

    def on_error(self, handler):
        # Flask-SocketIO uses 'error' event
        self._handler.on("error", handler)

    def emit(self, event, data=None, **kwargs):
        self._handler.emit(event, data, **kwargs)

    def get_current_client_id(self) -> str:
        # Flask-SocketIO client ID
        return request.sid


# -----------------------------
# Framework Adapter (FULL & CORRECT)
# -----------------------------
class FlaskAdapter(WebFrameworkAdapter):
    def __init__(self, app, socketio, **config):
        self._app = FlaskWebApp(app)
        self._socket = FlaskSocketHandler(socketio)

    # REQUIRED (new)
    def create_app(self, **config) -> WebApp:
        return self._app

    # REQUIRED (new)
    def create_websocket_handler(self, app: WebApp, **kwargs) -> WebSocketHandler:
        return self._socket

    # REQUIRED (old)
    def get_app_instance(self) -> WebApp:
        return self._app

    # REQUIRED (old)
    def get_websocket_handler(self) -> WebSocketHandler:
        return self._socket
