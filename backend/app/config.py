"""Application configuration settings."""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Ollama Configuration
    ollama_host: str = "http://localhost:11434"
    llm_model: str = "llama3.2"
    embedding_model: str = "nomic-embed-text"
    
    # LLM Response Configuration
    # Sampling is low by default so answers stay on the documents (WORK-0004).
    # A livelier tone raises the temperature, but never above llm_temperature_max.
    llm_temperature: float = 0.3
    llm_temperature_max: float = 0.8
    llm_num_predict: int = 2048  # Max tokens to generate (controls response length)
    llm_top_k: int = 40
    llm_top_p: float = 0.9

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


# Global settings instance
settings = Settings()
