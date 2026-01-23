#!/bin/bash
# Initialize models on first run

echo "Starting Ollama service..."

# Start ollama in background
ollama serve &
OLLAMA_PID=$!

# Wait for ollama to be ready
echo "Waiting for Ollama to be ready..."
sleep 10

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
    echo "Failed to initialize Ollama, but continuing..."
fi

# Keep ollama running in foreground
echo "Ollama initialization complete. Switching to foreground mode..."
fg %1