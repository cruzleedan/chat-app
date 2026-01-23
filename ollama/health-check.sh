#!/bin/bash
# Health check script for Ollama

# Check if Ollama API is responding
if ! curl -sf http://localhost:11434/api/version >/dev/null 2>&1; then
    echo "Ollama API not responding"
    exit 1
fi

# Check if required models are available
if ! ollama list 2>/dev/null | grep -q "llama3.2"; then
    echo "llama3.2 model not available"
    exit 1
fi

if ! ollama list 2>/dev/null | grep -q "nomic-embed-text"; then
    echo "nomic-embed-text model not available"
    exit 1
fi

echo "Ollama is healthy with required models"
exit 0