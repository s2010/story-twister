#!/usr/bin/env python3
"""
Production Security Verification Script for Story-Twister
Checks that all security requirements are met before deployment
"""

import os
import re
import sys
from pathlib import Path

class SecurityChecker:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.errors = []
        self.warnings = []
        self.passed = []

    def check_environment_variables(self):
        """Check that all required environment variables are set with secure values"""
        print("🔐 Checking Environment Variables...")
        
        required_vars = {
            'DATABASE_URL': 'Database connection string',
            'ADMIN_SEED_PASSWORD': 'Admin password',
            'ADMIN_SEED_API_TOKEN': 'Admin API token',
            'GROQ_API_KEY': 'AI service API key',
            'NODE_ENV': 'Node environment',
            'VITE_NODE_ENV': 'Vite environment'
        }
        
        for var, description in required_vars.items():
            value = os.getenv(var)
            if not value:
                self.errors.append(f"❌ {var} is not set ({description})")
            elif var == 'ADMIN_SEED_PASSWORD':
                if len(value) < 16:
                    self.errors.append(f"❌ {var} is too short (minimum 16 characters)")
                elif value in ['password', 'admin', 'ChangeMe123!']:
                    self.errors.append(f"❌ {var} uses weak/default password")
                else:
                    self.passed.append(f"✅ {var} is set with strong password")
            elif var == 'ADMIN_SEED_API_TOKEN':
                if len(value) < 32:
                    self.errors.append(f"❌ {var} is too short (minimum 32 characters)")
                elif value in ['dev-admin-token', 'admin-token']:
                    self.errors.append(f"❌ {var} uses weak/default token")
                else:
                    self.passed.append(f"✅ {var} is set with secure token")
            elif var in ['NODE_ENV', 'VITE_NODE_ENV']:
                if value != 'production':
                    self.warnings.append(f"⚠️  {var} is not set to 'production' (current: {value})")
                else:
                    self.passed.append(f"✅ {var} is set to production")
            else:
                self.passed.append(f"✅ {var} is set")

    def check_gitignore(self):
        """Check that .gitignore properly excludes sensitive files"""
        print("📁 Checking .gitignore...")
        
        gitignore_path = self.project_root / '.gitignore'
        if not gitignore_path.exists():
            self.errors.append("❌ .gitignore file is missing")
            return
        
        with open(gitignore_path, 'r') as f:
            gitignore_content = f.read()
        
        required_patterns = [
            '.env',
            '*.log',
            'node_modules/',
            '*.key',
            '*.pem'
        ]
        
        for pattern in required_patterns:
            if pattern not in gitignore_content:
                self.errors.append(f"❌ .gitignore missing pattern: {pattern}")
            else:
                self.passed.append(f"✅ .gitignore includes: {pattern}")

    def check_env_file_not_committed(self):
        """Check that .env file is not committed to git"""
        print("🔍 Checking .env file status...")
        
        env_path = self.project_root / '.env'
        if env_path.exists():
            # Check if .env is tracked by git
            import subprocess
            try:
                result = subprocess.run(
                    ['git', 'ls-files', '.env'],
                    cwd=self.project_root,
                    capture_output=True,
                    text=True
                )
                if result.stdout.strip():
                    self.errors.append("❌ .env file is committed to git (SECURITY RISK)")
                else:
                    self.passed.append("✅ .env file is not committed to git")
            except subprocess.SubprocessError:
                self.warnings.append("⚠️  Could not check git status of .env file")
        else:
            self.warnings.append("⚠️  .env file not found (may be set via environment)")

    def check_cors_configuration(self):
        """Check CORS configuration for production"""
        print("🌐 Checking CORS Configuration...")
        
        allowed_origins = os.getenv('ALLOWED_ORIGINS', '')
        if not allowed_origins:
            self.warnings.append("⚠️  ALLOWED_ORIGINS not set")
            return
        
        if 'localhost' in allowed_origins:
            self.warnings.append("⚠️  ALLOWED_ORIGINS includes localhost (not recommended for production)")
        
        if allowed_origins == '*':
            self.errors.append("❌ ALLOWED_ORIGINS set to wildcard (*) - SECURITY RISK")
        else:
            self.passed.append("✅ ALLOWED_ORIGINS is properly configured")

    def check_database_url_security(self):
        """Check database URL for security issues"""
        print("🗄️  Checking Database Configuration...")
        
        db_url = os.getenv('DATABASE_URL', '')
        if not db_url:
            self.errors.append("❌ DATABASE_URL is not set")
            return
        
        if 'localhost' in db_url and os.getenv('NODE_ENV') == 'production':
            self.warnings.append("⚠️  DATABASE_URL uses localhost in production")
        
        if 'password' in db_url.lower() or 'admin' in db_url.lower():
            self.warnings.append("⚠️  DATABASE_URL may contain weak credentials")
        
        if db_url.startswith('postgresql://'):
            self.warnings.append("⚠️  Consider using postgresql+asyncpg:// for better performance")
        
        self.passed.append("✅ DATABASE_URL is configured")

    def check_frontend_production_config(self):
        """Check frontend production configuration"""
        print("🎨 Checking Frontend Configuration...")
        
        # Check if development UI is properly hidden
        admin_login_path = self.project_root / 'frontend2' / 'src' / 'pages' / 'admin' / 'AdminLogin.tsx'
        if admin_login_path.exists():
            with open(admin_login_path, 'r') as f:
                content = f.read()
            
            if 'import.meta.env.VITE_NODE_ENV !== \'production\'' in content:
                self.passed.append("✅ Development credentials are hidden in production")
            else:
                self.warnings.append("⚠️  Development credentials may be visible in production")

    def check_ssl_readiness(self):
        """Check SSL/HTTPS readiness"""
        print("🔒 Checking SSL/HTTPS Readiness...")
        
        api_base_url = os.getenv('VITE_API_BASE_URL', '')
        if api_base_url.startswith('https://'):
            self.passed.append("✅ API base URL uses HTTPS")
        elif api_base_url.startswith('http://') and os.getenv('NODE_ENV') == 'production':
            self.warnings.append("⚠️  API base URL uses HTTP in production (consider HTTPS)")
        else:
            self.warnings.append("⚠️  VITE_API_BASE_URL not set or invalid")

    def run_all_checks(self):
        """Run all security checks"""
        print("🛡️  STORY-TWISTER PRODUCTION SECURITY VERIFICATION")
        print("=" * 60)
        
        self.check_environment_variables()
        self.check_gitignore()
        self.check_env_file_not_committed()
        self.check_cors_configuration()
        self.check_database_url_security()
        self.check_frontend_production_config()
        self.check_ssl_readiness()
        
        print("\n" + "=" * 60)
        print("📊 SECURITY CHECK RESULTS")
        print("=" * 60)
        
        if self.passed:
            print(f"\n✅ PASSED ({len(self.passed)}):")
            for item in self.passed:
                print(f"   {item}")
        
        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for item in self.warnings:
                print(f"   {item}")
        
        if self.errors:
            print(f"\n❌ ERRORS ({len(self.errors)}):")
            for item in self.errors:
                print(f"   {item}")
        
        print("\n" + "=" * 60)
        
        if self.errors:
            print("🚨 DEPLOYMENT BLOCKED - Fix all errors before deploying to production")
            return False
        elif self.warnings:
            print("⚠️  DEPLOYMENT READY WITH WARNINGS - Review warnings before deploying")
            return True
        else:
            print("🎉 DEPLOYMENT READY - All security checks passed!")
            return True

def main():
    """Main function"""
    checker = SecurityChecker()
    success = checker.run_all_checks()
    
    print("\n📋 NEXT STEPS:")
    if not success:
        print("1. Fix all security errors listed above")
        print("2. Re-run this script to verify fixes")
        print("3. Review the PRODUCTION_DEPLOYMENT.md guide")
        sys.exit(1)
    else:
        print("1. Review any warnings above")
        print("2. Test your deployment in a staging environment")
        print("3. Follow the PRODUCTION_DEPLOYMENT.md guide")
        print("4. Monitor your application after deployment")
        sys.exit(0)

if __name__ == "__main__":
    main()
