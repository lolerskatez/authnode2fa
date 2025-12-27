#!/usr/bin/env bash
# Setup script for frontend local development

echo "Setting up frontend for local development..."

# Install dependencies
if npm install; then
    echo "✓ npm install completed"
else
    echo "✗ npm install failed"
    exit 1
fi

echo ""
echo "✓ Frontend setup complete!"
echo "You can now run the frontend with: PORT=8040 npm start"