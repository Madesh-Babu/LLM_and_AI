from flask_socketio import SocketIO
from app import app

# Attach Socket.IO for future voice features
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="eventlet"
)

# Run server
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
