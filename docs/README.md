# Documentation

This directory contains the MkDocs documentation for the RAG Document Q&A application.

## Structure

```
docs/
├── .venv/          # Python virtual environment (MkDocs dependencies)
├── mkdocs.yml      # MkDocs configuration
├── content/        # Markdown source files
│   ├── index.md
│   ├── rag-case-study.md
│   ├── architecture/
│   ├── backend/
│   ├── frontend/
│   ├── api/
│   └── deployment/
└── README.md       # This file
```

## Prerequisites

- Python 3.9+

## Setup (First Time)

```bash
cd docs
python3 -m venv .venv
source .venv/bin/activate
pip install mkdocs mkdocs-material mkdocs-mermaid2-plugin
```

## Serve Documentation

```bash
cd docs
source .venv/bin/activate
mkdocs serve -a 127.0.0.1:8080
```

Then open **http://127.0.0.1:8080/rag-docs/** in your browser.

## Build Static Site

To generate a static HTML site for deployment:

```bash
cd docs
source .venv/bin/activate
mkdocs build
```

Output will be in the `site/` directory.

## Quick Reference

| Command                        | Description                      |
| ------------------------------ | -------------------------------- |
| `mkdocs serve`                 | Start dev server with hot reload |
| `mkdocs build`                 | Build static site to `site/`     |
| `mkdocs serve -a 0.0.0.0:8080` | Serve on all interfaces          |

## Adding New Pages

1. Create a new `.md` file in `content/` or a subdirectory
2. Add the page to the `nav` section in `mkdocs.yml`
3. The dev server will auto-reload

## Dependencies

- `mkdocs` - Static site generator
- `mkdocs-material` - Material Design theme
- `mkdocs-mermaid2-plugin` - Mermaid diagram support
