from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores.pgvector import PGVector
from flask import current_app

def get_vectorstore():
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=current_app.config["OPENAI_API_KEY"]
    )

    vectorstore = PGVector(
        connection_string=current_app.config["PG_URI"],
        embedding_function=embeddings,
        collection_name="documents",
        distance_strategy="cosine"
    )

    return vectorstore
