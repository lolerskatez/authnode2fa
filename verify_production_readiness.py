#!/usr/bin/env python3
"""
Production Readiness Verification Script
Validates AuthNode2FA is ready for publishing
Run: python verify_production_readiness.py
"""

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime

class ProductionReadinessVerifier:
    """Verify production readiness of AuthNode2FA"""
    
    def __init__(self):
        self.root_dir = Path(__file__).parent
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.checks = []
        
    def log(self, status, message, category="general"):
        """Log check result"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        if status == "pass":
            symbol = "✅"
            self.passed += 1
            log_msg = f"{symbol} PASS: {message}"
        elif status == "fail":
            symbol = "❌"
            self.failed += 1
            log_msg = f"{symbol} FAIL: {message}"
        elif status == "warn":
            symbol = "⚠️"
            self.warnings += 1
            log_msg = f"{symbol} WARN: {message}"
        else:
            symbol = "ℹ️"
            log_msg = f"{symbol} INFO: {message}"
        
        print(log_msg)
        self.checks.append({
            "timestamp": timestamp,
            "status": status,
            "message": message,
            "category": category
        })
    
    def check_files_exist(self):
        """Verify all critical files exist"""
        print("\n" + "="*60)
        print("🔍 CHECKING CRITICAL FILES...")
        print("="*60)
        
        required_files = {
            "backend/requirements.txt": "Python dependencies",
            "backend/Dockerfile": "Backend Docker image",
            "backend/entrypoint.sh": "Docker entrypoint",
            "backend/app/main.py": "FastAPI application",
            "backend/app/models.py": "Database models",
            "backend/app/crud.py": "CRUD operations",
            "backend/app/routers/auth.py": "Auth router",
            "backend/app/routers/users.py": "User router",
            "backend/app/routers/applications.py": "App router",
            "backend/app/routers/admin.py": "Admin router",
            "backend/app/routers/webauthn.py": "WebAuthn router",
            "backend/tests/conftest.py": "Test configuration",
            "frontend/package.json": "Frontend dependencies",
            "frontend/Dockerfile": "Frontend Docker image",
            "docker-compose.yml": "Docker Compose config",
            ".env.example": "Env template (local)",
            ".env.docker.example": "Env template (docker)",
            ".gitignore": "Git ignore rules",
            "README.md": "Project README",
            "DEPLOYMENT.md": "Deployment guide",
            "SECURITY.md": "Security documentation",
            "CODEBASE_ASSESSMENT.md": "Code assessment",
            "ARCHITECTURE.md": "Architecture guide",
            "TESTING_GUIDE.md": "Testing guide",
            "DOCUMENTATION.md": "Documentation hub",
            "CHANGELOG.md": "Changelog",
        }
        
        for file_path, description in required_files.items():
            full_path = self.root_dir / file_path
            if full_path.exists():
                self.log("pass", f"{description}: {file_path}", "files")
            else:
                self.log("fail", f"MISSING: {description} ({file_path})", "files")
    
    def check_security(self):
        """Check security configurations"""
        print("\n" + "="*60)
        print("🔐 CHECKING SECURITY...")
        print("="*60)
        
        # Check .env files not committed
        env_files = [".env", "backend/.env", "frontend/.env"]
        for env_file in env_files:
            result = subprocess.run(
                ["git", "check-ignore", "-v", env_file],
                cwd=self.root_dir,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                self.log("pass", f".env file properly ignored: {env_file}", "security")
            else:
                self.log("warn", f"Could not verify .env ignored: {env_file}", "security")
        
        # Check database files not committed
        db_files = ["*.db", "*.sqlite", "*.sqlite3"]
        for pattern in db_files:
            result = subprocess.run(
                ["git", "check-ignore", "-v", "authy.db"],
                cwd=self.root_dir,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                self.log("pass", f"Database files properly ignored: {pattern}", "security")
        
        # Check Fernet encryption configured
        main_py = self.root_dir / "backend/app/main.py"
        if main_py.exists():
            with open(main_py) as f:
                if "ENCRYPTION_KEY" in f.read():
                    self.log("pass", "Encryption key referenced in code", "security")
        
        # Check CORS configurable
        if main_py.exists():
            with open(main_py) as f:
                content = f.read()
                if "os.getenv" in content and "ALLOWED_ORIGINS" in content:
                    self.log("pass", "CORS configurable from environment", "security")
                else:
                    self.log("fail", "CORS not properly configured", "security")
        
        # Check rate limiting
        if main_py.exists():
            with open(main_py) as f:
                if "slowapi" in f.read() or "limiter" in f.read():
                    self.log("pass", "Rate limiting implemented", "security")
                else:
                    self.log("warn", "Rate limiting not found in main.py", "security")
    
    def check_docker(self):
        """Check Docker configuration"""
        print("\n" + "="*60)
        print("🐳 CHECKING DOCKER SETUP...")
        print("="*60)
        
        docker_compose = self.root_dir / "docker-compose.yml"
        if docker_compose.exists():
            self.log("pass", "docker-compose.yml exists", "docker")
            
            with open(docker_compose) as f:
                content = f.read()
                
            checks = {
                "PostgreSQL service": "postgres:" in content,
                "Backend service": "build: ./backend" in content,
                "Frontend service": "build: ./frontend" in content,
                "Environment variables": "${" in content,
                "Volume persistence": "volumes:" in content,
            }
            
            for check_name, result in checks.items():
                if result:
                    self.log("pass", f"Docker Compose has {check_name}", "docker")
                else:
                    self.log("fail", f"Docker Compose missing {check_name}", "docker")
    
    def check_dependencies(self):
        """Check dependencies are specified"""
        print("\n" + "="*60)
        print("📦 CHECKING DEPENDENCIES...")
        print("="*60)
        
        # Backend dependencies
        req_file = self.root_dir / "backend/requirements.txt"
        if req_file.exists():
            with open(req_file) as f:
                content = f.read()
                
            required_packages = {
                "FastAPI": "fastapi" in content,
                "SQLAlchemy": "sqlalchemy" in content,
                "Alembic": "alembic" in content,
                "Encryption": "cryptography" in content,
                "Password Hashing": "passlib" in content,
                "TOTP": "pyotp" in content,
                "QR Code": "qrcode" in content,
                "Rate Limiting": "slowapi" in content,
                "Testing": "pytest" in content,
                "WebAuthn": "webauthn" in content,
            }
            
            for package_name, found in required_packages.items():
                if found:
                    self.log("pass", f"Required package {package_name} specified", "dependencies")
                else:
                    self.log("fail", f"Missing package {package_name}", "dependencies")
        
        # Frontend dependencies
        pkg_json = self.root_dir / "frontend/package.json"
        if pkg_json.exists():
            with open(pkg_json) as f:
                content = f.read()
                
            if "react" in content and "axios" in content:
                self.log("pass", "Frontend dependencies configured", "dependencies")
            else:
                self.log("fail", "Frontend dependencies incomplete", "dependencies")
    
    def check_tests(self):
        """Check testing infrastructure"""
        print("\n" + "="*60)
        print("🧪 CHECKING TESTING SETUP...")
        print("="*60)
        
        test_files = [
            "backend/tests/conftest.py",
            "backend/tests/test_auth.py",
            "backend/tests/test_users.py",
            "backend/tests/test_applications.py",
            "backend/tests/test_security.py",
            "backend/pytest.ini",
        ]
        
        for test_file in test_files:
            full_path = self.root_dir / test_file
            if full_path.exists():
                self.log("pass", f"Test file exists: {test_file}", "testing")
            else:
                self.log("warn", f"Test file missing: {test_file}", "testing")
    
    def check_documentation(self):
        """Check documentation completeness"""
        print("\n" + "="*60)
        print("📚 CHECKING DOCUMENTATION...")
        print("="*60)
        
        doc_files = {
            "README.md": "Project overview",
            "DOCUMENTATION.md": "Documentation hub",
            "CODEBASE_ASSESSMENT.md": "Technical assessment",
            "ARCHITECTURE.md": "Architecture guide",
            "DEPLOYMENT.md": "Deployment guide",
            "SECURITY.md": "Security documentation",
            "TESTING_GUIDE.md": "Testing guide",
            "API.md": "API documentation",
            "CHANGELOG.md": "Changelog",
            "backend/README.md": "Backend documentation",
        }
        
        for doc_file, description in doc_files.items():
            full_path = self.root_dir / doc_file
            if full_path.exists():
                size = full_path.stat().st_size
                if size > 100:  # At least 100 bytes of content
                    self.log("pass", f"{description}: {doc_file} ({size} bytes)", "documentation")
                else:
                    self.log("warn", f"Sparse documentation: {doc_file}", "documentation")
            else:
                self.log("fail", f"Missing documentation: {doc_file}", "documentation")
    
    def check_env_templates(self):
        """Check environment templates"""
        print("\n" + "="*60)
        print("⚙️ CHECKING ENVIRONMENT TEMPLATES...")
        print("="*60)
        
        templates = [
            (".env.example", "Local environment"),
            (".env.docker.example", "Docker environment"),
            (".env.prod.example", "Production environment (optional)"),
        ]
        
        for template_file, description in templates:
            full_path = self.root_dir / template_file
            if full_path.exists():
                self.log("pass", f"Template exists: {template_file}", "config")
                
                # Check for secrets (should not be present)
                with open(full_path) as f:
                    content = f.read()
                    if any(x in content for x in ["password123", "secret123", "key123"]):
                        self.log("warn", f"Example values in {template_file} (ensure changed in production)", "config")
            else:
                if "optional" not in description:
                    self.log("fail", f"Missing template: {template_file}", "config")
    
    def check_git_status(self):
        """Check git repository status"""
        print("\n" + "="*60)
        print("📝 CHECKING GIT STATUS...")
        print("="*60)
        
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.root_dir,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                status_lines = result.stdout.strip().split("\n") if result.stdout.strip() else []
                
                if not status_lines or (len(status_lines) == 1 and not status_lines[0]):
                    self.log("pass", "Git repository clean (no uncommitted changes)", "git")
                else:
                    self.log("warn", f"Git repository has {len(status_lines)} uncommitted changes", "git")
                    
                    # Check if .env files are staged
                    for line in status_lines:
                        if ".env" in line and not "example" in line:
                            self.log("fail", f"Potential secret file staged: {line}", "git")
        except subprocess.TimeoutExpired:
            self.log("warn", "Git status check timed out", "git")
        except FileNotFoundError:
            self.log("warn", "Git not found - skipping git checks", "git")
    
    def generate_report(self):
        """Generate verification report"""
        print("\n" + "="*60)
        print("📊 VERIFICATION REPORT")
        print("="*60)
        
        print(f"\n✅ PASSED: {self.passed}")
        print(f"❌ FAILED: {self.failed}")
        print(f"⚠️  WARNINGS: {self.warnings}")
        
        total = self.passed + self.failed + self.warnings
        if total > 0:
            pass_rate = (self.passed / total) * 100
            print(f"\n📈 PASS RATE: {pass_rate:.1f}%")
        
        print("\n" + "="*60)
        if self.failed == 0:
            print("✅ PRODUCTION READY - NO CRITICAL ISSUES FOUND")
            print("="*60)
            return 0
        else:
            print(f"❌ {self.failed} CRITICAL ISSUES FOUND")
            print("="*60)
            return 1
    
    def run_all_checks(self):
        """Run all verification checks"""
        print("\n" + "="*70)
        print("🚀 AUTHNODE2FA PRODUCTION READINESS VERIFICATION")
        print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70)
        
        self.check_files_exist()
        self.check_security()
        self.check_docker()
        self.check_dependencies()
        self.check_tests()
        self.check_documentation()
        self.check_env_templates()
        self.check_git_status()
        
        return self.generate_report()

def main():
    """Main entry point"""
    verifier = ProductionReadinessVerifier()
    exit_code = verifier.run_all_checks()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
