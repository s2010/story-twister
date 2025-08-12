#!/usr/bin/env python3
"""
Production Health Check for Story-Twister
Comprehensive validation of all production functionality
"""

import requests
import json
import time
import sys
from datetime import datetime
import os

# Production configuration - NO SENSITIVE DATA
PROD_URL = "https://habkah.alrumahi.site"
API_URL = "https://habkah.alrumahi.site/api/v1"  # Use production API URL
TIMEOUT = 30

class HealthChecker:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []
        
    def log(self, message, level="INFO"):
        """Log messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def test(self, name, func):
        """Run a test and track results"""
        self.log(f"Testing {name}...")
        try:
            result = func()
            if result:
                self.log(f"✅ {name} PASSED")
                self.passed += 1
                self.results.append({"test": name, "status": "PASS"})
                return True
            else:
                self.log(f"❌ {name} FAILED", "ERROR")
                self.failed += 1
                self.results.append({"test": name, "status": "FAIL"})
                return False
        except Exception as e:
            self.log(f"❌ {name} FAILED: {str(e)}", "ERROR")
            self.failed += 1
            self.results.append({"test": name, "status": "FAIL", "error": str(e)})
            return False
    
    def test_frontend_pages(self):
        """Test all frontend pages are accessible"""
        pages = [
            "/",
            "/team-select", 
            "/admin/login",
            "/leaderboard"
        ]
        
        for page in pages:
            try:
                response = requests.get(f"{PROD_URL}{page}", timeout=TIMEOUT)
                if response.status_code != 200:
                    self.log(f"❌ Page {page} returned {response.status_code}", "ERROR")
                    return False
                    
                # Check for basic content indicators
                content = response.text.lower()
                if "story-twister" not in content and "storytelling" not in content:
                    self.log(f"❌ Page {page} missing expected content", "ERROR")
                    return False
                    
            except Exception as e:
                self.log(f"❌ Page {page} failed: {str(e)}", "ERROR")
                return False
                
        return True
    
    def test_backend_health(self):
        """Test backend health endpoint"""
        try:
            response = requests.get(f"{API_URL}/health", timeout=TIMEOUT)
            return response.status_code == 200
        except:
            return False
    
    def test_cors_headers(self):
        """Test CORS configuration"""
        try:
            response = requests.options(f"{API_URL}/health", 
                headers={"Origin": PROD_URL}, timeout=TIMEOUT)
            cors_headers = response.headers.get("Access-Control-Allow-Origin")
            return cors_headers is not None
        except:
            return False
    
    def test_session_creation(self):
        """Test session creation endpoint (without auth)"""
        try:
            # Test that the endpoint exists and responds appropriately
            response = requests.post(f"{API_URL}/sessions", 
                json={"team_code": "HEALTH_CHECK"}, timeout=TIMEOUT)
            # Should return 401/403 for unauthorized, not 404
            return response.status_code in [401, 403, 422]
        except:
            return False
    
    def test_stories_endpoint(self):
        """Test stories endpoint accessibility"""
        try:
            response = requests.get(f"{API_URL}/stories", timeout=TIMEOUT)
            # Should return 401/403 for unauthorized, not 404
            return response.status_code in [401, 403, 422]
        except:
            return False
    
    def test_admin_endpoints_exist(self):
        """Test admin endpoints exist (should return 401/403, not 404)"""
        endpoints = [
            "/admin/dashboard",
            "/admin/sessions"
        ]
        
        for endpoint in endpoints:
            try:
                response = requests.get(f"{API_URL}{endpoint}", timeout=TIMEOUT)
                if response.status_code == 404:
                    return False
            except:
                return False
        return True
    
    def test_database_connectivity(self):
        """Test database connectivity through health endpoint"""
        try:
            response = requests.get(f"{API_URL}/health", timeout=TIMEOUT)
            if response.status_code == 200:
                data = response.json()
                return data.get("status") == "healthy"
        except:
            pass
        return False
    
    def run_all_tests(self):
        """Run comprehensive production health check"""
        self.log("🚀 Starting Production Health Check")
        self.log("=" * 50)
        
        # Critical infrastructure tests
        self.test("Frontend Pages", self.test_frontend_pages)
        self.test("Backend Health", self.test_backend_health)
        self.test("Database Connectivity", self.test_database_connectivity)
        self.test("CORS Configuration", self.test_cors_headers)
        
        # API endpoint tests
        self.test("Session Creation Endpoint", self.test_session_creation)
        self.test("Stories Endpoint", self.test_stories_endpoint)
        self.test("Admin Endpoints", self.test_admin_endpoints_exist)
        
        # Results summary
        self.log("=" * 50)
        self.log("🎯 PRODUCTION HEALTH CHECK RESULTS")
        self.log("=" * 50)
        
        total = self.passed + self.failed
        success_rate = (self.passed / total * 100) if total > 0 else 0
        
        for result in self.results:
            status_icon = "✅" if result["status"] == "PASS" else "❌"
            self.log(f"{result['test']}: {status_icon} {result['status']}")
        
        self.log("=" * 50)
        self.log(f"Overall: {self.passed}/{total} tests passed ({success_rate:.1f}%)")
        
        if self.failed == 0:
            self.log("🎉 ALL PRODUCTION HEALTH CHECKS PASSED!")
            return True
        else:
            self.log(f"⚠️  {self.failed} tests failed. Production issues detected.", "ERROR")
            return False

if __name__ == "__main__":
    checker = HealthChecker()
    success = checker.run_all_tests()
    sys.exit(0 if success else 1)
