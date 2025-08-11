#!/bin/bash

# Story-Twister Production Deployment Script
# This script helps you deploy Story-Twister to production safely

set -e  # Exit on any error

echo "🚀 STORY-TWISTER PRODUCTION DEPLOYMENT"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Run this script from the project root."
    exit 1
fi

# Step 1: Generate production credentials
echo "🔐 Step 1: Generating production credentials..."
if [ ! -f ".env" ]; then
    echo "📝 Generating strong admin credentials..."
    docker-compose exec backend python seed_production_admin.py
    echo "✅ Production credentials generated and saved to .env"
else
    echo "⚠️  .env file already exists. Skipping credential generation."
    echo "   If you need new credentials, delete .env and run this script again."
fi

# Step 2: Security verification
echo ""
echo "🛡️  Step 2: Security verification..."
echo "📋 CRITICAL SECRETS TO VERIFY:"
echo "   - DATABASE_URL (should not contain 'localhost' in production)"
echo "   - ADMIN_SEED_PASSWORD (should be strong, 16+ characters)"
echo "   - ADMIN_SEED_API_TOKEN (should be secure, 32+ characters)"
echo "   - GROQ_API_KEY (required for AI features)"
echo "   - ALLOWED_ORIGINS (should only include your production domains)"
echo ""

# Step 3: Build production containers
echo "🏗️  Step 3: Building production containers..."
echo "Setting NODE_ENV=production and VITE_NODE_ENV=production..."

# Update docker-compose for production
export NODE_ENV=production
export VITE_NODE_ENV=production

docker-compose build --no-cache

echo "✅ Production containers built successfully"

# Step 4: Database setup
echo ""
echo "🗄️  Step 4: Database setup..."
echo "Starting database and running migrations..."

docker-compose up -d db
sleep 5  # Wait for database to be ready

docker-compose up -d backend
sleep 10  # Wait for backend to be ready

echo "Running database migrations..."
docker-compose exec backend alembic upgrade head

echo "✅ Database migrations completed"

# Step 5: Start all services
echo ""
echo "🚀 Step 5: Starting all services..."
docker-compose up -d

echo "✅ All services started"

# Step 6: Verification
echo ""
echo "🔍 Step 6: Deployment verification..."
echo "Waiting for services to be ready..."
sleep 15

# Test backend health
echo "Testing backend health..."
if curl -f http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    echo "Check logs: docker-compose logs backend"
fi

# Test frontend
echo "Testing frontend..."
if curl -f http://localhost:5174/ > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not accessible"
    echo "Check logs: docker-compose logs frontend2"
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo ""
echo "📊 Service URLs:"
echo "   Frontend: http://localhost:5174"
echo "   Backend API: http://localhost:8001"
echo "   Admin Console: http://localhost:5174/admin"
echo ""
echo "🔐 Admin Credentials (SAVE THESE SECURELY):"
if [ -f ".env" ]; then
    echo "   Username: admin"
    echo "   Password: $(grep ADMIN_SEED_PASSWORD .env | cut -d'=' -f2)"
    echo "   API Token: $(grep ADMIN_SEED_API_TOKEN .env | cut -d'=' -f2)"
else
    echo "   Check your .env file for admin credentials"
fi
echo ""
echo "⚠️  IMPORTANT SECURITY REMINDERS:"
echo "   1. Never commit .env file to version control"
echo "   2. Use HTTPS in production (set up SSL certificates)"
echo "   3. Update ALLOWED_ORIGINS to your production domains"
echo "   4. Change default database credentials"
echo "   5. Monitor logs for security issues"
echo ""
echo "📖 For detailed deployment guide, see: PRODUCTION_DEPLOYMENT.md"
echo ""
echo "🔧 Useful commands:"
echo "   View logs: docker-compose logs -f [service]"
echo "   Restart: docker-compose restart [service]"
echo "   Stop: docker-compose down"
echo "   Update: git pull && docker-compose build && docker-compose up -d"
