#!/bin/bash
# Initialize models on first run

# Start ollama in background
ollama serve &
OLLAMA_PID=$!

# Wait for ollama to be ready
sleep 5

# Check if models exist, download if not
if ! ollama list | grep -q "llama3.2"; then
    echo "Downloading llama3.2..."
    ollama pull llama3.2
fi

if ! ollama list | grep -q "nomic-embed-text"; then
    echo "Downloading nomic-embed-text..."
    ollama pull nomic-embed-text
fi

# Stop background ollama
kill $OLLAMA_PID
wait $OLLAMA_PID

# Start ollama normally
exec ollama serve