from flask import Blueprint, request, jsonify, current_app, make_response
from dotenv import load_dotenv
import os

load_dotenv()

ask_bp = Blueprint("ask", __name__)

@ask_bp.route("/ask", methods=["POST", "OPTIONS"])
def ask():
    """The /ask endpoint to handle user questions and return answers using RAG."""
    
    # Handle CORS preflight request
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST")
        return response

    rag_chain = current_app.config.get("RAG_CHAIN")

    if rag_chain is None:
        response = make_response(jsonify({"error": "RAG is not initialized"}), 500)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response

    user_question = request.json.get("question", "")
    answer = rag_chain.invoke(user_question)

    response = make_response(jsonify({"answer": answer}))
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response