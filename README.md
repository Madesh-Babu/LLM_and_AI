# RAG-Based Q&A System

A full-stack application that implements Retrieval-Augmented Generation (RAG) using LangChain, OpenAI embeddings, and PostgreSQL with pgvector for semantic search. Features a modern web interface for document upload and interactive Q&A.

## Features

- **Modern Web Interface**: Beautiful, responsive UI for document upload and chat-based Q&A
- **Document Upload**: Support for TXT and PDF file uploads with real-time processing
- **Semantic Search**: Vector-based document retrieval using OpenAI embeddings
- **RAG Pipeline**: GPT-4o-mini powered question answering with context
- **Voice Integration**: Real-time voice Q&A using Ragent voice gateway
- **RESTful API**: Backend API endpoints for programmatic access
- **Chat History**: Persistent chat history stored in browser
- **Real-time Feedback**: Live status updates for uploads and responses

## Project Structure

```
learning_api_key/
├── static/                   # Frontend files
│   ├── index.html           # Main web interface
│   ├── css/
│   │   └── style.css        # UI styling
│   └── js/
│       └── app.js           # Frontend logic and API calls
├── src/
│   ├── __init__.py          # Flask app initialization
│   ├── config.py            # Configuration management
│   ├── adapter.py           # Ragent Flask integration
│   ├── r_agent.py           # Ragent voice gateway setup
│   ├── transcript.py        # Voice callback handler
│   ├── routes/
│   │   ├── ask_route.py     # API endpoint for questions
│   │   └── upload_route.py  # API endpoint for file uploads
│   ├── services/
│   │   ├── rag_chain.py     # RAG chain construction
│   │   ├── retriever.py     # Document retriever
│   │   └── vectorstore.py   # PGVector store setup
│   ├── utils/
│   │   └── format_docs.py   # Document formatting utilities
│   └── prompts/
│       └── prompt.py        # ChatPromptTemplate definition
├── uploaded_files/          # Storage for uploaded documents
├── .env                     # Environment variables
├── run.py                   # Application entry point
└── requirements.txt         # Python dependencies
```

## Prerequisites

- Python 3.8+
- PostgreSQL with pgvector extension
- OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd LEARN_RAG
```

2. Create and activate a virtual environment:
```bash
python -m venv .env
source .env/bin/activate  # On Windows: .env\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up PostgreSQL with pgvector:
```sql
CREATE EXTENSION vector;
```

5. Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
PG_CONNECTION_STRING=postgresql://username:password@localhost:5432/your_database
```

## Usage

### 1. Start the Server

```bash
python run.py
```

The server will start on `http://0.0.0.0:5000`

### 2. Using the Web Interface

1. Open your browser and navigate to `http://localhost:5000`
2. You'll see the RAG Q&A System interface with two main sections:
   - **Upload Documents**: Drag & drop or select TXT/PDF files to upload
   - **Ask Questions**: Chat interface to ask questions about your documents

#### Uploading Documents

- Click the upload area or drag & drop your file
- Supported formats: PDF, TXT (max 10MB)
- Files are automatically processed and embedded
- You'll see a success message when ready

#### Asking Questions

- Type your question in the chat input
- Press Enter or click the send button
- The AI will respond based on your uploaded documents
- Chat history is saved automatically in your browser

### 3. Using the API Directly

You can also interact with the backend API programmatically:

#### Upload a Document

```bash
curl -X POST http://localhost:5000/upload \
  -F "file=@/path/to/your/document.pdf"
```

#### Ask a Question

```bash
curl -X POST http://localhost:5000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is this document about?"}'
```

Response format:
```json
{
  "answer": "Based on the context provided..."
}
```

## API Endpoints

### GET /

Serves the main web interface.

### POST /upload

Upload and process a document (TXT or PDF).

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- Supported formats: `.txt`, `.pdf`
- Max size: 10MB (frontend validation)

**Response:**
```json
{
  "message": "File processed & embeddings stored",
  "filename": "document.pdf"
}
```

**Error Response:**
```json
{
  "error": "Only .txt or .pdf allowed"
}
```

### POST /ask

Ask a question and get an answer based on stored documents.

**Request Body:**
```json
{
  "question": "Your question here"
}
```

**Response:**
```json
{
  "answer": "AI-generated answer based on retrieved context"
}
```

**Error Response:**
```json
{
  "error": "RAG is not initialized"
}
```

## Configuration

The application uses the following configuration (in `src/config.py`):

- `OPENAI_API_KEY`: Your OpenAI API key
- `PG_URI`: PostgreSQL connection string

## RAG Pipeline

The RAG chain performs the following steps:

1. **Retrieval**: Retrieves top 20 most relevant document chunks using cosine similarity
2. **Context Formatting**: Formats retrieved documents into context
3. **Prompt Construction**: Creates a prompt with context and question
4. **Generation**: Uses GPT-4o-mini to generate an answer
5. **Output Parsing**: Extracts the final answer as a string

## Dependencies

Key dependencies include:
- Flask
- LangChain
- OpenAI
- pgvector
- python-dotenv

See `requirements.txt` for the complete list.

## Notes

- The retriever fetches the top 20 most similar chunks (configurable in `retriever.py`)
- Document chunks are 500 characters with 100 character overlap
- The system includes basic harmful content filtering in the prompt
- Debug mode is enabled by default in `run.py` (disable for production)

## Security Considerations

- Never commit your `.env` file
- Disable debug mode in production
- Use environment variables for sensitive data
- Implement proper authentication for production use

