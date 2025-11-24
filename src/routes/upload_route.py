import os
from flask import Blueprint, request, jsonify
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from src.services.vectorstore import get_vectorstore

upload_bp = Blueprint("upload", __name__)

UPLOAD_DIR = "uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@upload_bp.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "File missing"}), 400

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
        return jsonify({"error": "Only .txt or .pdf allowed"}), 400

    docs = loader.load()

    # STEP 2: Split into chunks
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
    chunks = splitter.split_documents(docs)

    # STEP 3: Get vectorstore + embed + store
    vectorstore = get_vectorstore()
    vectorstore.add_documents(chunks)

    return jsonify({"message": "File processed & embeddings stored", "filename": filename})
