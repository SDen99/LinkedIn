#!/bin/bash
# Domino App startup script
# Domino expects apps to listen on port 8888

export PORT=8888
export NODE_ENV=production
export ORIGIN="https://${DOMINO_PROJECT_OWNER}-${DOMINO_PROJECT_NAME}.domino.tech"

cd /mnt/code
npm ci --production
node build/index.js
