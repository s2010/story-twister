from datetime import datetime, timedelta
import uuid
from uuid import UUID
import os
import random
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from database import get_db
from models import Team, Session, Story, Turn, SessionAnalysis, SessionStatus, StoryStatus
from pydantic import BaseModel

# Import admin router
from admin_router import router as admin_router
from admin_security import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Initialize Groq client if API key is available
GROQ_CLIENT = None
try:
    from groq import Groq
    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key:
        GROQ_CLIENT = Groq(api_key=groq_api_key)
        print("✅ Groq client initialized")
    else:
        print("⚠️ GROQ_API_KEY not found, using fallback twists")
except ImportError:
    print("⚠️ Groq library not installed, using fallback twists")

# Predefined starter prompts
STARTER_PROMPTS = [
    "In a world where dreams become reality, a young inventor discovers their latest creation has unexpected consequences...",
    "The last library on Earth holds a secret that could change everything, but only those who can solve its ancient riddle may enter...",
    "When the city's clocks all stop at midnight, time itself begins to unravel, and only a group of unlikely heroes can restore order...",
    "A mysterious letter arrives with no return address, containing a map to a place that shouldn't exist...",
    "In a small town where everyone knows everyone, a stranger arrives who seems to know secrets that no one has ever shared...",
    "The old music box in the attic plays a melody that opens doorways to other worlds...",
    "A detective investigating a series of impossible crimes discovers that the laws of physics don't apply to the perpetrator...",
    "When the aurora borealis appears in the middle of summer, it brings with it visitors from a realm beyond the stars..."
]

# Session duration in seconds (10 minutes)
SESSION_DURATION_SECONDS = 10 * 60  # 10 minutes - fully tested and verified

app = FastAPI(title="Story Twister API", version="0.1.0")

# Add rate limiting state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Mount admin router with security
app.include_router(admin_router)

# Debug logging
print("🚀 Starting Story Twister API...")
print(f"📡 GROQ_CLIENT available: {GROQ_CLIENT is not None}")
print("🔐 Admin router mounted at /api/v1/admin")

# CORS middleware for frontend communication
print("🌐 Setting up CORS middleware...")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://127.0.0.1:3000",  # Original frontend
        "http://localhost:5173", "http://127.0.0.1:5173"   # Frontend2
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)
print("✅ CORS middleware configured")

# Add cache-busting middleware to force fresh requests
@app.middleware("http")
async def add_cache_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Pydantic models for API
class SessionJoinResponse(BaseModel):
    team: dict
    session: dict
    members_count: int

class StoryCreate(BaseModel):
    title: str
    initial_prompt: Optional[str] = None

class StoryResponse(BaseModel):
    id: str
    title: str
    initial_prompt: str
    current_turn: int
    status: str
    created_at: datetime

class TurnResponse(BaseModel):
    id: str
    story_id: str
    author_name: str
    content: str
    is_twist: bool
    turn_number: int
    created_at: datetime

class AddSentenceRequest(BaseModel):
    story_id: str
    content: str

class TwistRequest(BaseModel):
    story_id: str

class StoryStatusResponse(BaseModel):
    id: str
    status: str
    current_turn: int
    total_turns: int
    time_remaining_seconds: int
    is_completed: bool

class SessionAnalysisResponse(BaseModel):
    creativity_score: int
    engagement_score: int
    collaboration_score: int
    creativity_feedback: str
    engagement_feedback: str
    collaboration_feedback: str
    total_turns: int
    unique_participants: int
    session_duration_minutes: int

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

# Event Mode header validation
async def get_event_headers(
    x_event_mode: Optional[str] = Header(None),
    x_nickname: Optional[str] = Header(None),
    x_team_code: Optional[str] = Header(None),
    x_event_session: Optional[str] = Header(None)
):
    if not x_event_mode or x_event_mode.lower() != "true":
        raise HTTPException(status_code=401, detail="Event mode required")
    if not x_nickname:
        raise HTTPException(status_code=401, detail="Nickname required")
    if not x_team_code:
        raise HTTPException(status_code=401, detail="Team code required")
    
    return {
        "nickname": x_nickname,
        "team_code": x_team_code,
        "event_session": x_event_session
    }

@app.post("/api/v1/sessions/join", response_model=SessionJoinResponse)
async def join_session(
    db: AsyncSession = Depends(get_db),
    headers: dict = Depends(get_event_headers)
):
    """Join or create a team session"""
    team_code = headers["team_code"]
    nickname = headers["nickname"]
    
    # Find or create team
    result = await db.execute(select(Team).where(Team.code == team_code))
    team = result.scalar_one_or_none()
    
    if not team:
        team = Team(
            id=uuid.uuid4(),
            code=team_code,
            name=f"Team {team_code}",
            created_at=datetime.utcnow()
        )
        db.add(team)
        await db.flush()
    
    # Find existing session for this team
    result = await db.execute(
        select(Session).where(Session.team_id == team.id)
        .order_by(desc(Session.id))
    )
    session = result.scalar_one_or_none()
    
    # Check if session exists but is in WAITING state
    if session and session.status == SessionStatus.WAITING:
        raise HTTPException(
            status_code=403, 
            detail="Session is waiting to be started by admin. Please wait for the session to begin."
        )
    
    # Find or create active session
    if not session or session.status != SessionStatus.ACTIVE:
        session = Session(
            id=uuid.uuid4(),
            team_id=team.id,
            started_at=datetime.utcnow(),
            status=SessionStatus.ACTIVE
        )
        db.add(session)
        await db.flush()
    
    await db.commit()
    
    # Mock members count (in real app, track active members)
    members_count = 3
    
    return SessionJoinResponse(
        team={
            "id": str(team.id),
            "code": team.code,
            "name": team.name,
            "created_at": team.created_at.isoformat()
        },
        session={
            "id": str(session.id),
            "team_id": str(session.team_id),
            "started_at": session.started_at.isoformat(),
            "status": session.status
        },
        members_count=members_count
    )

@app.get("/api/v1/stories")
async def get_stories(
    team_code: Optional[str] = None,
    team_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    headers: dict = Depends(get_event_headers)
):
    """Get stories with optional filters"""
    query = select(Story)
    
    if team_code:
        # Look up team by code first, then filter by team_id
        team_query = select(Team).where(Team.code == team_code)
        team_result = await db.execute(team_query)
        team = team_result.scalar_one_or_none()
        if team:
            query = query.where(Story.team_id == team.id)
        else:
            # No team found with this code, return empty list
            return []
    elif team_id:
        # Direct UUID lookup (for backward compatibility)
        try:
            query = query.where(Story.team_id == uuid.UUID(team_id))
        except ValueError:
            # Invalid UUID format, return empty list
            return []
    
    if status:
        if status == "active":
            query = query.where(Story.status == StoryStatus.ACTIVE)
        elif status == "completed":
            query = query.where(Story.status == StoryStatus.COMPLETED)
    
    result = await db.execute(query)
    stories = result.scalars().all()
    
    return [
        StoryResponse(
            id=str(story.id),
            title=story.title,
            initial_prompt=story.initial_prompt,
            current_turn=story.current_turn,
            status=story.status,
            created_at=story.created_at
        )
        for story in stories
    ]

@app.post("/api/v1/stories", response_model=StoryResponse)
async def create_story(
    story_data: StoryCreate,
    db: AsyncSession = Depends(get_db),
    headers: dict = Depends(get_event_headers)
):
    """Create a new story and first turn with predefined starter"""
    team_code = headers["team_code"]
    
    # Find team
    result = await db.execute(select(Team).where(Team.code == team_code))
    team = result.scalar_one_or_none()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Use provided initial_prompt or select random starter prompt
    starter_prompt = story_data.initial_prompt or random.choice(STARTER_PROMPTS)
    
    # Create story with timer start
    now = datetime.utcnow()
    story = Story(
        id=uuid.uuid4(),
        team_id=team.id,
        title=story_data.title,
        initial_prompt=starter_prompt,
        current_turn=1,
        status=StoryStatus.ACTIVE,
        created_at=now,
        started_at=now
    )
    db.add(story)
    await db.flush()
    
    # Create first turn by StoryBot with starter prompt
    first_turn = Turn(
        id=uuid.uuid4(),
        story_id=story.id,
        author_name="StoryBot",
        content=starter_prompt,
        is_twist=False,
        turn_number=1,
        created_at=now
    )
    db.add(first_turn)
    
    await db.commit()
    
    return StoryResponse(
        id=str(story.id),
        title=story.title,
        initial_prompt=story.initial_prompt,
        current_turn=story.current_turn,
        status=story.status,
        created_at=story.created_at
    )

@app.get("/api/v1/stories/{story_id}/turns")
async def get_story_turns(
    story_id: str,
    db: AsyncSession = Depends(get_db),
    headers: dict = Depends(get_event_headers)
):
    """Get all turns for a story"""
    result = await db.execute(
        select(Story).options(selectinload(Story.turns)).where(Story.id == uuid.UUID(story_id))
    )
    story = result.scalar_one_or_none()
    
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    return [
        TurnResponse(
            id=str(turn.id),
            story_id=str(turn.story_id),
            author_name=turn.author_name,
            content=turn.content,
            is_twist=turn.is_twist,
            turn_number=turn.turn_number,
            created_at=turn.created_at
        )
        for turn in sorted(story.turns, key=lambda t: t.turn_number)
    ]

@app.post("/api/v1/stories/add-sentence")
async def add_sentence(
    request: AddSentenceRequest,
    db: AsyncSession = Depends(get_db),
    headers: dict = Depends(get_event_headers)
):
    """Add a sentence to continue the story"""
    nickname = headers["nickname"]
    
    # Find story
    try:
        story_uuid = uuid.UUID(request.story_id)
    except ValueError:
        print(f"❌ Invalid story ID format: {request.story_id}")
        raise HTTPException(status_code=400, detail=f"Invalid story ID format: {request.story_id}")
    
    result = await db.execute(select(Story).where(Story.id == story_uuid))
    story = result.scalar_one_or_none()
    
    if not story:
        print(f"❌ Story not found: {request.story_id}")
        raise HTTPException(status_code=404, detail=f"Story not found: {request.story_id}")
    
    # Check if session time has expired
    now = datetime.utcnow()
    elapsed_seconds = (now - story.started_at).total_seconds()
    if elapsed_seconds >= SESSION_DURATION_SECONDS:
        story.status = StoryStatus.COMPLETED
        await db.commit()
        raise HTTPException(status_code=400, detail="Session has ended")
    
    if story.status != StoryStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Story is not active")
    
    # Create new turn
    new_turn_number = story.current_turn + 1
    turn = Turn(
        id=uuid.uuid4(),
        story_id=story.id,
        author_name=nickname,
        content=request.content,
        is_twist=False,
        turn_number=new_turn_number,
        created_at=datetime.utcnow()
    )
    db.add(turn)
    
    # Update story current turn
    story.current_turn = new_turn_number
    
    await db.commit()
    
    # Check if we need to auto-trigger a twist (after 2 user turns)
    # Count user turns since last twist
    result = await db.execute(
        select(Turn).where(Turn.story_id == story.id).order_by(Turn.turn_number)
    )
    all_turns = result.scalars().all()
    
    # Find last twist index
    last_twist_index = -1
    for i, turn in enumerate(all_turns):
        if turn.is_twist:
            last_twist_index = i
    
    # Count user turns since last twist
    user_turns_since_twist = 0
    turns_to_check = all_turns[last_twist_index + 1:] if last_twist_index >= 0 else all_turns
    for turn in turns_to_check:
        if turn.author_name != "StoryBot" and not turn.is_twist:
            user_turns_since_twist += 1
    
    # Auto-trigger twist if we have 2 or more user turns since last twist
    if user_turns_since_twist >= 2:
        print(f"🌪️ Auto-triggering twist after {user_turns_since_twist} user turns")
        
        # Generate story content for AI twist
        story_content = "\n".join([turn.content for turn in all_turns])
        twist_content = await generate_ai_twist(story_content)
        
        # Create twist turn
        twist_turn_number = story.current_turn + 1
        twist_turn = Turn(
            id=uuid.uuid4(),
            story_id=story.id,
            author_name="StoryBot",
            content=twist_content,
            is_twist=True,
            turn_number=twist_turn_number,
            created_at=datetime.utcnow()
        )
        db.add(twist_turn)
        
        # Update story current turn
        story.current_turn = twist_turn_number
        
        await db.commit()
        
        return {"message": "Sentence added and twist triggered", "turn_number": new_turn_number, "twist_added": True}
    
    return {"message": "Sentence added successfully", "turn_number": new_turn_number}

async def generate_ai_twist(story_content: str) -> str:
    """Generate an AI twist using Groq API or fallback to canned twist"""
    if not GROQ_CLIENT:
        return "🌪️ Suddenly, the unexpected happened and everything changed..."
    
    try:
        # Create a prompt for the AI to generate a twist
        prompt = f"""You are a creative storytelling assistant. Given the following story excerpt, generate a single dramatic plot twist sentence that would surprise readers and change the direction of the story. The twist should be unexpected but logical within the story context.

Story so far:
{story_content}

Generate only the twist sentence (no quotes, no explanations):"""

        response = GROQ_CLIENT.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-70b-8192",
            max_tokens=100,
            temperature=0.8
        )
        
        twist = response.choices[0].message.content.strip()
        return f"🌪️ {twist}" if not twist.startswith("🌪️") else twist
        
    except Exception as e:
        print(f"Groq API error: {e}")
        return "🌪️ Suddenly, the unexpected happened and everything changed..."

@app.post("/api/v1/stories/twist")
async def add_twist(
    request: TwistRequest,
    db: AsyncSession = Depends(get_db),
    headers: dict = Depends(get_event_headers)
):
    """Add a twist to the story"""
    nickname = headers["nickname"]
    
    # Find story
    result = await db.execute(select(Story).options(selectinload(Story.turns)).where(Story.id == uuid.UUID(request.story_id)))
    story = result.scalar_one_or_none()
    
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    if story.status != StoryStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Story is not active")
    
    # Generate AI twist
    story_content = "\n".join([turn.content for turn in story.turns])
    twist_content = await generate_ai_twist(story_content)
    
    # Create twist turn
    new_turn_number = story.current_turn + 1
    turn = Turn(
        id=uuid.uuid4(),
        story_id=story.id,
        author_name=f"{nickname} (Twist)",
        content=twist_content,
        is_twist=True,
        turn_number=new_turn_number,
        created_at=datetime.utcnow()
    )
    db.add(turn)
    
    # Update story current turn
    story.current_turn = new_turn_number
    
    await db.commit()
    
    return {"message": "Twist added successfully", "turn_number": new_turn_number}

@app.get("/api/v1/stories/{story_id}/status", response_model=StoryStatusResponse)
async def get_story_status(
    story_id: str,
    db: AsyncSession = Depends(get_db),
    headers: dict = Depends(get_event_headers)
):
    result = await db.execute(
        select(Story).options(selectinload(Story.turns)).where(Story.id == uuid.UUID(story_id))
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Calculate time remaining and check if session is completed
    now = datetime.utcnow()
    elapsed_seconds = (now - story.started_at).total_seconds()
    time_remaining_seconds = max(0, SESSION_DURATION_SECONDS - elapsed_seconds)
    
    # Auto-complete story if time is up
    is_completed = time_remaining_seconds <= 0
    if is_completed and story.status == StoryStatus.ACTIVE:
        story.status = StoryStatus.COMPLETED
        await db.commit()
    
    status_value = story.status.value if hasattr(story.status, "value") else str(story.status)
    total_turns = len(story.turns) if hasattr(story, "turns") and story.turns is not None else story.current_turn
    
    return StoryStatusResponse(
        id=str(story.id),
        status=status_value,
        current_turn=story.current_turn,
        total_turns=total_turns,
        time_remaining_seconds=int(time_remaining_seconds),
        is_completed=is_completed
    )

@app.get("/debug/routes")
async def debug_routes():
    """Debug endpoint to list all registered routes"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else []
            })
    return {"routes": routes}

@app.get("/api/v1/debug/test")
async def debug_test():
    """Simple test endpoint to verify API routes work"""
    return {"message": "API routes are working", "timestamp": datetime.utcnow()}

async def generate_session_analysis(story_content: str, turns: list, session_duration_minutes: int) -> dict:
    """Generate AI-powered session analysis with creativity, engagement, and collaboration scores"""
    
    # Calculate basic metrics
    total_turns = len([t for t in turns if not t.is_twist])
    unique_participants = len(set([t.author_name for t in turns if not t.is_twist and t.author_name != "StoryBot"]))
    
    # Creativity Analysis
    creativity_score = min(100, max(20, 
        len(set(story_content.split())) * 2 +  # Unique vocabulary
        len([t for t in turns if t.is_twist]) * 15 +  # Twist integration
        min(30, len(turns) * 3)  # Story length bonus
    ))
    
    # Engagement Analysis  
    avg_turns_per_participant = total_turns / max(1, unique_participants)
    engagement_score = min(100, max(15,
        int(avg_turns_per_participant * 20) +  # Participation rate
        min(40, total_turns * 4) +  # Activity level
        min(20, session_duration_minutes)  # Time utilization
    ))
    
    # Collaboration Analysis
    turn_transitions = 0
    prev_author = None
    for turn in turns:
        if not turn.is_twist and turn.author_name != "StoryBot":
            if prev_author and prev_author != turn.author_name:
                turn_transitions += 1
            prev_author = turn.author_name
    
    collaboration_score = min(100, max(10,
        turn_transitions * 15 +  # Smooth handoffs
        (unique_participants - 1) * 20 +  # Team diversity
        min(30, len(story_content.split()) // 10)  # Story coherence
    ))
    
    # Generate AI feedback if Groq is available
    if GROQ_CLIENT:
        try:
            analysis_prompt = f"""
            Analyze this collaborative storytelling session and provide brief, encouraging feedback:

            Story Content: {story_content[:500]}...
            Total Turns: {total_turns}
            Participants: {unique_participants}
            Duration: {session_duration_minutes} minutes
            
            Provide 2-3 sentence feedback for each category:
            1. Creativity (score: {creativity_score}/100)
            2. Engagement (score: {engagement_score}/100) 
            3. Collaboration (score: {collaboration_score}/100)
            
            Keep feedback positive and constructive.
            """
            
            completion = GROQ_CLIENT.chat.completions.create(
                model="llama3-70b-8192",
                messages=[{"role": "user", "content": analysis_prompt}],
                max_tokens=300,
                temperature=0.7
            )
            
            ai_feedback = completion.choices[0].message.content.strip()
            feedback_lines = ai_feedback.split('\n')
            
            creativity_feedback = next((line for line in feedback_lines if 'creativity' in line.lower()), 
                                     f"Great creative vocabulary with {len(set(story_content.split()))} unique words! The story shows imaginative storytelling.")
            engagement_feedback = next((line for line in feedback_lines if 'engagement' in line.lower()), 
                                     f"Strong participation with {avg_turns_per_participant:.1f} turns per person on average!")
            collaboration_feedback = next((line for line in feedback_lines if 'collaboration' in line.lower()), 
                                        f"Excellent teamwork with {turn_transitions} smooth transitions between {unique_participants} participants!")
            
        except Exception as e:
            print(f"AI feedback generation failed: {e}")
            # Fallback to template feedback
            creativity_feedback = f"Great creative vocabulary with {len(set(story_content.split()))} unique words! The story shows imaginative storytelling."
            engagement_feedback = f"Strong participation with {avg_turns_per_participant:.1f} turns per person on average!"
            collaboration_feedback = f"Excellent teamwork with {turn_transitions} smooth transitions between {unique_participants} participants!"
    else:
        # Fallback feedback when no AI available
        creativity_feedback = f"Great creative vocabulary with {len(set(story_content.split()))} unique words! The story shows imaginative storytelling."
        engagement_feedback = f"Strong participation with {avg_turns_per_participant:.1f} turns per person on average!"
        collaboration_feedback = f"Excellent teamwork with {turn_transitions} smooth transitions between {unique_participants} participants!"
    
    return {
        "creativity_score": creativity_score,
        "engagement_score": engagement_score, 
        "collaboration_score": collaboration_score,
        "creativity_feedback": creativity_feedback,
        "engagement_feedback": engagement_feedback,
        "collaboration_feedback": collaboration_feedback,
        "total_turns": total_turns,
        "unique_participants": unique_participants,
        "session_duration_minutes": session_duration_minutes
    }

@app.get("/api/v1/stories/{story_id}/analysis", response_model=SessionAnalysisResponse)
async def get_session_analysis(
    story_id: str,
    db: AsyncSession = Depends(get_db),
    headers: dict = Depends(get_event_headers)
):
    """Get or generate session analysis for a completed story"""
    
    # Get story with turns
    result = await db.execute(
        select(Story).options(selectinload(Story.turns)).where(Story.id == uuid.UUID(story_id))
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Check if analysis already exists
    existing_analysis = await db.execute(
        select(SessionAnalysis).where(SessionAnalysis.story_id == uuid.UUID(story_id))
    )
    analysis = existing_analysis.scalar_one_or_none()
    
    if analysis:
        # Return existing analysis
        return SessionAnalysisResponse(
            creativity_score=analysis.creativity_score,
            engagement_score=analysis.engagement_score,
            collaboration_score=analysis.collaboration_score,
            creativity_feedback=analysis.creativity_feedback,
            engagement_feedback=analysis.engagement_feedback,
            collaboration_feedback=analysis.collaboration_feedback,
            total_turns=analysis.total_turns,
            unique_participants=analysis.unique_participants,
            session_duration_minutes=analysis.session_duration_minutes
        )
    
    # Generate new analysis
    story_content = story.initial_prompt + " " + " ".join([turn.content for turn in story.turns])
    session_duration = int((datetime.utcnow() - story.started_at).total_seconds() / 60)
    
    analysis_data = await generate_session_analysis(story_content, story.turns, session_duration)
    
    # Save analysis to database
    new_analysis = SessionAnalysis(
        id=uuid.uuid4(),
        story_id=story.id,
        creativity_score=analysis_data["creativity_score"],
        engagement_score=analysis_data["engagement_score"],
        collaboration_score=analysis_data["collaboration_score"],
        creativity_feedback=analysis_data["creativity_feedback"],
        engagement_feedback=analysis_data["engagement_feedback"],
        collaboration_feedback=analysis_data["collaboration_feedback"],
        total_turns=analysis_data["total_turns"],
        unique_participants=analysis_data["unique_participants"],
        session_duration_minutes=analysis_data["session_duration_minutes"]
    )
    
    db.add(new_analysis)
    await db.commit()
    
    return SessionAnalysisResponse(**analysis_data)


# Leaderboard Models
class LeaderboardTeam(BaseModel):
    team_code: str
    team_name: str
    participants: int
    stories_completed: int
    total_turns: int
    twist_count: int = 0
    user_turns: int = 0
    avg_creativity_score: Optional[float] = None
    avg_engagement_score: Optional[float] = None
    avg_collaboration_score: Optional[float] = None
    last_active: Optional[datetime] = None
    session_status: str = "active"  # active or completed
    session_ended_at: Optional[datetime] = None


class LeaderboardResponse(BaseModel):
    teams: List[LeaderboardTeam]
    total_teams: int


@app.get("/api/v1/leaderboard/teams", response_model=LeaderboardResponse)
async def get_leaderboard_teams(
    db: AsyncSession = Depends(get_db),
    x_event_mode: str = Header(..., alias="X-Event-Mode"),
    x_nickname: str = Header(..., alias="X-Nickname"), 
    x_team_code: str = Header(..., alias="X-Team-Code"),
    x_event_session: str = Header(..., alias="X-Event-Session")
):
    """Get leaderboard of all teams with their stats"""
    
    # Get all teams with their stories, turns, and analyses
    query = select(Team).options(
        selectinload(Team.sessions),
        selectinload(Team.stories).selectinload(Story.turns),
        selectinload(Team.stories).selectinload(Story.analyses)
    )
    
    result = await db.execute(query)
    teams = result.scalars().all()
    
    leaderboard_teams = []
    
    for team in teams:
        # Calculate team stats
        total_stories = 0
        total_turns = 0
        total_twist_turns = 0
        total_user_turns = 0
        creativity_scores = []
        engagement_scores = []
        collaboration_scores = []
        participants = set()
        last_active = None
        
        # Track session status - get the most recent session
        session_status = "active"
        session_ended_at = None
        if team.sessions:
            latest_session = max(team.sessions, key=lambda s: s.started_at)
            session_status = latest_session.status
            session_ended_at = latest_session.ended_at
        
        # Process team's stories directly (not through sessions)
        for story in team.stories:
            if story.status == StoryStatus.COMPLETED:
                total_stories += 1
            
            # Count turns and participants
            for turn in story.turns:
                total_turns += 1  # Count all turns
                if turn.is_twist or turn.author_name == "StoryTwister":
                    total_twist_turns += 1
                elif turn.author_name != "StoryBot":
                    total_user_turns += 1
                    participants.add(turn.author_name)
            
            # Get analysis scores
            for analysis in story.analyses:
                creativity_scores.append(analysis.creativity_score)
                engagement_scores.append(analysis.engagement_score)
                collaboration_scores.append(analysis.collaboration_score)
            
            # Track last activity (use created_at since updated_at doesn't exist)
            if story.created_at:
                if not last_active or story.created_at > last_active:
                    last_active = story.created_at
        
        # Calculate averages
        avg_creativity = sum(creativity_scores) / len(creativity_scores) if creativity_scores else None
        avg_engagement = sum(engagement_scores) / len(engagement_scores) if engagement_scores else None
        avg_collaboration = sum(collaboration_scores) / len(collaboration_scores) if collaboration_scores else None
        
        leaderboard_teams.append(LeaderboardTeam(
            team_code=team.code,
            team_name=team.name,
            participants=len(participants),
            stories_completed=total_stories,
            total_turns=total_turns,
            twist_count=total_twist_turns,
            user_turns=total_user_turns,
            avg_creativity_score=avg_creativity,
            avg_engagement_score=avg_engagement,
            avg_collaboration_score=avg_collaboration,
            last_active=last_active,
            session_status=session_status,
            session_ended_at=session_ended_at
        ))
    
    # Sort by stories completed (descending), then by total turns (descending)
    leaderboard_teams.sort(key=lambda x: (x.stories_completed, x.total_turns), reverse=True)
    
    return LeaderboardResponse(
        teams=leaderboard_teams,
        total_teams=len(leaderboard_teams)
    )


@app.post("/api/v1/sessions/{session_id}/complete")
async def complete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    headers: dict = Depends(get_event_headers)
):
    """Mark a session as completed when all team members exit"""
    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    
    # Get the session
    query = select(Session).where(Session.id == session_uuid)
    result = await db.execute(query)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Mark session as completed
    session.status = SessionStatus.COMPLETED
    session.ended_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Session completed successfully", "ended_at": session.ended_at}
