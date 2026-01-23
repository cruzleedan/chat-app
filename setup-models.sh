#!/bin/bash
# setup-models.sh - Download Ollama models

echo "Starting Ollama services..."
docker-compose up -d ollama

echo "Waiting for Ollama to be ready..."
sleep 30

echo "Downloading models..."
docker exec rag-ollama ollama pull llama3.2
docker exec rag-ollama ollama pull nomic-embed-text

echo "Listing installed models:"
docker exec rag-ollama ollama list

echo "Starting all services..."
docker-compose up -d

echo "Setup complete!"