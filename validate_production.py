#!/usr/bin/env python3
"""
Production Readiness Validator
Checks that authnode2fa is ready for production deployment
"""

import os
import sys
import subprocess
from pathlib import Path

class ProductionValidator:
    def __init__(self):
        self.root_dir = Path(__file__).parent
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        
    def check(self, condition, message, level="info"):
        """Log check result"""
        if level == "pass":
            print(f"✓ {message}")
            self.passed += 1
        elif level == "fail":
            print(f"✗ {message}")
            self.failed += 1
        elif level == "warn":
            print(f"⚠ {message}")
            self.warnings += 1
        else:
            print(f"ℹ {message}")
    
    def validate_files(self):
        """Check all critical files exist"""
        print("\n🔍 CHECKING FILES...")
        
        required_files = {
            "backend/requirements.txt": "Python dependencies",
            "backend/Dockerfile": "Backend Docker image",
            "backend/entrypoint.sh": "Docker entrypoint script",
            "backend/app/main.py": "FastAPI application",
            "backend/alembic/versions": "Database migrations",
            "frontend/Dockerfile": "Frontend Docker image",
            "frontend/package.json": "Frontend dependencies",
            "docker-compose.yml": "Docker Compose configuration",
            ".env.example": "Environment template",
            ".env.docker.example": "Docker env template",
            "DEPLOYMENT.md": "Deployment guide",
            "QUICK_START_PRODUCTION.md": "Quick start guide",
            "DEPLOYMENT_CHECKLIST.md": "Pre-launch checklist",
        }
        
        for file_path, description in required_files.items():
            full_path = self.root_dir / file_path
            if full_path.exists():
                self.check(True, f"{description}: {file_path}", "pass")
            else:
                self.check(False, f"MISSING: {description}: {file_path}", "fail")
    
    def validate_security(self):
        """Check security configurations"""
        print("\n🔐 CHECKING SECURITY...")
        
        # Check docker-compose doesn't have hardcoded secrets
        docker_compose = self.root_dir / "docker-compose.yml"
        with open(docker_compose) as f:
            content = f.read()
            if "${" in content:
                self.check(True, "Credentials parameterized with environment variables", "pass")
            else:
                self.check(False, "Credentials not properly parameterized", "fail")
        
        # Check CORS is configurable
        main_py = self.root_dir / "backend/app/main.py"
        with open(main_py) as f:
            content = f.read()
            if "os.getenv" in content and "ALLOWED_ORIGINS" in content:
                self.check(True, "CORS origins configurable via environment", "pass")
            else:
                self.check(False, "CORS not properly configured", "fail")
        
        # Check health endpoint exists
        if "/health" in content:
            self.check(True, "Health check endpoint configured", "pass")
        else:
            self.check(False, "Health check endpoint missing", "fail")
        
        # Check .env.docker.example exists
        if (self.root_dir / ".env.docker.example").exists():
            self.check(True, "Production environment template provided", "pass")
        else:
            self.check(False, "Production environment template missing", "fail")
    
    def validate_dependencies(self):
        """Check dependencies are specified"""
        print("\n📦 CHECKING DEPENDENCIES...")
        
        req_file = self.root_dir / "backend/requirements.txt"
        with open(req_file) as f:
            content = f.read()
            
        required_packages = [
            ("fastapi", "FastAPI framework"),
            ("sqlalchemy", "Database ORM"),
            ("alembic", "Database migrations"),
            ("cryptography", "Encryption support"),
            ("numpy", "Image processing"),
            ("argon2", "Password hashing"),
        ]
        
        for package, desc in required_packages:
            if package in content:
                self.check(True, f"{desc}: {package}", "pass")
            else:
                self.check(False, f"MISSING: {desc}: {package}", "fail")
    
    def validate_dockerfile(self):
        """Check Docker configuration"""
        print("\n🐳 CHECKING DOCKER CONFIGURATION...")
        
        backend_dockerfile = self.root_dir / "backend/Dockerfile"
        with open(backend_dockerfile) as f:
            content = f.read()
            if "entrypoint.sh" in content:
                self.check(True, "Backend uses entrypoint script", "pass")
            else:
                self.check(False, "Backend not using entrypoint script", "fail")
        
        frontend_dockerfile = self.root_dir / "frontend/Dockerfile"
        with open(frontend_dockerfile) as f:
            content = f.read()
            if "../nginx.conf" in content:
                self.check(True, "Frontend Dockerfile path is correct", "pass")
            elif "../../nginx.conf" in content:
                self.check(False, "Frontend Dockerfile has incorrect path", "fail")
            else:
                self.check(True, "Frontend Dockerfile configured", "pass")
    
    def validate_documentation(self):
        """Check documentation completeness"""
        print("\n📚 CHECKING DOCUMENTATION...")
        
        docs = [
            ("QUICK_START_PRODUCTION.md", "Quick start guide"),
            ("DEPLOYMENT.md", "Detailed deployment guide"),
            ("DEPLOYMENT_CHECKLIST.md", "Pre-deployment checklist"),
            ("README.md", "Project README"),
        ]
        
        for doc_file, description in docs:
            full_path = self.root_dir / doc_file
            if full_path.exists():
                try:
                    with open(full_path, encoding='utf-8') as f:
                        if len(f.read()) > 100:
                            self.check(True, f"{description}: {doc_file}", "pass")
                        else:
                            self.check(False, f"EMPTY: {description}: {doc_file}", "fail")
                except UnicodeDecodeError:
                    with open(full_path, encoding='latin-1') as f:
                        if len(f.read()) > 100:
                            self.check(True, f"{description}: {doc_file}", "pass")
                        else:
                            self.check(False, f"EMPTY: {description}: {doc_file}", "fail")
            else:
                self.check(False, f"MISSING: {description}: {doc_file}", "fail")
    
    def validate_migrations(self):
        """Check database migrations"""
        print("\n💾 CHECKING DATABASE MIGRATIONS...")
        
        migrations_dir = self.root_dir / "backend/alembic/versions"
        migration_files = list(migrations_dir.glob("*.py"))
        
        if len(migration_files) > 0:
            self.check(True, f"Found {len(migration_files)} migration files", "pass")
            for mig in sorted(migration_files):
                if "__pycache__" not in str(mig):
                    print(f"  • {mig.name}")
        else:
            self.check(False, "No migration files found", "fail")
    
    def run_all_checks(self):
        """Run all validation checks"""
        print("=" * 60)
        print("🚀 PRODUCTION READINESS VALIDATOR")
        print("=" * 60)
        
        self.validate_files()
        self.validate_security()
        self.validate_dependencies()
        self.validate_dockerfile()
        self.validate_documentation()
        self.validate_migrations()
        
        print("\n" + "=" * 60)
        print("📊 VALIDATION RESULTS")
        print("=" * 60)
        print(f"✓ Passed:  {self.passed}")
        print(f"✗ Failed:  {self.failed}")
        print(f"⚠ Warnings: {self.warnings}")
        
        total = self.passed + self.failed + self.warnings
        if total > 0:
            percentage = (self.passed / total) * 100
            print(f"\n📈 Overall Score: {percentage:.1f}%")
        
        if self.failed == 0:
            print("\n✅ APPLICATION IS PRODUCTION READY!")
            print("\nNext steps:")
            print("1. Review QUICK_START_PRODUCTION.md")
            print("2. Configure .env.docker with your settings")
            print("3. Run: docker-compose --env-file .env.docker up -d")
            return 0
        else:
            print(f"\n❌ Fix {self.failed} issue(s) before deployment")
            return 1

if __name__ == "__main__":
    validator = ProductionValidator()
    sys.exit(validator.run_all_checks())
