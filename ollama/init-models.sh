#!/bin/bash
# Initialize models on first run

echo "Starting Ollama initialization..."

# Start ollama in background
echo "Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

# Function to check if ollama is responding
wait_for_ollama() {
    local retries=30
    while [ $retries -gt 0 ]; do
        if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
            echo "Ollama is ready!"
            return 0
        fi
        echo "Waiting for Ollama to start... ($retries retries left)"
        sleep 2
        retries=$((retries - 1))
    done
    echo "Failed to connect to Ollama"
    return 1
}

# Wait for ollama to be ready
if wait_for_ollama; then
    # Check if models exist, download if not
    echo "Checking for required models..."
    
    if ! ollama list 2>/dev/null | grep -q "llama3.2"; then
        echo "Downloading llama3.2..."
        ollama pull llama3.2
    else
        echo "llama3.2 already exists"
    fi

    if ! ollama list 2>/dev/null | grep -q "nomic-embed-text"; then
        echo "Downloading nomic-embed-text..."
        ollama pull nomic-embed-text
    else
        echo "nomic-embed-text already exists"
    fi
    
    echo "Models ready!"
else
    echo "Failed to initialize Ollama, exiting..."
    exit 1
fi

echo "Ollama initialization complete. Service is running."

# Wait for the background process to keep container alive
wait $OLLAMA_PID