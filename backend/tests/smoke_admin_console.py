#!/usr/bin/env python3
"""
Admin Console Smoke Test
Tests all admin API endpoints and saves artifacts for verification.
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, Any

import aiohttp
import asyncpg

# Configuration
BASE_URL = "http://localhost:8000"
ADMIN_TOKEN = os.getenv("ADMIN_SEED_API_TOKEN", "dev-admin-token")
TEST_TEAM_CODES = ["smoke-team-1", "smoke-team-2", "smoke-team-3"]
ARTIFACTS_DIR = "/app/test_artifacts"

class AdminConsoleTestRunner:
    def __init__(self):
        self.session = None
        self.results = {
            "timestamp": datetime.utcnow().isoformat(),
            "base_url": BASE_URL,
            "admin_token_used": ADMIN_TOKEN[:8] + "...",
            "tests": [],
            "summary": {
                "total_tests": 0,
                "passed": 0,
                "failed": 0,
                "errors": []
            }
        }
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            
    def log_test(self, test_name: str, success: bool, details: Dict[str, Any] = None):
        """Log test result"""
        test_result = {
            "test_name": test_name,
            "success": success,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {}
        }
        
        self.results["tests"].append(test_result)
        self.results["summary"]["total_tests"] += 1
        
        if success:
            self.results["summary"]["passed"] += 1
            print(f"✅ {test_name}")
        else:
            self.results["summary"]["failed"] += 1
            error_msg = details.get("error", "Unknown error") if details else "Unknown error"
            self.results["summary"]["errors"].append(f"{test_name}: {error_msg}")
            print(f"❌ {test_name}: {error_msg}")
            
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
            
    async def admin_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make authenticated admin API request"""
        headers = kwargs.get("headers", {})
        headers["X-Admin-Token"] = ADMIN_TOKEN
        headers["Content-Type"] = "application/json"
        kwargs["headers"] = headers
        
        url = f"{BASE_URL}/api/v1/admin{endpoint}"
        
        async with self.session.request(method, url, **kwargs) as response:
            response_text = await response.text()
            
            try:
                response_data = await response.json() if response_text else {}
            except:
                response_data = {"raw_response": response_text}
                
            return {
                "status": response.status,
                "data": response_data,
                "headers": dict(response.headers),
                "url": url
            }
            
    async def test_health_check(self):
        """Test basic health endpoint"""
        try:
            async with self.session.get(f"{BASE_URL}/health") as response:
                data = await response.json()
                success = response.status == 200 and data.get("status") == "ok"
                self.log_test("health_check", success, {
                    "status_code": response.status,
                    "response": data
                })
        except Exception as e:
            self.log_test("health_check", False, {"error": str(e)})
            
    async def test_admin_authentication(self):
        """Test admin authentication with snapshot endpoint"""
        try:
            result = await self.admin_request("GET", "/snapshot")
            success = result["status"] == 200
            self.log_test("admin_authentication", success, {
                "status_code": result["status"],
                "has_teams_key": "teams" in result["data"],
                "response_keys": list(result["data"].keys()) if isinstance(result["data"], dict) else []
            })
            return success
        except Exception as e:
            self.log_test("admin_authentication", False, {"error": str(e)})
            return False
            
    async def test_event_bootstrap(self):
        """Test event bootstrap endpoint"""
        try:
            payload = {"team_codes": TEST_TEAM_CODES}
            result = await self.admin_request("POST", "/event/bootstrap", 
                                            data=json.dumps(payload))
            success = result["status"] == 200
            self.log_test("event_bootstrap", success, {
                "status_code": result["status"],
                "payload": payload,
                "response": result["data"]
            })
            return success
        except Exception as e:
            self.log_test("event_bootstrap", False, {"error": str(e)})
            return False
            
    async def test_admin_snapshot(self):
        """Test admin snapshot endpoint"""
        try:
            result = await self.admin_request("GET", "/snapshot")
            success = result["status"] == 200
            
            snapshot_data = result["data"]
            expected_keys = ["teams", "total_teams", "active_sessions", "completed_sessions"]
            has_expected_keys = all(key in snapshot_data for key in expected_keys)
            
            self.log_test("admin_snapshot", success and has_expected_keys, {
                "status_code": result["status"],
                "has_expected_keys": has_expected_keys,
                "total_teams": snapshot_data.get("total_teams", 0),
                "teams_count": len(snapshot_data.get("teams", [])),
                "snapshot_keys": list(snapshot_data.keys()) if isinstance(snapshot_data, dict) else []
            })
            return snapshot_data if success else None
        except Exception as e:
            self.log_test("admin_snapshot", False, {"error": str(e)})
            return None
            
    async def test_room_creation(self):
        """Test room creation endpoint"""
        try:
            payload = {"team_code": "test-room-001", "team_name": "Test Room"}
            result = await self.admin_request("POST", "/rooms", 
                                            data=json.dumps(payload))
            success = result["status"] == 200
            self.log_test("room_creation", success, {
                "status_code": result["status"],
                "payload": payload,
                "response": result["data"]
            })
            return success
        except Exception as e:
            self.log_test("room_creation", False, {"error": str(e)})
            return False
            
    async def test_session_controls(self, team_id: str):
        """Test session control endpoints"""
        controls = ["start", "twist", "end"]
        
        for control in controls:
            try:
                result = await self.admin_request("POST", f"/sessions/{team_id}/{control}")
                success = result["status"] in [200, 404]  # 404 acceptable if no active session
                self.log_test(f"session_control_{control}", success, {
                    "status_code": result["status"],
                    "team_id": team_id,
                    "control": control,
                    "response": result["data"]
                })
                
                # Small delay between controls
                await asyncio.sleep(1)
                
            except Exception as e:
                self.log_test(f"session_control_{control}", False, {"error": str(e)})
                
    async def test_exports(self):
        """Test export endpoints"""
        formats = ["csv", "json"]
        
        for format_type in formats:
            try:
                url = f"{BASE_URL}/api/v1/admin/export/{format_type}"
                headers = {"X-Admin-Token": ADMIN_TOKEN}
                
                async with self.session.get(url, headers=headers) as response:
                    content = await response.read()
                    success = response.status == 200 and len(content) > 0
                    
                    # Save export sample
                    export_file = f"{ARTIFACTS_DIR}/admin_export_sample.{format_type}"
                    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
                    with open(export_file, 'wb') as f:
                        f.write(content)
                    
                    self.log_test(f"export_{format_type}", success, {
                        "status_code": response.status,
                        "content_length": len(content),
                        "content_type": response.headers.get("content-type"),
                        "export_file": export_file
                    })
                    
            except Exception as e:
                self.log_test(f"export_{format_type}", False, {"error": str(e)})
                
    async def test_admin_actions_logging(self):
        """Test that admin actions are being logged"""
        try:
            # Connect to database to check admin_actions table
            conn = await asyncpg.connect(
                host="db",
                port=5432,
                user="postgres",
                password="postgres",
                database="story_twister"
            )
            
            # Check if admin_actions table exists and has recent entries
            query = """
                SELECT COUNT(*) as action_count, MAX(created_at) as latest_action
                FROM admin_actions 
                WHERE created_at > NOW() - INTERVAL '1 hour'
            """
            
            result = await conn.fetchrow(query)
            await conn.close()
            
            action_count = result["action_count"]
            success = action_count > 0
            
            self.log_test("admin_actions_logging", success, {
                "recent_actions_count": action_count,
                "latest_action": result["latest_action"].isoformat() if result["latest_action"] else None,
                "check_window": "1 hour"
            })
            
        except Exception as e:
            self.log_test("admin_actions_logging", False, {"error": str(e)})
            
    async def test_rate_limiting(self):
        """Test rate limiting on admin endpoints"""
        try:
            # Make multiple rapid requests to test rate limiting
            requests_made = 0
            rate_limited = False
            
            for i in range(15):  # Exceed the 10/min limit
                result = await self.admin_request("GET", "/snapshot")
                requests_made += 1
                
                if result["status"] == 429:  # Too Many Requests
                    rate_limited = True
                    break
                    
                await asyncio.sleep(0.1)  # Small delay
                
            self.log_test("rate_limiting", rate_limited, {
                "requests_made": requests_made,
                "rate_limited": rate_limited,
                "expected_limit": "10 requests per minute"
            })
            
        except Exception as e:
            self.log_test("rate_limiting", False, {"error": str(e)})
            
    async def run_all_tests(self):
        """Run all admin console tests"""
        print("🚀 Starting Admin Console Smoke Tests...")
        print(f"📡 Base URL: {BASE_URL}")
        print(f"🔑 Admin Token: {ADMIN_TOKEN[:8]}...")
        print("=" * 60)
        
        # Basic health check
        await self.test_health_check()
        
        # Test admin authentication
        auth_success = await self.test_admin_authentication()
        if not auth_success:
            print("❌ Admin authentication failed - stopping tests")
            return
            
        # Bootstrap event with test teams
        await self.test_event_bootstrap()
        
        # Wait a moment for bootstrap to complete
        await asyncio.sleep(2)
        
        # Test snapshot and get team data
        snapshot = await self.test_admin_snapshot()
        
        # Test room creation
        await self.test_room_creation()
        
        # Test session controls if we have teams
        if snapshot and snapshot.get("teams"):
            first_team = snapshot["teams"][0]
            await self.test_session_controls(first_team["team_code"])
            
        # Test exports
        await self.test_exports()
        
        # Test admin actions logging
        await self.test_admin_actions_logging()
        
        # Test rate limiting (this might affect other tests, so run last)
        await self.test_rate_limiting()
        
        # Save results
        await self.save_results()
        
        # Print summary
        self.print_summary()
        
    async def save_results(self):
        """Save test results to artifacts"""
        try:
            os.makedirs(ARTIFACTS_DIR, exist_ok=True)
            
            # Save detailed results
            results_file = f"{ARTIFACTS_DIR}/admin_console_smoke_test.json"
            with open(results_file, 'w') as f:
                json.dump(self.results, f, indent=2, default=str)
                
            print(f"📄 Test results saved to: {results_file}")
            
            # Save summary
            summary_file = f"{ARTIFACTS_DIR}/admin_console_summary.txt"
            with open(summary_file, 'w') as f:
                f.write("Admin Console Smoke Test Summary\n")
                f.write("=" * 40 + "\n")
                f.write(f"Timestamp: {self.results['timestamp']}\n")
                f.write(f"Total Tests: {self.results['summary']['total_tests']}\n")
                f.write(f"Passed: {self.results['summary']['passed']}\n")
                f.write(f"Failed: {self.results['summary']['failed']}\n")
                f.write(f"Success Rate: {(self.results['summary']['passed'] / max(1, self.results['summary']['total_tests']) * 100):.1f}%\n")
                
                if self.results['summary']['errors']:
                    f.write("\nErrors:\n")
                    for error in self.results['summary']['errors']:
                        f.write(f"- {error}\n")
                        
            print(f"📋 Test summary saved to: {summary_file}")
            
        except Exception as e:
            print(f"❌ Failed to save results: {e}")
            
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 ADMIN CONSOLE SMOKE TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.results['summary']['total_tests']}")
        print(f"✅ Passed: {self.results['summary']['passed']}")
        print(f"❌ Failed: {self.results['summary']['failed']}")
        
        success_rate = (self.results['summary']['passed'] / max(1, self.results['summary']['total_tests'])) * 100
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.results['summary']['errors']:
            print(f"\n🚨 Errors ({len(self.results['summary']['errors'])}):")
            for error in self.results['summary']['errors']:
                print(f"   • {error}")
                
        print(f"\n📁 Artifacts saved to: {ARTIFACTS_DIR}")
        print("=" * 60)

async def main():
    """Main test runner"""
    try:
        async with AdminConsoleTestRunner() as runner:
            await runner.run_all_tests()
            
        # Exit with appropriate code
        if runner.results['summary']['failed'] > 0:
            sys.exit(1)
        else:
            print("🎉 All admin console tests passed!")
            sys.exit(0)
            
    except Exception as e:
        print(f"💥 Test runner failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
