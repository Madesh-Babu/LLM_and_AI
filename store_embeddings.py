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

def split_into_chunks(text,size=500):
    words = text.split()
    chunks = []

    for i in range(0,len(words), size):
        chunk = " ".join(words[i:i+size])
        chunks.append(chunk)
    return chunks

with open('raina.txt','r') as f:
    doc_txt = f.read()

chunks = split_into_chunks(doc_txt)

conn = psycopg2.connect(**db_params)
register_vector(conn)

cur = conn.cursor()

for chunk in chunks:
    embedding = client.embeddings.create(
        model = "text-embedding-3-small",
        input = chunk
    ).data[0].embedding

    cur.execute("INSERT INTO sentences (content,embedding) VALUES (%s,%s)",(chunk,embedding))

conn.commit()
cur.close()
conn.close()