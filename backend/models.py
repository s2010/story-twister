import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, DateTime, Integer, Text, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base

class SessionStatus(str, Enum):
    WAITING = "waiting"
    ACTIVE = "active"
    COMPLETED = "completed"

class StoryStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"

class Team(Base):
    __tablename__ = "teams"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sessions = relationship("Session", back_populates="team")
    stories = relationship("Story", back_populates="team")

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)  # Track when session ended
    status = Column(String(20), default=SessionStatus.ACTIVE)
    
    # Relationships
    team = relationship("Team", back_populates="sessions")

class Story(Base):
    __tablename__ = "stories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    title = Column(String(255), nullable=False)
    initial_prompt = Column(Text, nullable=False)
    current_turn = Column(Integer, default=0)
    status = Column(String(20), default=StoryStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    team = relationship("Team", back_populates="stories")
    turns = relationship("Turn", back_populates="story", order_by="Turn.turn_number")
    analyses = relationship("SessionAnalysis", back_populates="story")

class Turn(Base):
    __tablename__ = "turns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id"), nullable=False)
    author_name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    is_twist = Column(Boolean, default=False)
    turn_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    story = relationship("Story", back_populates="turns")

class SessionAnalysis(Base):
    __tablename__ = "session_analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id"), nullable=False, unique=True)
    
    # Analysis scores (0-100)
    creativity_score = Column(Integer, nullable=False)
    engagement_score = Column(Integer, nullable=False)
    collaboration_score = Column(Integer, nullable=False)
    
    # AI-generated feedback
    creativity_feedback = Column(Text, nullable=False)
    engagement_feedback = Column(Text, nullable=False)
    collaboration_feedback = Column(Text, nullable=False)
    
    # Analysis metadata
    total_turns = Column(Integer, nullable=False)
    unique_participants = Column(Integer, nullable=False)
    session_duration_minutes = Column(Integer, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    story = relationship("Story", back_populates="analyses")


class User(Base):
    """Admin user model for authentication"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user")  # 'admin' or 'user'
    is_active = Column(Boolean, default=True)
    is_system_user = Column(Boolean, default=False)  # For seeded admin
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    api_tokens = relationship("ApiToken", back_populates="user")
    admin_actions = relationship("AdminAction", back_populates="user")


class ApiToken(Base):
    """API tokens for admin authentication"""
    __tablename__ = "api_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Nullable for system tokens
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)  # Human-readable token name
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)  # Nullable for non-expiring tokens
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="api_tokens")


class AdminAction(Base):
    """Audit log for admin actions"""
    __tablename__ = "admin_actions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    token_hash = Column(String(255), nullable=True)  # For token-based actions
    action = Column(String(100), nullable=False)  # e.g., 'bootstrap', 'start_session', 'twist'
    team_code = Column(String(50), nullable=True)
    payload_json = Column(Text, nullable=True)  # JSON payload of the action
    ip_address = Column(String(45), nullable=True)  # Support IPv6
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="admin_actions")
    
    # Index for performance
    __table_args__ = (
        Index('idx_admin_actions_created_at', 'created_at'),
        Index('idx_admin_actions_team_code', 'team_code'),
        Index('idx_admin_actions_action', 'action'),
    )
