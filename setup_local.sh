#!/usr/bin/env bash
# Main setup script for local development

echo "Setting up authnode2fa for local development..."
echo ""

# Setup backend
echo "Setting up backend..."
cd backend
if python setup_local.py; then
    echo "✓ Backend setup completed"
else
    echo "✗ Backend setup failed"
    exit 1
fi
cd ..

echo ""

# Setup frontend
echo "Setting up frontend..."
cd frontend
if bash setup_local.sh; then
    echo "✓ Frontend setup completed"
else
    echo "✗ Frontend setup failed"
    exit 1
fi
cd ..

echo ""
echo "✓ All setup complete!"
echo ""
echo "To run the application:"
echo "1. Backend: cd backend && python run_server.py"
echo "2. Frontend: cd frontend && PORT=8040 npm start"
echo ""
echo "Then visit http://localhost:8040"