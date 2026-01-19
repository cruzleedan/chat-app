# RAG Document Q&A App - Implementation Plan

## Project Overview

Build a full-stack Retrieval-Augmented Generation (RAG) application that allows users to upload documents and ask questions about them using natural language.

## Tech Stack

| Layer               | Technology                      | Purpose                         |
| ------------------- | ------------------------------- | ------------------------------- |
| **Frontend**        | React + TypeScript              | Modern, type-safe UI            |
| **UI Framework**    | Tailwind CSS                    | Rapid styling                   |
| **Backend**         | FastAPI (Python)                | High-performance async API      |
| **RAG Framework**   | LangChain                       | Document processing & retrieval |
| **Vector Database** | ChromaDB                        | Store & query embeddings        |
| **LLM**             | Ollama (llama3.2) - local       | Generate responses              |
| **Embeddings**      | nomic-embed-text (via Ollama)   | Document vectorization          |
| **File Storage**    | Local filesystem                | Store uploaded documents        |
| **Deployment**      | Docker Compose on Ubuntu Server | Homelab hosting                 |

---

## Phase 1: Core RAG Backend 🔧

**Goal:** Build a working RAG pipeline that can ingest documents and answer questions via API.

### Tasks

- [x] **1.1 Project Setup**
  - Initialize Python project with `uv` or `poetry`
  - Set up project structure
  - Configure environment variables (.env)
  - Install dependencies (langchain, chromadb, fastapi, etc.)

- [x] **1.2 Document Ingestion Pipeline**
  - Implement PDF loader (PyPDF2 or pdfplumber)
  - Implement text/markdown loader
  - Create chunking strategy (RecursiveCharacterTextSplitter)
  - Configure chunk size and overlap parameters

- [x] **1.3 Vector Store Setup**
  - Initialize ChromaDB persistent storage
  - Create embedding function with OpenAI
  - Implement document indexing logic
  - Add metadata storage (filename, page number, etc.)

- [x] **1.4 Retrieval & Generation**
  - Build retriever with similarity search
  - Create RAG prompt template
  - Implement QA chain with LangChain
  - Add source citation to responses

- [x] **1.5 FastAPI Endpoints**
  - `POST /documents/upload` - Upload and index documents
  - `GET /documents` - List indexed documents
  - `DELETE /documents/{id}` - Remove document from index
  - `POST /chat` - Ask questions and get answers

- [x] **1.6 Testing & Validation**
  - Test with sample PDFs
  - Validate retrieval quality
  - Test API endpoints with Swagger UI

### Deliverables

- Working API with Swagger documentation
- Documents can be uploaded and queried
- Responses include source citations

---

## Phase 2: Enhanced Backend Features 🚀

**Goal:** Improve RAG quality and add production-ready features.

### Tasks

- [ ] **2.1 Improved Chunking**
  - Experiment with different chunk sizes
  - Implement semantic chunking (optional)
  - Add support for tables and images (if needed)

- [ ] **2.2 Advanced Retrieval**
  - Implement hybrid search (keyword + semantic)
  - Add reranking with cross-encoder (optional)
  - Tune number of retrieved chunks (top_k)

- [x] **2.3 Conversation Memory**
  - Add chat history support
  - Implement conversation buffer memory
  - Enable follow-up questions

- [x] **2.4 Multiple File Types**
  - Add Word document support (.docx)
  - Add HTML/web page support
  - Add plain text support

- [x] **2.5 Error Handling & Logging**
  - Structured logging with loguru
  - Proper error responses
  - Input validation with Pydantic

- [x] **2.6 API Improvements**
  - Add streaming responses (SSE)
  - Implement rate limiting (skipped)
  - Add API key authentication (optional, skipped)

### Deliverables

- Higher quality responses
- Chat history support
- Multiple document formats supported
- Production-ready error handling

---

## Phase 3: React Frontend 🎨

**Goal:** Build a modern chat interface for interacting with the RAG system.

### Tasks

- [x] **3.1 Project Setup**
  - Initialize React + TypeScript with Vite
  - Configure Tailwind CSS
  - Set up project structure (components, hooks, services)
  - Configure API client (axios or fetch)

- [x] **3.2 Layout & Navigation**
  - Create main app layout
  - Sidebar for document management
  - Main chat area
  - Responsive design

- [x] **3.3 Document Management UI**
  - File upload component (drag & drop)
  - Document list with status indicators
  - Delete document functionality
  - Upload progress indicator

- [x] **3.4 Chat Interface**
  - Message list component
  - User/Assistant message bubbles
  - Input field with send button
  - Loading/typing indicator

- [x] **3.5 Source Citations UI**
  - Display sources with responses
  - Expandable source previews
  - Link to original document/page

- [x] **3.6 State Management**
  - Chat history state
  - Document list state
  - Loading/error states
  - Consider Zustand or React Context

### Deliverables

- Functional chat UI
- Document upload and management
- Source citations displayed
- Responsive design

---

## Phase 4: Integration & Polish ✨

**Goal:** Connect frontend to backend and polish the user experience.

### Tasks

- [x] **4.1 API Integration**
  - Connect upload flow to backend
  - Connect chat to `/chat` endpoint
  - Handle streaming responses (if implemented)
  - Error handling and display

- [x] **4.2 UX Improvements**
  - Add keyboard shortcuts (Enter to send, Shift+Enter for new line, Escape to clear)
  - Auto-scroll to new messages
  - Copy message functionality
  - Clear chat history option (New Conversation button)

- [x] **4.3 Visual Polish**
  - Loading skeletons
  - Animations and transitions
  - Dark mode support
  - Empty states and onboarding

- [ ] **4.4 Performance**
  - Optimize re-renders
  - Lazy loading for document list
  - Debounce API calls where needed

- [ ] **4.5 Testing**
  - End-to-end testing with sample documents
  - Cross-browser testing
  - Mobile responsiveness testing

### Deliverables

- Fully integrated application
- Polished user experience
- Ready for demo/use

---

## Phase 5: Homelab Deployment (Ubuntu Server) 🏭

**Goal:** Deploy the application on a homelab Ubuntu server for personal/local network use.

### Target Environment

| Component      | Specification                                                    |
| -------------- | ---------------------------------------------------------------- |
| **OS**         | Ubuntu Server (22.04 LTS or newer)                               |
| **Deployment** | Docker Compose                                                   |
| **LLM**        | Ollama (local, no API costs)                                     |
| **Access**     | Local network (optional: Tailscale/Cloudflare Tunnel for remote) |

### Tasks

- [x] **5.1 Docker Setup**
  - Dockerfile for backend (Python 3.11+)
  - Dockerfile for frontend (Node.js build → nginx)
  - Docker Compose for full stack + Ollama
  - Volume mounts for persistent data (uploads, ChromaDB, conversations)

- [x] **5.2 Ubuntu Server Preparation**
  - Install Docker & Docker Compose
  - Install Ollama and pull required models (`llama3.2`, `nomic-embed-text`)
  - Configure firewall (ufw) - open ports 8000, 5173/80
  - Set up dedicated user for the application

- [x] **5.3 Deployment Configuration**
  - Create production `.env` file
  - Configure Ollama to listen on Docker network
  - Set up systemd service for auto-start on boot
  - Configure nginx reverse proxy (optional, for single port access)

- [x] **5.4 Data Persistence & Backup**
  - Mount volumes for `/data/uploads`, `/data/chroma`, `/data/conversations`
  - Create backup script for data directories
  - Set up cron job for automated backups

- [ ] **5.5 Remote Access (Optional)**
  - Option A: Tailscale for secure remote access
  - Option B: Cloudflare Tunnel (no port forwarding needed)
  - Option C: WireGuard VPN to homelab

- [ ] **5.6 Monitoring & Maintenance**
  - Set up Portainer for Docker management (optional)
  - Configure log rotation
  - Health check endpoints
  - Watchtower for auto-updates (optional)

### Deployment Commands (Quick Reference)

```bash
# On Ubuntu Server

# 1. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
ollama pull nomic-embed-text

# 3. Clone and deploy
git clone https://github.com/yourusername/rag-research.git
cd rag-research
cp .env.example .env  # Edit with your settings
docker compose up -d

# 4. Access the app
# http://<server-ip>:5173 (frontend)
# http://<server-ip>:8000/docs (API docs)
```

### Deliverables

- Containerized application running on Ubuntu Server
- Persistent data storage with backup strategy
- Auto-start on server boot
- Accessible from local network (and optionally remotely)

---

## Project Structure (Target)

```
rag-research/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Settings
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── documents.py
│   │   │   │   └── chat.py
│   │   ├── core/
│   │   │   ├── rag.py           # RAG pipeline
│   │   │   ├── vectorstore.py   # ChromaDB setup
│   │   │   └── document_processor.py
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic models
│   │   └── services/
│   │       └── llm.py           # LLM configuration
│   ├── data/
│   │   ├── uploads/             # Uploaded files
│   │   └── chroma/              # Vector DB storage
│   ├── tests/
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   ├── Documents/
│   │   │   └── Layout/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── IMPLEMENTATION_PLAN.md
└── README.md
```

---

## Getting Started

**Development Prerequisites:**

- Python 3.11+
- Node.js 18+
- Ollama with `llama3.2` and `nomic-embed-text` models

**Deployment Prerequisites (Homelab):**

- Ubuntu Server 22.04 LTS or newer
- Docker & Docker Compose
- Ollama installed on host
- Minimum 8GB RAM recommended (for LLM inference)

**Next Step:** Begin Phase 1 - Core RAG Backend

---

## Notes

- Each phase builds on the previous one
- Phases can be adjusted based on learning goals
- Using Ollama for local development and production (free, no API costs, privacy-preserving)
- Test frequently with real documents to validate quality
- Homelab deployment keeps all data local and private
