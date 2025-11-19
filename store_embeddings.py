import os
import psycopg2
from pgvector.psycopg2 import register_vector
from openai import OpenAI
from dotenv import load_dotenv,find_dotenv
from langchain_community.document_loaders import DirectoryLoader,TextLoader,PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
_=load_dotenv(find_dotenv())

OPENAI_API_KEY=os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)
print(client)

#For load the text file
def load_documents():
    loader = DirectoryLoader(
        path = "files/",
        loader_cls=TextLoader,
        glob="**/*.pdf"
    )
    docs=loader.load()
    return docs

#For load the PDF
# def load_documents():
#     loader = DirectoryLoader(
#         path = "files/",
#         loader_cls=PyPDFLoader,
#         glob="**/*.pdf"
#     )
#     docs=loader.load()
#     return docs



def split_documents(docs):
    splitter = RecursiveCharacterTextSplitter(chunk_size = 500, chunk_overlap = 50)
    chunks = splitter.split_documents(docs)
    return chunks

def embed_text(text):
    response = client.embeddings.create(model= "text-embedding-3-small",input = text)
    return response.data[0].embedding

def connect_db():
    conn = psycopg2.connect(
        database= "rag",
        user="postgres",
        password="postgres",
        host="localhost",
        port="5433"
    )
    return conn

def insert_embedding(conn,text,embedding):
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO  documents (chunk_text,embedding) VALUES (%s,%s)",(text,embedding)
    )
    conn.commit()
    cur.close()


def main():
    print("Loading documents...")
    docs = load_documents()

    print("Splitting into chunks...")
    chunks = split_documents(docs)
    print(f"Total Chunks: {len(chunks)}")

    conn = connect_db()

    for idx, chunk in enumerate(chunks):
        text = chunk.page_content
        print(f"Embedding chunk {idx+1}/{len(chunks)}")

        embedding = embed_text(text)   # list of floats

        insert_embedding(conn, text, embedding)

    conn.close()
    print("All embeddings stored successfully ")

if __name__ == "__main__":
    main()