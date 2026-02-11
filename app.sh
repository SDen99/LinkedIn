#!/bin/bash
# Domino App startup script
# Domino expects apps to listen on port 8888

export PORT=8888
export ORIGIN="https://${DOMINO_PROJECT_OWNER}-${DOMINO_PROJECT_NAME}.domino.tech"

cd /mnt/code

# Install all dependencies (including devDependencies needed for build)
NODE_ENV=development npm ci --engine-strict=false

# Build the app (uses production mode via the npm script)
npm run build

# Start the server in production mode
NODE_ENV=production node build/index.js
