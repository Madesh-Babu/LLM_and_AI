# RAG-Based Q&A API

A Flask-based REST API that implements Retrieval-Augmented Generation (RAG) using LangChain, OpenAI embeddings, and PostgreSQL with pgvector for semantic search.

## Features

- Document embedding and storage in PostgreSQL with pgvector
- Semantic search using OpenAI embeddings
- RAG pipeline with GPT-4o-mini for question answering
- RESTful API endpoint for queries
- Automatic context retrieval from stored documents

## Project Structure

```
LEARN_RAG/
├── app/
│   ├── __init__.py          # Flask app initialization
│   ├── config.py            # Configuration management
│   ├── routes/
│   │   └── ask_route.py     # API endpoint for questions
│   ├── services/
│   │   ├── rag_chain.py     # RAG chain construction
│   │   ├── retriever.py     # Document retriever
│   │   └── vectorstore.py   # PGVector store setup
│   └── utils/
│       └── format_docs.py   # Document formatting utilities
├── files/                   # Directory for source documents
│   └── raina.txt
├── scripts/
│   └── store_embeddings.py  # Script to embed and store documents
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

### 1. Embed and Store Documents

Place your text files in the `files/` directory, then run:

```bash
python scripts/store_embeddings.py
```

This will:
- Load all `.txt` files from the `files/` directory
- Split them into chunks (500 chars with 100 char overlap)
- Generate embeddings using OpenAI's `text-embedding-3-small`
- Store them in PostgreSQL with pgvector

### 2. Start the API Server

```bash
python run.py
```

The API will be available at `http://localhost:5000`

### 3. Query the API

Send POST requests to `/ask`:

```bash
curl -X POST http://localhost:5000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is this document about?"}'
```

Response format:
```json
{
  "question": "What is this document about?",
  "answer": "Based on the context provided..."
}
```

## API Endpoints

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
  "question": "Your question here",
  "answer": "AI-generated answer based on retrieved context"
}
```

**Error Response:**
```json
{
  "error": "Question required"
}
```

## Configuration

The application uses the following configuration (in `app/config.py`):

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

