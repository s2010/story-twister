"""
Admin Security Module for Story-Twister Admin Console
Provides authentication, authorization, and security middleware for admin APIs
"""

import os
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt
from passlib.context import CryptContext
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import get_db
from models import User, ApiToken, AdminAction

# Initialize security components
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)
limiter = Limiter(key_func=get_remote_address)

# Environment variables
ADMIN_JWT_SECRET = os.getenv('ADMIN_JWT_SECRET', 'dev-jwt-secret-change-in-production')
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173,http://localhost:8001').split(',')

class AdminAuthError(HTTPException):
    """Custom exception for admin authentication errors"""
    def __init__(self, detail: str = "Admin authentication required"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

class AdminUser:
    """Admin user context"""
    def __init__(self, user_id: str, username: str, token_hash: Optional[str] = None):
        self.user_id = user_id
        self.username = username
        self.token_hash = token_hash

async def verify_same_origin(request: Request) -> bool:
    """Verify request is from same origin"""
    origin = request.headers.get('origin')
    host = request.headers.get('host')
    
    if origin:
        # Check if origin is in allowed origins
        return origin in ALLOWED_ORIGINS
    
    # For non-CORS requests, check host header
    if host:
        allowed_hosts = [origin.replace('http://', '').replace('https://', '') for origin in ALLOWED_ORIGINS]
        # Also allow internal Docker requests (localhost, backend container)
        allowed_hosts.extend(['localhost:8000', '0.0.0.0:8000', 'backend:8000'])
        return host in allowed_hosts
    
    # Allow requests without origin/host headers for internal testing
    # This handles cases like Docker container-to-container communication
    return True

async def verify_api_token(token: str, db: AsyncSession) -> Optional[AdminUser]:
    """Verify API token and return admin user"""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Query for active token
    result = await db.execute(
        select(ApiToken, User)
        .join(User, ApiToken.user_id == User.id)
        .where(
            ApiToken.token_hash == token_hash,
            ApiToken.is_active == True,
            User.role == 'admin',
            User.is_active == True
        )
    )
    
    token_user = result.first()
    if not token_user:
        return None
    
    api_token, user = token_user
    
    # Check token expiration
    if api_token.expires_at and api_token.expires_at < datetime.utcnow():
        return None
    
    # Update last used timestamp
    api_token.last_used = datetime.utcnow()
    await db.commit()
    
    return AdminUser(user_id=str(user.id), username=user.username, token_hash=token_hash)

async def verify_jwt_token(token: str) -> Optional[AdminUser]:
    """Verify JWT token and return admin user"""
    try:
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=['HS256'])
        
        # Verify required claims
        if payload.get('aud') != 'admin' or payload.get('iss') != 'plot-twister':
            return None
        
        # Check expiration
        exp = payload.get('exp')
        if exp and datetime.fromtimestamp(exp) < datetime.utcnow():
            return None
        
        user_id = payload.get('sub')
        username = payload.get('username')
        
        if not user_id or not username:
            return None
        
        return AdminUser(user_id=user_id, username=username)
    
    except jwt.InvalidTokenError:
        return None

async def log_admin_action(
    db: AsyncSession,
    admin_user: AdminUser,
    action: str,
    team_code: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None
):
    """Log admin action for audit trail"""
    admin_action = AdminAction(
        user_id=admin_user.user_id if admin_user.user_id != 'system' else None,
        token_hash=admin_user.token_hash,
        action=action,
        team_code=team_code,
        payload_json=json.dumps(payload) if payload else None,
        ip_address=get_remote_address(request) if request else None,
        user_agent=request.headers.get('user-agent') if request else None
    )
    
    db.add(admin_action)
    await db.commit()

@limiter.limit("10/minute")
async def verify_admin(
    request: Request,
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AdminUser:
    """
    Admin authentication dependency
    Supports both X-Admin-Token header and Authorization: Bearer JWT
    """
    
    # Check same-origin requirement
    if not await verify_same_origin(request):
        raise AdminAuthError("Same-origin policy violation")
    
    admin_user = None
    
    # Try X-Admin-Token header first
    admin_token = request.headers.get('x-admin-token')
    if admin_token:
        admin_user = await verify_api_token(admin_token, db)
    
    # Try Authorization: Bearer JWT if no token header
    elif credentials and credentials.scheme.lower() == 'bearer':
        admin_user = await verify_jwt_token(credentials.credentials)
    
    if not admin_user:
        raise AdminAuthError("Invalid or missing admin credentials")
    
    # Log the authentication
    await log_admin_action(
        db, admin_user, 'authenticate', 
        payload={'endpoint': str(request.url.path)}, 
        request=request
    )
    
    return admin_user

def add_admin_headers(response):
    """Add security headers to admin responses"""
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "same-origin"
    return response

def create_admin_jwt(user_id: str, username: str, expires_hours: int = 24) -> str:
    """Create JWT token for admin user"""
    now = datetime.utcnow()
    payload = {
        'sub': user_id,
        'username': username,
        'aud': 'admin',
        'iss': 'plot-twister',
        'iat': now,
        'exp': now + timedelta(hours=expires_hours)
    }
    
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm='HS256')

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)
