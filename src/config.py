import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    PG_HOST = os.getenv("PG_HOST", "localhost")
    PG_PORT = os.getenv("PG_PORT", "5433")
    PG_USER = os.getenv("PG_USER", "postgres")
    PG_PASSWORD = os.getenv("PG_PASSWORD", "postgres")
    PG_DB = os.getenv("PG_NAME", "rag")

    # Build full connection string
    PG_URI = (
        f"postgresql://{PG_USER}:{PG_PASSWORD}"
        f"@{PG_HOST}:{PG_PORT}/{PG_DB}"
    )