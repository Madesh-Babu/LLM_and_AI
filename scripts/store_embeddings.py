from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores.pgvector import PGVector
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import os
from flask import current_app
from dotenv import load_dotenv,find_dotenv

load_dotenv(find_dotenv())

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

connection_string = os.getenv("PG_CONNECTION_STRING")

def main():
    print("Loading documents...")
    loader = DirectoryLoader("files/", glob="**/*.txt", loader_cls=TextLoader)
    docs = loader.load()

    print("Splitting chunks...")
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
    chunks = splitter.split_documents(docs)

    print("Creating vectorstore...")
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    vectorstore = PGVector(
        connection_string=connection_string,
        collection_name="documents",
        embedding_function=embeddings,
    )

    print("Adding documents...")
    vectorstore.add_documents(chunks)

    print("DONE — Stored into LangChain PGVector collection")

if __name__ == "__main__":
    main()
