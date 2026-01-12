# from src import create_app
# from src.services.rag_chain import build_rag_chain

# app = create_app()

# with app.app_context():
#     rag_chain = build_rag_chain()
#     app.config["RAG_CHAIN"] = rag_chain
#     print("RAG INITIALIZED:", rag_chain)

# if __name__ == "__main__":
#     app.run(debug=True)






# from flask import Flask
# from flask_socketio import SocketIO

# from src.routes.ask_route import ask_bp
# from src.routes.upload_route import upload_bp
# from src.r_agent import init_ragent

# app = Flask(__name__)
# app.register_blueprint(ask_bp)
# app.register_blueprint(upload_bp)

# socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# # 🔥 ragent init
# init_ragent(app, socketio)

# if __name__ == "__main__":
#     socketio.run(app, host="0.0.0.0", port=5000)




from flask_socketio import SocketIO
from src import create_app
from src.services.rag_chain import build_rag_chain
from src.r_agent import init_ragent

# 1️⃣ Create Flask app
app = create_app()

# 2️⃣ Initialize RAG once
with app.app_context():
    rag_chain = build_rag_chain()
    app.config["RAG_CHAIN"] = rag_chain
    print("RAG INITIALIZED:", rag_chain)

# 3️⃣ Attach Socket.IO (required by ragent)
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="eventlet"
)

# 4️⃣ Initialize ragent voice gateway
init_ragent(app, socketio)

# 5️⃣ Run server
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
