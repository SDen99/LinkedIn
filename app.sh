#!/bin/bash
# Domino App startup script
# Domino expects apps to listen on port 8888

export PORT=8888
export NODE_ENV=production
export ORIGIN="https://${DOMINO_PROJECT_OWNER}-${DOMINO_PROJECT_NAME}.domino.tech"

cd /mnt/code

# Install all dependencies (need devDependencies for the build step)
npm ci --engine-strict=false

# Build the app
npm run build

# Start the server
node build/index.js
