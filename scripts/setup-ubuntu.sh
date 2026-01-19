#!/bin/bash
# =============================================================================
# RAG Document Q&A - Ubuntu Server Setup Script
# =============================================================================
# This script prepares an Ubuntu Server for running the RAG application
# Run with sudo: sudo ./setup-ubuntu.sh
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}RAG Document Q&A - Server Setup${NC}"
echo -e "${GREEN}======================================${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}" 
   exit 1
fi

# =============================================================================
# System Updates
# =============================================================================
echo -e "\n${YELLOW}[1/6] Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# =============================================================================
# Install Docker
# =============================================================================
echo -e "\n${YELLOW}[2/6] Installing Docker...${NC}"

# Remove old versions if present
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install prerequisites
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group (if not root)
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker $SUDO_USER
    echo -e "${GREEN}Added $SUDO_USER to docker group${NC}"
fi

# Start and enable Docker
systemctl start docker
systemctl enable docker

echo -e "${GREEN}Docker installed successfully!${NC}"
docker --version
docker compose version

# =============================================================================
# Install Ollama
# =============================================================================
echo -e "\n${YELLOW}[3/6] Installing Ollama...${NC}"

curl -fsSL https://ollama.ai/install.sh | sh

# Enable Ollama to start on boot
systemctl enable ollama

echo -e "${GREEN}Ollama installed successfully!${NC}"
ollama --version

# =============================================================================
# Pull Required Models
# =============================================================================
echo -e "\n${YELLOW}[4/6] Pulling Ollama models (this may take a while)...${NC}"

echo "Pulling llama3.2 (LLM model)..."
ollama pull llama3.2

echo "Pulling nomic-embed-text (embedding model)..."
ollama pull nomic-embed-text

echo -e "${GREEN}Models pulled successfully!${NC}"
ollama list

# =============================================================================
# Configure Firewall
# =============================================================================
echo -e "\n${YELLOW}[5/6] Configuring firewall...${NC}"

# Install ufw if not present
apt-get install -y ufw

# Allow SSH (important - don't lock yourself out!)
ufw allow ssh

# Allow RAG app ports
ufw allow 3000/tcp comment 'RAG Frontend'
ufw allow 8000/tcp comment 'RAG Backend API'

# Enable firewall (will prompt if interactive)
echo "y" | ufw enable

ufw status
echo -e "${GREEN}Firewall configured!${NC}"

# =============================================================================
# Create Application Directory
# =============================================================================
echo -e "\n${YELLOW}[6/6] Setting up application directory...${NC}"

APP_DIR="/opt/rag-qa"
DATA_DIR="$APP_DIR/data"

mkdir -p $DATA_DIR/chroma
mkdir -p $DATA_DIR/uploads
mkdir -p $DATA_DIR/backups

# Set permissions for the non-root user
if [ -n "$SUDO_USER" ]; then
    chown -R $SUDO_USER:$SUDO_USER $APP_DIR
fi

echo -e "${GREEN}Application directory created at $APP_DIR${NC}"

# =============================================================================
# Summary
# =============================================================================
echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Next steps:"
echo -e "1. ${YELLOW}Log out and back in${NC} (for docker group membership)"
echo -e "2. Clone or copy your RAG application to ${YELLOW}$APP_DIR${NC}"
echo -e "3. Copy ${YELLOW}.env.production${NC} to ${YELLOW}.env${NC} and configure"
echo -e "4. Run ${YELLOW}docker compose up -d${NC} to start the application"
echo ""
echo -e "Useful commands:"
echo -e "  - Check Docker status: ${YELLOW}docker ps${NC}"
echo -e "  - View logs: ${YELLOW}docker compose logs -f${NC}"
echo -e "  - Check Ollama: ${YELLOW}ollama list${NC}"
echo -e "  - Firewall status: ${YELLOW}sudo ufw status${NC}"
echo ""
echo -e "${GREEN}Happy RAG-ing! 🚀${NC}"
