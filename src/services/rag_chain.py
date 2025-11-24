from .retriever import get_retriever
from src.utils.format_docs import format_docs
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from flask import current_app
from src.prompts.prompt import prompt

def build_rag_chain():
    retriever = get_retriever()

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=current_app.config["OPENAI_API_KEY"]
    )

    chain = (
        RunnableParallel({
            "context": retriever | format_docs,
            "question": RunnablePassthrough()
        })
        | prompt
        | llm
        | StrOutputParser()
    )

    return chain
