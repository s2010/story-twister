"""
Admin Router for Story-Twister Admin Console
Provides all admin APIs for event management, room control, and exports
"""

import os
import csv
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, delete
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from database import get_db
from models import Team, Session, Story, Turn, SessionAnalysis, SessionStatus, StoryStatus
from admin_security import verify_admin, AdminUser, log_admin_action, add_admin_headers

# Initialize router
router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

# Pydantic models for admin APIs
class BootstrapRequest(BaseModel):
    team_codes: List[str]
    duration_minutes: int = 10

class CreateRoomRequest(BaseModel):
    team_code: str
    team_name: str = None

class TimerRequest(BaseModel):
    duration_minutes: int

class TeamResponse(BaseModel):
    team_code: str
    session_id: str
    join_url: str
    qr_code_url: str

class BootstrapResponse(BaseModel):
    teams: List[TeamResponse]

class TeamSnapshot(BaseModel):
    team_code: str
    display_name: str
    session_id: str
    members: int
    status: str  # waiting|active|completed
    time_remaining_seconds: int
    last_two_messages: List[Dict[str, Any]]
    twist_count: int
    join_url: str
    qr_code_url: str

class SnapshotResponse(BaseModel):
    teams: List[TeamSnapshot]
    total_teams: int
    active_sessions: int
    completed_sessions: int
    total_stories: int
    total_turns: int

def generate_join_url(team_code: str) -> str:
    """Generate join URL for team"""
    base_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    return f"{base_url}/?team={team_code}&mode=event"

def generate_qr_code_url(team_code: str) -> str:
    """Generate QR code URL for team join"""
    join_url = generate_join_url(team_code)
    # Using a simple QR code service - in production, you might want to use your own
    return f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={join_url}"

@router.post("/event/bootstrap", response_model=BootstrapResponse)
async def bootstrap_event(
    request: Request,
    bootstrap_data: BootstrapRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Bootstrap event with multiple teams"""
    
    teams_created = []
    
    for team_name in bootstrap_data.team_codes:
        # Create team with friendly code
        team_code = team_name.lower().replace(' ', '_').replace('-', '_')
        
        # Check if team already exists
        existing_team = await db.execute(
            select(Team).where(Team.code == team_code)
        )
        team = existing_team.scalar_one_or_none()
        
        if not team:
            # Create new team
            team = Team(
                code=team_code,
                name=f"Team {team_name.title()}"
            )
            db.add(team)
            await db.flush()  # Get the ID
        
        # Create or get active session
        existing_session = await db.execute(
            select(Session).where(
                Session.team_id == team.id,
                Session.status == SessionStatus.ACTIVE
            )
        )
        session = existing_session.scalar_one_or_none()
        
        if not session:
            session = Session(
                team_id=team.id,
                status=SessionStatus.ACTIVE
            )
            db.add(session)
            await db.flush()
        
        teams_created.append(TeamResponse(
            team_code=team_code,
            session_id=str(session.id),
            join_url=generate_join_url(team_code),
            qr_code_url=generate_qr_code_url(team_code)
        ))
    
    await db.commit()
    
    # Log admin action
    await log_admin_action(
        db, admin_user, 'bootstrap',
        payload={'team_codes': bootstrap_data.team_codes},
        request=request
    )
    
    response = BootstrapResponse(teams=teams_created)
    return response

@router.post("/rooms", response_model=TeamResponse)
async def create_room(
    request: Request,
    room_data: CreateRoomRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Create a single room/team"""
    
    team_code = room_data.team_code.lower().replace(' ', '_').replace('-', '_')
    team_name = room_data.team_name or room_data.team_code.title()
    
    # Check if team already exists
    existing_team = await db.execute(
        select(Team).where(Team.code == team_code)
    )
    team = existing_team.scalar_one_or_none()
    
    if not team:
        team = Team(
            code=team_code,
            name=f"Team {team_name}"
        )
        db.add(team)
        await db.flush()
    
    # Create session
    session = Session(
        team_id=team.id,
        status=SessionStatus.ACTIVE
    )
    db.add(session)
    await db.flush()
    await db.commit()
    
    # Log admin action
    await log_admin_action(
        db, admin_user, 'create_room',
        team_code=team_code,
        payload={'team_code': room_data.team_code, 'team_name': room_data.team_name},
        request=request
    )
    
    return TeamResponse(
        team_code=team_code,
        session_id=str(session.id),
        join_url=generate_join_url(team_code),
        qr_code_url=generate_qr_code_url(team_code)
    )

@router.get("/snapshot", response_model=SnapshotResponse)
async def get_snapshot(
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Get snapshot of all rooms/teams"""
    
    # Get all active sessions with teams and stories
    result = await db.execute(
        select(Session, Team)
        .join(Team, Session.team_id == Team.id)
        .where(Session.status == SessionStatus.ACTIVE)
        .options(selectinload(Session.team))
    )
    
    sessions_teams = result.all()
    teams_snapshot = []
    
    for session, team in sessions_teams:
        # Get active story for this team
        story_result = await db.execute(
            select(Story).where(
                Story.team_id == team.id,
                Story.status == StoryStatus.ACTIVE
            )
            .options(selectinload(Story.turns))
            .order_by(Story.created_at.desc())
        )
        story = story_result.scalars().first()
        
        # Calculate time remaining
        time_remaining_seconds = 0
        if story and hasattr(story, 'started_at') and story.started_at:
            duration_minutes = 10  # Default duration
            end_time = story.started_at + timedelta(minutes=duration_minutes)
            time_remaining_seconds = max(0, int((end_time - datetime.utcnow()).total_seconds()))
        
        # Get last two messages
        last_messages = []
        twist_count = 0
        if story and story.turns:
            # Sort turns by turn_number descending and take last 2
            sorted_turns = sorted(story.turns, key=lambda t: t.turn_number, reverse=True)[:2]
            for turn in reversed(sorted_turns):  # Reverse to show chronological order
                last_messages.append({
                    'author': turn.author_name,
                    'is_twist': turn.is_twist,
                    'content': turn.content[:100] + '...' if len(turn.content) > 100 else turn.content
                })
            
            twist_count = sum(1 for turn in story.turns if turn.is_twist)
        
        # Estimate member count (simplified)
        members_count = 1  # Default assumption
        if story and story.turns:
            unique_authors = set(turn.author_name for turn in story.turns if not turn.is_twist)
            members_count = len(unique_authors)
        
        # Determine status
        status = "waiting"
        if story:
            if time_remaining_seconds <= 0:
                status = "completed"
            elif story.turns and len(story.turns) > 1:
                status = "active"
        
        teams_snapshot.append(TeamSnapshot(
            team_code=team.code,
            display_name=team.name,
            session_id=str(session.id),
            members=members_count,
            status=status,
            time_remaining_seconds=time_remaining_seconds,
            last_two_messages=last_messages,
            twist_count=twist_count,
            join_url=generate_join_url(team.code),
            qr_code_url=generate_qr_code_url(team.code)
        ))
    
    # Calculate statistics
    total_teams = len(teams_snapshot)
    active_sessions = sum(1 for team in teams_snapshot if team.status == "active")
    completed_sessions = sum(1 for team in teams_snapshot if team.status == "completed")
    
    # Get total stories and turns from database
    total_stories_result = await db.execute(select(func.count(Story.id)))
    total_stories = total_stories_result.scalar() or 0
    
    total_turns_result = await db.execute(select(func.count(Turn.id)))
    total_turns = total_turns_result.scalar() or 0
    
    return SnapshotResponse(
        teams=teams_snapshot,
        total_teams=total_teams,
        active_sessions=active_sessions,
        completed_sessions=completed_sessions,
        total_stories=total_stories,
        total_turns=total_turns
    )

@router.post("/rooms/{team_code}/start")
async def start_room(
    team_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Start a room/session"""
    
    # Get team
    team_result = await db.execute(
        select(Team).where(Team.code == team_code)
    )
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if there's already an active story
    story_result = await db.execute(
        select(Story).where(
            Story.team_id == team.id,
            Story.status == StoryStatus.ACTIVE
        )
    )
    existing_story = story_result.scalar_one_or_none()
    
    if existing_story:
        return {"message": "Story already active", "story_id": str(existing_story.id)}
    
    # Create new story with starter prompt
    starter_prompts = [
        "In a world where dreams become reality, a young inventor discovers...",
        "The last library on Earth holds a secret that could change everything...",
        "When the clocktower struck thirteen, something extraordinary happened...",
        "Deep in the enchanted forest, an ancient magic awakens...",
        "The mysterious package arrived exactly at midnight, containing..."
    ]
    
    import random
    initial_prompt = random.choice(starter_prompts)
    
    story = Story(
        team_id=team.id,
        title=f"{team.name} Adventure",
        initial_prompt=initial_prompt,
        current_turn=1,
        status=StoryStatus.ACTIVE,
        started_at=datetime.utcnow()
    )
    db.add(story)
    await db.flush()
    
    # Add the initial turn from StoryBot
    initial_turn = Turn(
        story_id=story.id,
        author_name="StoryBot",
        content=initial_prompt,
        is_twist=False,
        turn_number=1
    )
    db.add(initial_turn)
    await db.commit()
    
    # Log admin action
    await log_admin_action(
        db, admin_user, 'start_session',
        team_code=team_code,
        payload={'story_id': str(story.id)},
        request=request
    )
    
    return {"message": "Story started", "story_id": str(story.id)}

@router.post("/rooms/{team_code}/twist")
async def inject_twist(
    team_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Inject a twist into the story"""
    
    # Get team and active story
    team_result = await db.execute(
        select(Team).where(Team.code == team_code)
    )
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    story_result = await db.execute(
        select(Story)
        .where(
            Story.team_id == team.id,
            Story.status == StoryStatus.ACTIVE
        )
        .options(selectinload(Story.turns))
    )
    story = story_result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="No active story found")
    
    # Get last 3 turns for context
    recent_turns = sorted(story.turns, key=lambda t: t.turn_number, reverse=True)[:3]
    context = " ".join([turn.content for turn in reversed(recent_turns)])
    
    # Generate twist (use Groq if available, otherwise fallback)
    twist_content = "🌪️ Suddenly, an unexpected twist changes everything..."
    
    # Try to use Groq for AI-generated twist
    groq_api_key = os.getenv('GROQ_API_KEY')
    if groq_api_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_api_key)
            
            prompt = f"""Based on this story context, write a creative plot twist in 1-2 sentences:
            
Context: {context}

Write a surprising but logical twist that adds excitement to the story. Start with an emoji that fits the twist."""
            
            response = client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                temperature=0.8
            )
            
            if response.choices:
                twist_content = response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq API error: {e}")
            # Fall back to default twist
    
    # Add twist turn
    next_turn_number = max([turn.turn_number for turn in story.turns]) + 1
    twist_turn = Turn(
        story_id=story.id,
        author_name="StoryBot",
        content=twist_content,
        is_twist=True,
        turn_number=next_turn_number
    )
    db.add(twist_turn)
    
    story.current_turn = next_turn_number
    await db.commit()
    
    # Log admin action
    await log_admin_action(
        db, admin_user, 'inject_twist',
        team_code=team_code,
        payload={'story_id': str(story.id), 'twist_content': twist_content},
        request=request
    )
    
    return {"message": "Twist injected", "twist_content": twist_content}

@router.post("/rooms/{team_code}/timer")
async def update_timer(
    team_code: str,
    timer_data: TimerRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Update timer duration for a room"""
    
    # Get team and active story
    team_result = await db.execute(
        select(Team).where(Team.code == team_code)
    )
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    story_result = await db.execute(
        select(Story).where(
            Story.team_id == team.id,
            Story.status == StoryStatus.ACTIVE
        )
    )
    story = story_result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="No active story found")
    
    # Update the story's started_at to extend/reduce time
    new_end_time = datetime.utcnow() + timedelta(minutes=timer_data.duration_minutes)
    story.started_at = new_end_time - timedelta(minutes=timer_data.duration_minutes)
    await db.commit()
    
    # Log admin action
    await log_admin_action(
        db, admin_user, 'update_timer',
        team_code=team_code,
        payload={'duration_minutes': timer_data.duration_minutes},
        request=request
    )
    
    return {"message": f"Timer updated to {timer_data.duration_minutes} minutes"}

@router.post("/rooms/{team_code}/end")
async def end_room(
    team_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Force end a room/session"""
    
    # Get team and active story
    team_result = await db.execute(
        select(Team).where(Team.code == team_code)
    )
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    story_result = await db.execute(
        select(Story).where(
            Story.team_id == team.id,
            Story.status == StoryStatus.ACTIVE
        )
    )
    story = story_result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="No active story found")
    
    # End the story
    story.status = StoryStatus.COMPLETED
    
    # End the session
    session_result = await db.execute(
        select(Session).where(
            Session.team_id == team.id,
            Session.status == SessionStatus.ACTIVE
        )
    )
    session = session_result.scalar_one_or_none()
    if session:
        session.status = SessionStatus.COMPLETED
    
    await db.commit()
    
    # Log admin action
    await log_admin_action(
        db, admin_user, 'end_session',
        team_code=team_code,
        payload={'story_id': str(story.id)},
        request=request
    )
    
    return {"message": "Session ended", "story_id": str(story.id)}

@router.get("/export/csv")
async def export_csv(
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Export teams and metrics as CSV"""
    
    # Get all teams with their sessions and stories
    result = await db.execute(
        select(Team, Session, Story)
        .outerjoin(Session, Team.id == Session.team_id)
        .outerjoin(Story, Team.id == Story.team_id)
        .options(selectinload(Story.turns))
    )
    
    data = result.all()
    
    # Create CSV content
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Team Code', 'Team Name', 'Session ID', 'Session Status',
        'Story ID', 'Story Status', 'Total Turns', 'Twist Count',
        'Unique Authors', 'Join URL', 'QR Code URL'
    ])
    
    # Write data rows
    for team, session, story in data:
        twist_count = 0
        unique_authors = 0
        total_turns = 0
        
        if story and story.turns:
            total_turns = len(story.turns)
            twist_count = sum(1 for turn in story.turns if turn.is_twist)
            unique_authors = len(set(turn.author_name for turn in story.turns if not turn.is_twist))
        
        writer.writerow([
            team.code,
            team.name,
            str(session.id) if session else '',
            session.status if session else '',
            str(story.id) if story else '',
            story.status if story else '',
            total_turns,
            twist_count,
            unique_authors,
            generate_join_url(team.code),
            generate_qr_code_url(team.code)
        ])
    
    # Return CSV response
    csv_content = output.getvalue()
    output.close()
    
    response = Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=story_twister_export.csv"}
    )
    add_admin_headers(response)
    return response

@router.get("/export/json")
async def export_json(
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Export full event data as JSON"""
    
    # Get all data with relationships
    teams_result = await db.execute(
        select(Team).options(
            selectinload(Team.sessions),
            selectinload(Team.stories).selectinload(Story.turns)
        )
    )
    teams = teams_result.scalars().all()
    
    # Build export data
    export_data = {
        'export_timestamp': datetime.utcnow().isoformat(),
        'teams': []
    }
    
    for team in teams:
        team_data = {
            'id': str(team.id),
            'code': team.code,
            'name': team.name,
            'created_at': team.created_at.isoformat(),
            'sessions': [],
            'stories': []
        }
        
        # Add sessions
        for session in team.sessions:
            team_data['sessions'].append({
                'id': str(session.id),
                'started_at': session.started_at.isoformat(),
                'status': session.status
            })
        
        # Add stories with turns
        for story in team.stories:
            story_data = {
                'id': str(story.id),
                'title': story.title,
                'initial_prompt': story.initial_prompt,
                'status': story.status,
                'created_at': story.created_at.isoformat(),
                'started_at': story.started_at.isoformat() if story.started_at else None,
                'turns': []
            }
            
            # Add turns
            for turn in sorted(story.turns, key=lambda t: t.turn_number):
                story_data['turns'].append({
                    'id': str(turn.id),
                    'turn_number': turn.turn_number,
                    'author_name': turn.author_name,
                    'content': turn.content,
                    'is_twist': turn.is_twist,
                    'created_at': turn.created_at.isoformat()
                })
            
            team_data['stories'].append(story_data)
        
        export_data['teams'].append(team_data)
    
    response = Response(
        content=json.dumps(export_data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=story_twister_full_export.json"}
    )
    add_admin_headers(response)
    return response

# Admin Dashboard, Live View, and Analysis endpoints

class ActiveSessionResponse(BaseModel):
    id: str
    team_code: str
    team_name: str
    participants: int
    status: str
    time_remaining: str
    total_turns: int
    twist_count: int
    started_at: str

class DashboardResponse(BaseModel):
    active_sessions: List[ActiveSessionResponse]
    total_active: int
    total_in_progress: int
    total_waiting: int

@router.get("/dashboard", response_model=DashboardResponse)
async def get_admin_dashboard(
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Get admin dashboard data with active sessions"""
    
    # Get all sessions (active and completed) with team and story data, ordered by newest first
    sessions_result = await db.execute(
        select(Session).options(
            selectinload(Session.team).selectinload(Team.stories).selectinload(Story.turns)
        ).where(Session.status.in_([SessionStatus.WAITING, SessionStatus.ACTIVE, SessionStatus.COMPLETED]))
        .order_by(desc(Session.id))
    )
    sessions = sessions_result.scalars().all()
    
    # Initialize session list and status counts
    active_sessions = []
    status_counts = {
        "waiting": 0,
        "active": 0,
        "completed": 0,
        "in_progress": 0  # Sessions with participants
    }
    
    for session in sessions:
        # Count participants (unique authors in turns)
        participants = set()
        total_turns = 0
        twist_count = 0
        
        # Access stories through the team relationship
        for story in session.team.stories:
            for turn in story.turns:
                if not turn.is_twist:
                    participants.add(turn.author_name)
                else:
                    twist_count += 1
                total_turns += 1
        
        # Determine session status and time remaining
        default_duration = 10  # Default 10 minutes for sessions
        
        if session.status == SessionStatus.WAITING:
            session_status = "waiting"
            time_remaining = f"{default_duration:02d}:00"  # Full duration available
        elif session.status == SessionStatus.COMPLETED:
            session_status = "completed"
            time_remaining = "00:00"
        elif session.started_at:
            # Active session with start time
            elapsed = datetime.utcnow() - session.started_at
            remaining = timedelta(minutes=default_duration) - elapsed
            if remaining.total_seconds() > 0:
                minutes = int(remaining.total_seconds() // 60)
                seconds = int(remaining.total_seconds() % 60)
                time_remaining = f"{minutes:02d}:{seconds:02d}"
                session_status = "active"
            else:
                time_remaining = "00:00"
                session_status = "completed"
        else:
            # Active status but no start time (shouldn't happen)
            session_status = "active"
            time_remaining = f"{default_duration:02d}:00"
        
        # Update status counts
        if session_status == "waiting":
            status_counts["waiting"] += 1
        elif session_status == "active":
            status_counts["active"] += 1
            if len(participants) > 0:
                status_counts["in_progress"] += 1
        elif session_status == "completed":
            status_counts["completed"] += 1
        
        # Include all sessions for admin dashboard (active, waiting, completed)
        if True:  # Show all sessions for admin visibility
            active_sessions.append(ActiveSessionResponse(
                id=str(session.id),
                team_code=session.team.code,
                team_name=session.team.name,
                participants=len(participants),
                status=session_status,
                time_remaining=time_remaining,
                total_turns=total_turns,
                twist_count=twist_count,
                started_at=session.started_at.isoformat() if session.started_at else ""
            ))
            
            status_counts[session_status] += 1
    
    return DashboardResponse(
        active_sessions=active_sessions,
        total_active=status_counts["active"],
        total_in_progress=status_counts["active"],  # Same as active for now
        total_waiting=status_counts["waiting"]
    )

class LiveMessageResponse(BaseModel):
    id: str
    author: str
    content: str
    timestamp: str
    type: str  # 'user', 'twist', 'system'

class SessionInfoResponse(BaseModel):
    id: str
    team_code: str
    team_name: str
    participants: int
    status: str
    time_remaining: str
    total_turns: int
    twist_count: int

class LiveViewResponse(BaseModel):
    session_info: SessionInfoResponse
    messages: List[LiveMessageResponse]

@router.get("/live/{session_id}", response_model=LiveViewResponse)
async def get_live_view(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Get live view data for a specific session"""
    
    # Get session with all related data
    session_result = await db.execute(
        select(Session).options(
            selectinload(Session.team).selectinload(Team.stories).selectinload(Story.turns)
        ).where(Session.id == uuid.UUID(session_id))
    )
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Build messages from turns
    messages = []
    participants = set()
    total_turns = 0
    twist_count = 0
    
    # Access stories through the team relationship
    for story in session.team.stories:
        # Add system message for story start
        if story.initial_prompt:
            messages.append(LiveMessageResponse(
                id=f"system_{story.id}",
                author="System",
                content=f"Story session started. Opening prompt: \"{story.initial_prompt}\"",
                timestamp=story.created_at.isoformat(),
                type="system"
            ))
        
        # Add all turns as messages
        for turn in sorted(story.turns, key=lambda t: t.turn_number):
            if turn.is_twist:
                messages.append(LiveMessageResponse(
                    id=str(turn.id),
                    author="StoryTwister",
                    content=turn.content,
                    timestamp=turn.created_at.isoformat(),
                    type="twist"
                ))
                twist_count += 1
            else:
                messages.append(LiveMessageResponse(
                    id=str(turn.id),
                    author=turn.author_name,
                    content=turn.content,
                    timestamp=turn.created_at.isoformat(),
                    type="user"
                ))
                participants.add(turn.author_name)
            total_turns += 1
    
    # Sort messages by timestamp
    messages.sort(key=lambda m: m.timestamp)
    
    # Calculate time remaining
    time_remaining = "10:00"
    if session.started_at:
        elapsed = datetime.utcnow() - session.started_at
        remaining = timedelta(minutes=10) - elapsed
        if remaining.total_seconds() > 0:
            minutes = int(remaining.total_seconds() // 60)
            seconds = int(remaining.total_seconds() % 60)
            time_remaining = f"{minutes:02d}:{seconds:02d}"
        else:
            time_remaining = "00:00"
    
    session_info = SessionInfoResponse(
        id=str(session.id),
        team_code=session.team.code,
        team_name=session.team.name,
        participants=len(participants),
        status="active" if time_remaining != "00:00" else "completed",
        time_remaining=time_remaining,
        total_turns=total_turns,
        twist_count=twist_count
    )
    
    return LiveViewResponse(
        session_info=session_info,
        messages=messages
    )

class CompletedSessionResponse(BaseModel):
    id: str
    team_code: str
    team_name: str
    completed_at: str
    participants: int
    total_turns: int
    overall_score: int

class SessionAnalysisResponse(BaseModel):
    session_id: str
    team_code: str
    team_name: str
    status: str
    duration: str
    completed_at: Optional[str]
    total_turns: int
    user_turns: int
    twist_count: int
    word_count: int
    participants: List[str]
    creativity_score: int
    engagement_score: int
    collaboration_score: int
    overall_score: int
    participant_contributions: Dict[str, int]
    turn_distribution: Dict[str, int]

class AnalysisListResponse(BaseModel):
    completed_sessions: List[CompletedSessionResponse]

@router.get("/analysis", response_model=AnalysisListResponse)
async def get_analysis_list(
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Get list of completed sessions for analysis"""
    
    # Get completed sessions
    sessions_result = await db.execute(
        select(Session).options(
            selectinload(Session.team).selectinload(Team.stories).selectinload(Story.turns)
        ).where(Session.status == SessionStatus.COMPLETED)
        .order_by(desc(Session.ended_at))
    )
    sessions = sessions_result.scalars().all()
    
    completed_sessions = []
    
    for session in sessions:
        participants = set()
        total_turns = 0
        
        # Access stories through the team relationship
        for story in session.team.stories:
            for turn in story.turns:
                if not turn.is_twist:
                    participants.add(turn.author_name)
                total_turns += 1
        
        # Calculate overall score (simplified)
        overall_score = min(100, 50 + (len(participants) * 10) + (total_turns * 2))
        
        completed_sessions.append(CompletedSessionResponse(
            id=str(session.id),
            team_code=session.team.code,
            team_name=session.team.name,
            completed_at=session.ended_at.isoformat() if session.ended_at else session.started_at.isoformat(),
            participants=len(participants),
            total_turns=total_turns,
            overall_score=overall_score
        ))
    
    return AnalysisListResponse(completed_sessions=completed_sessions)

@router.get("/analysis/{session_id}", response_model=SessionAnalysisResponse)
async def get_session_analysis(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Get detailed analysis for a specific session"""
    
    # Get session with all related data
    session_result = await db.execute(
        select(Session).options(
            selectinload(Session.team),
            selectinload(Session.stories).selectinload(Story.turns)
        ).where(Session.id == uuid.UUID(session_id))
    )
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Analyze session data
    participants = set()
    participant_contributions = {}
    total_turns = 0
    user_turns = 0
    twist_count = 0
    word_count = 0
    
    for story in session.stories:
        for turn in story.turns:
            total_turns += 1
            word_count += len(turn.content.split())
            
            if turn.is_twist:
                twist_count += 1
            else:
                user_turns += 1
                participants.add(turn.author_name)
                participant_contributions[turn.author_name] = participant_contributions.get(turn.author_name, 0) + 1
    
    # Calculate scores (simplified algorithm)
    creativity_score = min(100, 60 + (twist_count * 5) + (len(participants) * 3))
    engagement_score = min(100, 50 + (user_turns * 3))
    collaboration_score = min(100, 40 + (len(participants) * 15))
    overall_score = int((creativity_score + engagement_score + collaboration_score) / 3)
    
    # Calculate duration
    duration = "10:00"  # Default
    if session.started_at and session.ended_at:
        duration_delta = session.ended_at - session.started_at
        minutes = int(duration_delta.total_seconds() // 60)
        seconds = int(duration_delta.total_seconds() % 60)
        duration = f"{minutes}:{seconds:02d}"
    
    return SessionAnalysisResponse(
        session_id=str(session.id),
        team_code=session.team.code,
        team_name=session.team.name,
        status="completed",
        duration=duration,
        completed_at=session.ended_at.isoformat() if session.ended_at else None,
        total_turns=total_turns,
        user_turns=user_turns,
        twist_count=twist_count,
        word_count=word_count,
        participants=list(participants),
        creativity_score=creativity_score,
        engagement_score=engagement_score,
        collaboration_score=collaboration_score,
        overall_score=overall_score,
        participant_contributions=participant_contributions,
        turn_distribution={"user": user_turns, "twist": twist_count}
    )

# Session Management APIs

class CreateSessionRequest(BaseModel):
    team_code: str
    team_name: Optional[str] = None
    duration_minutes: int = 10

class CreateSessionResponse(BaseModel):
    session_id: str
    team_code: str
    team_name: str
    join_url: str
    status: str
    message: str

class DeleteSessionResponse(BaseModel):
    session_id: str
    team_code: str
    status: str
    message: str

@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(
    request: Request,
    session_data: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Create a new chat session/team for storytelling"""
    
    # Validate team code format
    team_code = session_data.team_code.strip().upper()
    if not team_code or len(team_code) < 2:
        raise HTTPException(status_code=422, detail="Team code must be at least 2 characters")
    
    # Check if team already exists
    existing_team = await db.execute(
        select(Team).where(Team.code == team_code)
    )
    if existing_team.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Team with code '{team_code}' already exists")
    
    try:
        # Create new team
        team_name = session_data.team_name or f"Team {team_code}"
        new_team = Team(
            code=team_code,
            name=team_name,
            created_at=datetime.utcnow()
        )
        db.add(new_team)
        await db.flush()  # Get team ID
        
        # Create new session in WAITING state
        new_session = Session(
            id=uuid.uuid4(),
            team_id=new_team.id,
            status=SessionStatus.WAITING,
            started_at=None  # Will be set when admin starts the session
        )
        db.add(new_session)
        await db.flush()  # Get session ID
        
        # Create initial story for the team
        initial_story = Story(
            team_id=new_team.id,
            title=f"Story for {team_name}",
            initial_prompt="Welcome to the collaborative storytelling session! Let your creativity flow as you build an amazing story together.",
            status=StoryStatus.ACTIVE,
            created_at=datetime.utcnow()
        )
        db.add(initial_story)
        
        await db.commit()
        
        # Generate join URL
        join_url = generate_join_url(team_code)
        
        # Log admin action
        await log_admin_action(
            db, admin_user, "create_session",
            team_code,
            {"team_code": team_code, "session_id": str(new_session.id)}
        )
        
        response_data = CreateSessionResponse(
            session_id=str(new_session.id),
            team_code=team_code,
            team_name=team_name,
            join_url=join_url,
            status="success",
            message=f"Session created successfully for team '{team_code}'"
        )
        
        response = Response(
            content=response_data.model_dump_json(),
            media_type="application/json"
        )
        add_admin_headers(response)
        return response
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@router.post("/sessions/{session_id}/start")
async def start_session(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Start a waiting session"""
    try:
        # Validate session ID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid session ID format")
        
        # Get session with team
        session_result = await db.execute(
            select(Session).options(selectinload(Session.team))
            .where(Session.id == session_uuid)
        )
        session = session_result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if session.status != SessionStatus.WAITING:
            raise HTTPException(status_code=400, detail=f"Session is already {session.status}")
        
        # Start the session
        session.status = SessionStatus.ACTIVE
        session.started_at = datetime.utcnow()
        
        await db.commit()
        
        # Log admin action
        await log_admin_action(
            db, admin_user, "start_session",
            session.team.code,
            {"team_code": session.team.code, "session_id": str(session.id)}
        )
        
        response_data = {
            "session_id": str(session.id),
            "team_code": session.team.code,
            "status": "success",
            "message": f"Session started successfully for team '{session.team.code}'"
        }
        
        response = Response(
            content=json.dumps(response_data),
            media_type="application/json"
        )
        add_admin_headers(response)
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to start session: {str(e)}")

@router.delete("/sessions/{session_id}", response_model=DeleteSessionResponse)
async def delete_session(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = Depends(verify_admin)
):
    """Delete a chat session and all associated data"""
    
    try:
        # Validate session ID format
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid session ID format")
        
        # Find the session with team data
        session_result = await db.execute(
            select(Session).options(selectinload(Session.team))
            .where(Session.id == session_uuid)
        )
        session = session_result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        team_code = session.team.code
        
        # Delete all related data in correct order (respecting foreign keys)
        
        try:
            # 1. Get all stories for this team (handle if none exist)
            stories_result = await db.execute(
                select(Story).options(
                    selectinload(Story.turns),
                    selectinload(Story.analyses)
                ).where(Story.team_id == session.team_id)
            )
            stories = stories_result.scalars().all()
            
            # 2. Delete session analyses first (if any exist)
            for story in stories:
                if hasattr(story, 'analyses') and story.analyses:
                    for analysis in story.analyses:
                        await db.execute(delete(SessionAnalysis).where(SessionAnalysis.id == analysis.id))
            
            # 3. Delete story turns (if any exist)
            for story in stories:
                if hasattr(story, 'turns') and story.turns:
                    for turn in story.turns:
                        await db.execute(delete(Turn).where(Turn.id == turn.id))
            
            # 4. Delete stories (if any exist)
            for story in stories:
                await db.execute(delete(Story).where(Story.id == story.id))
            
            # 5. Delete session (but keep team as it may be shared with other sessions)
            await db.execute(delete(Session).where(Session.id == session.id))
            
            # Note: We don't delete the team because it may be referenced by other sessions
            # Teams are shared resources and should only be deleted when no sessions reference them
                
        except Exception as delete_error:
            print(f"❌ DELETE SESSION ERROR: {type(delete_error).__name__}: {str(delete_error)}")
            import traceback
            print(f"❌ DELETE SESSION TRACEBACK:\n{traceback.format_exc()}")
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete session data: {str(delete_error)}")
        
        await db.commit()
        
        # Log admin action
        await log_admin_action(
            db, admin_user, "delete_session",
            team_code,
            {"team_code": team_code, "session_id": session_id}
        )
        
        response_data = DeleteSessionResponse(
            session_id=session_id,
            team_code=team_code,
            status="success",
            message=f"Session and team '{team_code}' deleted successfully"
        )
        
        response = Response(
            content=response_data.model_dump_json(),
            media_type="application/json"
        )
        add_admin_headers(response)
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")

# Note: Admin security headers are added by the add_admin_headers function
# called in each endpoint response. APIRouter doesn't support middleware.
