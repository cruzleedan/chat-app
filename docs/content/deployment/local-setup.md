# Local Setup

Step-by-step guide to set up the RAG Document Q&A application on your local machine.

## Prerequisites

### Required Software

| Software  | Version | Purpose          |
| --------- | ------- | ---------------- |
| Python    | 3.9+    | Backend runtime  |
| Node.js   | 18+     | Frontend build   |
| Ollama    | Latest  | Local LLM server |
| Tesseract | 5.x     | OCR for images   |

### Installation

=== "macOS"

    ```bash
    # Install Homebrew if not installed
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Install dependencies
    brew install python@3.11 node ollama tesseract

    # Start Ollama service
    brew services start ollama
    ```

=== "Ubuntu/Debian"

    ```bash
    # Update package list
    sudo apt update

    # Install Python and Node.js
    sudo apt install python3.11 python3.11-venv nodejs npm

    # Install Tesseract
    sudo apt install tesseract-ocr

    # Install Ollama
    curl -fsSL https://ollama.com/install.sh | sh
    ```

=== "Windows"

    ```powershell
    # Install using winget
    winget install Python.Python.3.11
    winget install OpenJS.NodeJS.LTS
    winget install Tesseract-OCR.Tesseract-OCR

    # Install Ollama from https://ollama.com/download/windows
    ```

### Pull Required Models

```bash
# Language model for chat
ollama pull llama3.2

# Embedding model for vector search
ollama pull nomic-embed-text

# Verify models are installed
ollama list
```

---

## Backend Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/rag-research.git
cd rag-research
```

### 2. Create Virtual Environment

=== "uv (Recommended)"

    ```bash
    cd backend

    # Install uv if not installed
    pip install uv

    # Create and activate virtual environment
    uv venv
    source .venv/bin/activate  # macOS/Linux
    # .venv\Scripts\activate   # Windows
    ```

=== "venv"

    ```bash
    cd backend

    # Create virtual environment
    python -m venv .venv
    source .venv/bin/activate  # macOS/Linux
    # .venv\Scripts\activate   # Windows
    ```

### 3. Install Dependencies

```bash
# Using uv
uv pip install -r requirements.txt

# Or using pip
pip install -r requirements.txt
```

### 4. Create Data Directories

```bash
mkdir -p data/uploads data/chroma data/conversations
```

### 5. Environment Configuration (Optional)

Create `.env` file for custom configuration:

```bash
# .env
OLLAMA_MODEL=llama3.2
EMBEDDING_MODEL=nomic-embed-text
CHROMA_PATH=./data/chroma
UPLOAD_PATH=./data/uploads
MAX_FILE_SIZE=52428800
```

### 6. Start Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345]
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 7. Verify Backend

```bash
# Health check
curl http://localhost:8000/api/health

# Should return: {"status": "healthy"}
```

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

**Expected output:**

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h + enter to show help
```

### 3. Open Application

Navigate to `http://localhost:5173` in your browser.

---

## Verify Installation

### Checklist

- [ ] Backend running on `http://localhost:8000`
- [ ] Frontend running on `http://localhost:5173`
- [ ] Ollama running with `llama3.2` and `nomic-embed-text` models
- [ ] Can upload a document
- [ ] Can ask questions and receive responses
- [ ] Streaming responses work

### Test Upload

1. Open `http://localhost:5173`
2. Click "browse" or drag a PDF/text file
3. Wait for processing (shows chunk count when done)

### Test Chat

1. Type a question about your uploaded document
2. Press Enter or click Send
3. Verify streaming response appears
4. Check that sources are shown

---

## Troubleshooting

### Backend Issues

#### "Module not found" errors

```bash
# Ensure virtual environment is activated
source .venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

#### "Connection refused" to Ollama

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve
```

#### ChromaDB permission errors

```bash
# Ensure data directory exists and is writable
mkdir -p data/chroma data/uploads data/conversations
chmod -R 755 data/
```

### Frontend Issues

#### "CORS error" in browser

Ensure backend is running with CORS enabled:

```python
# app/main.py should have:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### "Network error" on API calls

```bash
# Verify backend is accessible
curl http://localhost:8000/api/documents

# Check backend logs for errors
```

### OCR Issues

#### "Tesseract not found"

=== "macOS"

    ```bash
    brew install tesseract
    ```

=== "Ubuntu"

    ```bash
    sudo apt install tesseract-ocr
    ```

=== "Windows"

    Download from: https://github.com/UB-Mannheim/tesseract/wiki

#### Poor OCR quality

- Ensure image is high resolution
- Check image contrast
- Try preprocessing with PIL

---

## Development Workflow

### Backend with Auto-Reload

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Changes to Python files automatically reload the server.

### Frontend with Hot Module Replacement

```bash
cd frontend
npm run dev
```

Changes to React components appear instantly.

### Running Both

Use two terminal windows or a process manager:

=== "Two Terminals"

    ```bash
    # Terminal 1 - Backend
    cd backend && source .venv/bin/activate && uvicorn app.main:app --reload

    # Terminal 2 - Frontend
    cd frontend && npm run dev
    ```

=== "Using concurrently"

    ```bash
    # Install concurrently
    npm install -g concurrently

    # Run both
    concurrently "cd backend && source .venv/bin/activate && uvicorn app.main:app --reload" "cd frontend && npm run dev"
    ```

---

## Next Steps

- [Production Deployment](production.md) - Deploy to production
- [API Documentation](../api/overview.md) - Explore the API
- [Architecture](../architecture/overview.md) - Understand the system design
