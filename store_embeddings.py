import os
import psycopg2
from pgvector.psycopg2 import register_vector
from openai import OpenAI
from dotenv import load_dotenv,find_dotenv
_=load_dotenv(find_dotenv())

OPENAI_API_KEY=os.getenv("OPENAI_API_KEY")
db_params={
    "dbname" : "embeddings",
    "user":"postgres",
    "password":"postgres",
    "host":"localhost",
    "port":"5433"
}

client = OpenAI(api_key=OPENAI_API_KEY)

sentences = [
    "Who is the title winner in IPL 2025",
    "How to make a coffee"
]

conn = psycopg2.connect(**db_params)
register_vector(conn)

cur = conn.cursor()

for text in sentences:
    embedding = client.embeddings.create(
        model = "text-embedding-3-small",
        input = text
    ).data[0].embedding

    cur.execute("INSERT INTO sentences (content,embedding) VALUES (%s,%s)",(text,embedding))

conn.commit()
cur.close()
conn.close()