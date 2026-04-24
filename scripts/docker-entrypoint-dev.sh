#!/bin/sh
set -e
# Addon JS dependencies are installed in the image under /masterportal/node_modules (see Dockerfile.dev).
cd /masterportal
exec npm run start -- --host 0.0.0.0
