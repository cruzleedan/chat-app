#!/bin/bash
# =============================================================================
# RAG Document Q&A - Restore Script
# =============================================================================
# Restores data from a backup created by backup.sh
# Usage: ./restore.sh [backup_timestamp]
# Example: ./restore.sh 20240115_020000
# =============================================================================

set -e

# Configuration
APP_DIR="${RAG_APP_DIR:-/opt/rag-qa}"
BACKUP_DIR="${RAG_BACKUP_DIR:-$APP_DIR/data/backups}"
DATA_DIR="$APP_DIR/data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}RAG Document Q&A - Restore${NC}"
echo -e "${GREEN}======================================${NC}"

# =============================================================================
# List Available Backups or Use Provided Timestamp
# =============================================================================
if [ -z "$1" ]; then
    echo -e "\n${YELLOW}Available backups:${NC}"
    echo ""
    
    # List unique timestamps from backup files
    ls -1 "$BACKUP_DIR"/rag_backup_*_chroma.tar.gz 2>/dev/null | \
        sed 's/.*rag_backup_//' | \
        sed 's/_chroma.tar.gz//' | \
        while read timestamp; do
            CHROMA_SIZE=$(ls -lh "$BACKUP_DIR/rag_backup_${timestamp}_chroma.tar.gz" 2>/dev/null | awk '{print $5}' || echo "N/A")
            UPLOADS_SIZE=$(ls -lh "$BACKUP_DIR/rag_backup_${timestamp}_uploads.tar.gz" 2>/dev/null | awk '{print $5}' || echo "N/A")
            echo "  $timestamp  (chroma: $CHROMA_SIZE, uploads: $UPLOADS_SIZE)"
        done
    
    echo ""
    echo -e "Usage: ${YELLOW}$0 <timestamp>${NC}"
    echo -e "Example: ${YELLOW}$0 20240115_020000${NC}"
    exit 0
fi

TIMESTAMP="$1"
BACKUP_PREFIX="rag_backup_$TIMESTAMP"

echo -e "Restoring from backup: $TIMESTAMP"
echo ""

# Verify backup files exist
CHROMA_BACKUP="$BACKUP_DIR/${BACKUP_PREFIX}_chroma.tar.gz"
UPLOADS_BACKUP="$BACKUP_DIR/${BACKUP_PREFIX}_uploads.tar.gz"

if [ ! -f "$CHROMA_BACKUP" ] && [ ! -f "$UPLOADS_BACKUP" ]; then
    echo -e "${RED}Error: No backup files found for timestamp $TIMESTAMP${NC}"
    exit 1
fi

# =============================================================================
# Confirm Restore
# =============================================================================
echo -e "${YELLOW}WARNING: This will overwrite existing data!${NC}"
echo -e "The following will be restored:"
[ -f "$CHROMA_BACKUP" ] && echo "  - ChromaDB: $CHROMA_BACKUP"
[ -f "$UPLOADS_BACKUP" ] && echo "  - Uploads: $UPLOADS_BACKUP"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Restore cancelled.${NC}"
    exit 0
fi

# =============================================================================
# Stop Application (if running)
# =============================================================================
echo -e "\n${YELLOW}[1/4] Stopping application...${NC}"

if command -v docker &> /dev/null; then
    cd "$APP_DIR" 2>/dev/null && docker compose down 2>/dev/null || true
    echo -e "${GREEN}Application stopped${NC}"
else
    echo -e "Docker not found, skipping container stop"
fi

# =============================================================================
# Backup Current Data (just in case)
# =============================================================================
echo -e "\n${YELLOW}[2/4] Creating safety backup of current data...${NC}"

SAFETY_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
if [ -d "$DATA_DIR/chroma" ]; then
    mv "$DATA_DIR/chroma" "$DATA_DIR/chroma_pre_restore_$SAFETY_TIMESTAMP" 2>/dev/null || true
fi
if [ -d "$DATA_DIR/uploads" ]; then
    mv "$DATA_DIR/uploads" "$DATA_DIR/uploads_pre_restore_$SAFETY_TIMESTAMP" 2>/dev/null || true
fi
echo -e "${GREEN}Safety backup created${NC}"

# =============================================================================
# Restore Data
# =============================================================================
echo -e "\n${YELLOW}[3/4] Restoring data...${NC}"

mkdir -p "$DATA_DIR"

if [ -f "$CHROMA_BACKUP" ]; then
    echo "Restoring ChromaDB..."
    tar -xzf "$CHROMA_BACKUP" -C "$DATA_DIR"
    echo -e "${GREEN}ChromaDB restored${NC}"
fi

if [ -f "$UPLOADS_BACKUP" ]; then
    echo "Restoring uploads..."
    tar -xzf "$UPLOADS_BACKUP" -C "$DATA_DIR"
    echo -e "${GREEN}Uploads restored${NC}"
fi

# =============================================================================
# Restart Application
# =============================================================================
echo -e "\n${YELLOW}[4/4] Restarting application...${NC}"

if command -v docker &> /dev/null && [ -f "$APP_DIR/docker-compose.yml" ]; then
    cd "$APP_DIR" && docker compose up -d
    echo -e "${GREEN}Application restarted${NC}"
else
    echo -e "${YELLOW}Please manually restart the application${NC}"
fi

# =============================================================================
# Summary
# =============================================================================
echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}Restore Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Restored from: $TIMESTAMP"
echo -e "Safety backup location: $DATA_DIR/*_pre_restore_$SAFETY_TIMESTAMP"
echo ""
echo -e "Note: You can delete the safety backup once you've verified the restore:"
echo -e "  ${YELLOW}rm -rf $DATA_DIR/*_pre_restore_$SAFETY_TIMESTAMP${NC}"
echo ""
echo -e "${GREEN}Done! 🎉${NC}"
