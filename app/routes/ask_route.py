from flask import Blueprint, request, jsonify
from app import rag_chain

ask_bp = Blueprint("ask", __name__)

@ask_bp.route("/ask", methods=["POST"])
def ask_question():
    question = request.json.get("question")

    if not question:
        return jsonify({"error": "Question required"}), 400

    answer = rag_chain.invoke(question)

    return jsonify({"question": question, "answer": answer})
