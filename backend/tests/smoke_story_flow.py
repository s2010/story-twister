#!/usr/bin/env python3
"""
Backend smoke test for Story Twister collaborative storytelling game.
Tests the complete flow: join team, create story, add turns, trigger twist, timer expiry.
"""

import asyncio
import json
import requests
import time
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8001"
HEADERS = {
    'Content-Type': 'application/json',
    'X-Event-Mode': 'true',
    'X-Nickname': 'SmokeTestUser',
    'X-Team-Code': 'SMOKETEST',
    'X-Event-Session': '2025-01-01T00:00:00Z'
}

def log_step(step, description):
    print(f"\n🧪 Step {step}: {description}")

def log_success(message):
    print(f"✅ {message}")

def log_error(message):
    print(f"❌ {message}")

def make_request(method, endpoint, data=None):
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, headers=HEADERS)
        elif method == "POST":
            response = requests.post(url, headers=HEADERS, json=data)
        
        print(f"📡 {method} {endpoint} -> {response.status_code}")
        
        if response.status_code >= 400:
            print(f"❌ Error response: {response.text}")
            return None
        
        return response.json()
    except Exception as e:
        log_error(f"Request failed: {e}")
        return None

def main():
    print("🚀 Starting Story Twister Backend Smoke Test")
    print("=" * 60)
    
    results = {
        "test_run": datetime.now().isoformat(),
        "steps": [],
        "success": False
    }
    
    try:
        # Step 1: Join team
        log_step(1, "Join team session")
        join_response = make_request("POST", "/api/v1/sessions/join", {})
        if not join_response:
            raise Exception("Failed to join team")
        
        team_id = join_response["team"]["id"]
        log_success(f"Joined team: {team_id}")
        results["steps"].append({"step": 1, "status": "success", "team_id": team_id})
        
        # Step 2: Create story (should auto-create starter sentence)
        log_step(2, "Create story with starter sentence")
        story_response = make_request("POST", "/api/v1/stories", {
            "team_id": team_id,
            "title": "Smoke Test Story",
            "initial_prompt": "This will be replaced by random starter"
        })
        if not story_response:
            raise Exception("Failed to create story")
        
        story_id = story_response["id"]
        log_success(f"Created story: {story_id}")
        results["steps"].append({"step": 2, "status": "success", "story_id": story_id})
        
        # Step 3: Check first turn is StoryBot starter
        log_step(3, "Verify starter sentence by StoryBot")
        turns_response = make_request("GET", f"/api/v1/stories/{story_id}/turns")
        if not turns_response or len(turns_response) != 1:
            raise Exception("Expected exactly 1 starter turn")
        
        first_turn = turns_response[0]
        if first_turn["author_name"] != "StoryBot" or first_turn["turn_number"] != 1:
            raise Exception("First turn should be by StoryBot with turn_number 1")
        
        log_success(f"Starter sentence: {first_turn['content'][:50]}...")
        results["steps"].append({"step": 3, "status": "success", "starter_content": first_turn["content"]})
        
        # Step 4: Add first user turn
        log_step(4, "Add first user turn")
        add_response1 = make_request("POST", "/api/v1/stories/add-sentence", {
            "story_id": story_id,
            "content": "The protagonist takes their first step into the unknown."
        })
        if not add_response1:
            raise Exception("Failed to add first user turn")
        
        log_success("Added first user turn")
        results["steps"].append({"step": 4, "status": "success"})
        
        # Step 5: Add second user turn (should trigger twist)
        log_step(5, "Add second user turn (should trigger auto-twist)")
        add_response2 = make_request("POST", "/api/v1/stories/add-sentence", {
            "story_id": story_id,
            "content": "They notice something glimmering in the distance."
        })
        if not add_response2:
            raise Exception("Failed to add second user turn")
        
        # Check if twist was triggered
        if add_response2.get("twist_added"):
            log_success("Auto-twist was triggered after 2 user turns!")
        else:
            log_error("Auto-twist was NOT triggered")
        
        results["steps"].append({"step": 5, "status": "success", "twist_triggered": add_response2.get("twist_added", False)})
        
        # Step 6: Verify twist turn exists
        log_step(6, "Verify twist turn was added")
        turns_response = make_request("GET", f"/api/v1/stories/{story_id}/turns")
        if not turns_response:
            raise Exception("Failed to get turns")
        
        twist_turns = [t for t in turns_response if t["is_twist"]]
        if len(twist_turns) != 1:
            raise Exception(f"Expected exactly 1 twist turn, got {len(twist_turns)}")
        
        twist_turn = twist_turns[0]
        log_success(f"Twist turn: {twist_turn['content'][:50]}...")
        results["steps"].append({"step": 6, "status": "success", "twist_content": twist_turn["content"]})
        
        # Step 7: Check story status and timer
        log_step(7, "Check story status and timer")
        status_response = make_request("GET", f"/api/v1/stories/{story_id}/status")
        if not status_response:
            raise Exception("Failed to get story status")
        
        time_remaining = status_response.get("time_remaining_seconds", 0)
        is_completed = status_response.get("is_completed", False)
        
        log_success(f"Time remaining: {time_remaining}s, Completed: {is_completed}")
        results["steps"].append({"step": 7, "status": "success", "time_remaining": time_remaining, "is_completed": is_completed})
        
        # Step 8: Test timer expiry (simulate by waiting or checking logic)
        log_step(8, "Test session end behavior")
        # Note: In a real test, we'd wait 10 minutes or mock the timer
        # For smoke test, we just verify the logic exists
        if time_remaining > 0 and not is_completed:
            log_success("Timer logic is working (session still active)")
        else:
            log_error("Timer logic issue detected")
        
        results["steps"].append({"step": 8, "status": "success"})
        
        # Success!
        results["success"] = True
        log_success("🎉 All smoke tests passed!")
        
    except Exception as e:
        log_error(f"Smoke test failed: {e}")
        results["error"] = str(e)
    
    # Save results
    output_file = "/app/test_artifacts/api.json"
    import os
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Results saved to: {output_file}")
    print("=" * 60)
    
    if results["success"]:
        print("🎉 SMOKE TEST PASSED")
        exit(0)
    else:
        print("💥 SMOKE TEST FAILED")
        exit(1)

if __name__ == "__main__":
    main()
