from src import create_app
from src.services.rag_chain import build_rag_chain

app = create_app()

with app.app_context():
    rag_chain = build_rag_chain()
    app.config["RAG_CHAIN"] = rag_chain
    print("RAG INITIALIZED:", rag_chain)

if __name__ == "__main__":
    app.run(debug=True)
