#!/usr/bin/env python
"""
Setup script for local development.
This script sets up the backend for local testing.
"""
import os
import subprocess
import sys
from pathlib import Path

def run_command(command, cwd=None):
    """Run a shell command and return True if successful."""
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, check=True, capture_output=True, text=True)
        print(f"✓ {command}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ {command}")
        print(f"Error: {e.stderr}")
        return False

def main():
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)

    print("Setting up backend for local development...")

    # Check if virtual environment exists
    venv_scripts = backend_dir / ".venv" / "Scripts"
    venv_bin = backend_dir / ".venv" / "bin"
    
    if venv_scripts.exists():
        python_exe = str(venv_scripts / "python.exe")
    elif venv_bin.exists():
        python_exe = str(venv_bin / "python")
    else:
        print("Virtual environment not found. Please run configure_python_environment first.")
        sys.exit(1)

    # Install dependencies
    if not run_command(f'"{python_exe}" -m pip install -r requirements.txt'):
        sys.exit(1)

    # Create .env if it doesn't exist
    env_file = backend_dir / ".env"
    if not env_file.exists():
        env_content = """DATABASE_URL=sqlite:///./authy.db
ENCRYPTION_KEY=cYLcVxWRSrY0tUhsDcmJ4jbx0HuYAY34mz42nQ5v3_k=
"""
        env_file.write_text(env_content)
        print("✓ Created .env file")

    # Run database migrations
    if not run_command(f'"{python_exe}" -m alembic upgrade head'):
        sys.exit(1)

    # Create test user
    if not run_command(f'"{python_exe}" create_test_user.py'):
        sys.exit(1)

    print("\n✓ Backend setup complete!")
    print("You can now run the backend with: python run_server.py")

if __name__ == "__main__":
    main()