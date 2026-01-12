import os
from flask import Blueprint, request, jsonify, make_response
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from src.services.vectorstore import get_vectorstore

upload_bp = Blueprint("upload", __name__)

UPLOAD_DIR = "uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@upload_bp.route("/upload", methods=["POST", "OPTIONS"])
def upload_file():
    # Handle CORS preflight request
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST")
        return response

    if "file" not in request.files:
        response = make_response(jsonify({"error": "File missing"}), 400)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response

    file = request.files["file"]
    filename = file.filename

    # Save uploaded file
    filepath = os.path.join(UPLOAD_DIR, filename)
    file.save(filepath)

    # STEP 1: Load document
    if filename.endswith(".txt"):
        loader = TextLoader(filepath)
    elif filename.endswith(".pdf"):
        loader = PyPDFLoader(filepath)
    else:
        response = make_response(jsonify({"error": "Only .txt or .pdf allowed"}), 400)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response

    docs = loader.load()

    # STEP 2: Split into chunks
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
    chunks = splitter.split_documents(docs)

    # STEP 3: Get vectorstore + embed + store
    vectorstore = get_vectorstore()
    vectorstore.add_documents(chunks)

    response = make_response(jsonify({"message": "File processed & embeddings stored", "filename": filename}))
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response
