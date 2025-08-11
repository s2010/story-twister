#!/usr/bin/env python3
"""
Production Admin Seeder Script
Generates strong admin credentials and updates .env file
"""

import os
import secrets
import string
import hashlib
from pathlib import Path

def generate_strong_password(length=24):
    """Generate a strong password with mixed characters"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password

def generate_strong_token(length=64):
    """Generate a cryptographically secure API token"""
    return secrets.token_urlsafe(length)

def update_env_file(admin_password, admin_token):
    """Update .env file with production admin credentials"""
    env_path = Path(__file__).parent.parent / '.env'
    
    # Read existing .env content
    env_content = []
    if env_path.exists():
        with open(env_path, 'r') as f:
            env_content = f.readlines()
    
    # Remove existing admin credentials
    env_content = [line for line in env_content if not any(
        line.startswith(prefix) for prefix in [
            'ADMIN_SEED_USERNAME=',
            'ADMIN_SEED_EMAIL=',
            'ADMIN_SEED_PASSWORD=',
            'ADMIN_SEED_API_TOKEN=',
            'NODE_ENV=',
            'VITE_NODE_ENV='
        ]
    )]
    
    # Add production admin credentials
    production_vars = [
        f'# Production Admin Credentials (Generated: {secrets.token_hex(8)})\n',
        f'ADMIN_SEED_USERNAME=admin\n',
        f'ADMIN_SEED_EMAIL=admin@story-twister.app\n',
        f'ADMIN_SEED_PASSWORD={admin_password}\n',
        f'ADMIN_SEED_API_TOKEN={admin_token}\n',
        f'NODE_ENV=production\n',
        f'VITE_NODE_ENV=production\n',
        '\n'
    ]
    
    env_content.extend(production_vars)
    
    # Write updated .env file
    with open(env_path, 'w') as f:
        f.writelines(env_content)
    
    print(f"✅ Updated {env_path} with production credentials")

def create_dev_env_example():
    """Create .env.development example file"""
    dev_env_path = Path(__file__).parent.parent / '.env.development'
    
    dev_content = [
        '# Development Environment Variables\n',
        '# Copy this to .env for development mode\n',
        '\n',
        'ADMIN_SEED_USERNAME=admin\n',
        'ADMIN_SEED_EMAIL=admin@example.com\n',
        'ADMIN_SEED_PASSWORD=ChangeMe123!\n',
        'ADMIN_SEED_API_TOKEN=dev-admin-token\n',
        'NODE_ENV=development\n',
        'VITE_NODE_ENV=development\n',
        '\n',
        '# Database Configuration\n',
        'DATABASE_URL=postgresql://postgres:password@db:5432/story_twister\n',
        '\n',
        '# AI Configuration\n',
        'GROQ_API_KEY=your_groq_api_key_here\n',
        '\n',
        '# CORS Configuration\n',
        'ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173\n',
    ]
    
    with open(dev_env_path, 'w') as f:
        f.writelines(dev_content)
    
    print(f"✅ Created {dev_env_path} for development reference")

def main():
    """Main function to set up production admin credentials"""
    print("🔐 PRODUCTION ADMIN SEEDER")
    print("=" * 50)
    
    # Generate strong credentials
    admin_password = generate_strong_password(24)
    admin_token = generate_strong_token(48)
    
    print("🎯 Generated Production Credentials:")
    print(f"   Username: admin")
    print(f"   Email: admin@story-twister.app")
    print(f"   Password: {admin_password}")
    print(f"   API Token: {admin_token}")
    print()
    
    # Update .env file
    update_env_file(admin_password, admin_token)
    
    # Create development example
    create_dev_env_example()
    
    print("🚀 PRODUCTION SETUP COMPLETE!")
    print("=" * 50)
    print("NEXT STEPS:")
    print("1. ✅ Strong admin credentials generated and stored in .env")
    print("2. ✅ Development example created in .env.development")
    print("3. 🔄 Run: docker-compose restart backend")
    print("4. 🔄 Run: docker-compose exec backend alembic upgrade head")
    print("5. 🔒 Keep .env file secure and never commit to version control")
    print()
    print("⚠️  IMPORTANT: Save these credentials securely!")
    print(f"   Admin Login: admin / {admin_password}")
    print(f"   API Token: {admin_token}")

if __name__ == "__main__":
    main()
