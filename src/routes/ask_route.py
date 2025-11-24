from flask import Blueprint, request, jsonify, current_app

ask_bp = Blueprint("ask", __name__)

@ask_bp.route("/ask", methods=["POST"])
def ask():
    rag_chain = current_app.config.get("RAG_CHAIN")

    if rag_chain is None:
        return jsonify({"error": "RAG is not initialized"}), 500

    user_question = request.json.get("question", "")
    answer = rag_chain.invoke(user_question)

    return jsonify({"answer": answer})
