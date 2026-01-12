import os
import psycopg2
from flask import Flask, request, jsonify, render_template, send_from_directory
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores.pgvector import PGVector
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from werkzeug.utils import secure_filename
import PyPDF2

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

app = Flask(__name__, static_folder='static', static_url_path='/static')

# Serve the main page
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# Serve static files
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

# File upload configuration
UPLOAD_FOLDER = 'uploaded_files'
ALLOWED_EXTENSIONS = {'txt', 'pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_file(file_path):
    """Extract text from uploaded file"""
    try:
        if file_path.endswith('.pdf'):
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text()
                return text
        elif file_path.endswith('.txt'):
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
    except Exception as e:
        print(f"Error extracting text: {e}")
        return None

# File upload endpoint
@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Only .txt or .pdf files are allowed'}), 400
        
        # Save file
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Extract and process text
        text_content = extract_text_from_file(file_path)
        if text_content is None:
            return jsonify({'error': 'Failed to extract text from file'}), 400
        
        # For now, just return success (in a full implementation, you would store this in the vector DB)
        return jsonify({
            'message': 'File uploaded and processed successfully',
            'filename': filename,
            'text_length': len(text_content)
        })
        
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({'error': 'File upload failed'}), 500


# Build Vectorstore

def get_vectorstore():
    connection_string = "postgresql://postgres:postgres@localhost:5433/rag"

    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=OPENAI_API_KEY
    )

    vectorstore = PGVector(
        connection_string=connection_string,
        embedding_function=embeddings,
        collection_name="documents",
        distance_strategy="cosine"
    )
    print("vvv",vectorstore)
    return vectorstore


# Build Retriever

def get_retriever():
    vectorstore = get_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": 20})
    return retriever


# Build RAG Chain (LCEL)

def build_rag_chain():
    retriever = get_retriever()

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=OPENAI_API_KEY
    )

    prompt = ChatPromptTemplate.from_template("""
You are a helpful AI assistant.
Use ONLY the following context to answer the question.

Context:
{context}

Question:
{question}

Answer:
""")
    
    def format_docs(docs):
        return "\n\n".join([d.page_content for d in docs])


    chain = (
        RunnableParallel(
            {
                "context": retriever | format_docs,       # Retrieve top chunks
                "question": RunnablePassthrough()   # Forward user’s question
            }
        )
        | prompt    # Inject into the formatted prompt
        | llm       # Call the model
        | StrOutputParser()  # Return clean string
    )

    return chain


rag_chain = build_rag_chain()   # build chain ONCE only (recommended)



# POST /ask endpoint

@app.route("/ask", methods=["POST"])
def ask():
    question = request.json.get("question", "")

    if not question:
        return jsonify({"error": "No question provided"}), 400

    print("Received question:", question)

    # Run full LCEL RAG chain
    answer = rag_chain.invoke(question)

    return jsonify({
        "question": question,
        "answer": answer
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
