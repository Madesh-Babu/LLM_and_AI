import os
import psycopg2
from flask import Flask, request, jsonify
from pgvector.psycopg2 import register_vector
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

db_params = {
    "dbname": "embeddings",
    "user": "postgres",
    "password": "postgres",
    "host": "localhost",
    "port": "5433"
}

app = Flask(__name__)


@app.route("/ask", methods=["POST"])
def ask():
    question = request.json.get("question")

    # 1. Create embedding for question
    query_emb = client.embeddings.create(
        model="text-embedding-3-small",
        input=question
    ).data[0].embedding

    # 2. Vector search in Postgres
    conn = psycopg2.connect(**db_params)
    register_vector(conn)
    cur = conn.cursor()

    # FIXED QUERY
    cur.execute("""
        SELECT content, embedding <-> %s::vector AS distance
        FROM sentences
        ORDER BY distance ASC
        LIMIT 3;
    """, (query_emb,))

    rows = cur.fetchall()

    cur.close()
    conn.close()

    # Combine results
    contexts = "\n\n".join([row[0] for row in rows])

    # 3. Ask OpenAI with context
    prompt = f"""
    You are a friendly assistant. Use the context to answer the question. Greet back the user if greeted

    CONTEXT:
    {contexts}

    QUESTION:
    {question}

    Answer from the context only.
    """

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    answer = response.choices[0].message.content
    return jsonify({"answer": answer, "context_used": contexts})

if __name__ == "__main__":
    app.run(debug=True)
