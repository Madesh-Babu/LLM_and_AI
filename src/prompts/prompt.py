from langchain_core.prompts import ChatPromptTemplate


prompt = ChatPromptTemplate.from_template("""
Use ONLY the context to answer the question. If user is greet, Greet back to the user.
Context:
{context}

Question:
{question}

Answer:
""")
