"""FastAPI application entry point."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import documents, chat
from app.models.schemas import HealthResponse
from app.core.logging import logger

# Create FastAPI app
app = FastAPI(
    title="RAG Document Q&A API",
    description="Upload documents and ask questions using RAG (Retrieval-Augmented Generation)",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite & CRA defaults
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    """Log startup information."""
    logger.info("🚀 RAG Document Q&A API starting up...")
    logger.info("📚 Supported file types: PDF, TXT, MD, DOCX, HTML")
    logger.info("📖 API docs available at /docs")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."}
    )


@app.get("/", response_model=HealthResponse, tags=["health"])
async def root():
    """Health check endpoint."""
    return HealthResponse()


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse()
