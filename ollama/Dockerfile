# Ollama Dockerfile with pre-downloaded models
FROM ollama/ollama:latest

# Create ollama user and set permissions
USER root
RUN useradd -m -u 1000 ollama && chown -R ollama:ollama /root/.ollama
USER ollama

# Start Ollama service in background and download models
RUN ollama serve & \
    sleep 5 && \
    ollama pull llama3.2 && \
    ollama pull nomic-embed-text && \
    pkill ollama

# Switch back to root for the CMD
USER root

# Use the default ollama serve command
CMD ["ollama", "serve"]