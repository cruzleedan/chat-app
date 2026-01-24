"""Application configuration settings."""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Ollama Configuration
    ollama_host: str = "http://localhost:11434"
    llm_model: str = "llama3.2"
    embedding_model: str = "nomic-embed-text"

    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k_results: int = 4

    # Paths (relative to backend directory)
    upload_dir: str = "data/uploads"
    chroma_dir: str = "data/chroma"

    @property
    def upload_path(self) -> Path:
        """Get absolute path for uploads directory."""
        path = Path(__file__).parent.parent / self.upload_dir
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def chroma_path(self) -> Path:
        """Get absolute path for ChromaDB directory."""
        path = Path(__file__).parent.parent / self.chroma_dir
        path.mkdir(parents=True, exist_ok=True)
        return path

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()
