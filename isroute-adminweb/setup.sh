#!/bin/bash

# SAFEWALK Admin Dashboard - Automated Setup Script

echo "🚀 SAFEWALK Admin Dashboard - Setup"
echo "=================================="

# Check Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js v14+."
    exit 1
fi
echo "✅ Node.js found: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed."
    exit 1
fi
echo "✅ npm found: $(npm --version)"

# Backend setup
echo ""
echo "📦 Setting up Backend..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
echo "✅ Backend dependencies installed"

# Frontend setup
echo ""
echo "📦 Setting up Frontend..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi
echo "✅ Frontend dependencies installed"

echo ""
echo "=================================="
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Create MySQL database: mysql -u root -p < backend/database.sql"
echo "2. Start backend: cd backend && npm run dev"
echo "3. Start frontend: cd frontend && npm start"
echo "4. Access at http://localhost:3000"
echo ""
echo "Default login:"
echo "Email: admin@safewalk.com"
echo "Password: (check database.sql)"
echo "=================================="
