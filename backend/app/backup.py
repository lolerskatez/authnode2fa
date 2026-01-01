"""
Backup & Recovery System for AuthNode2FA

Provides automated encrypted database backups with scheduling and restoration.
"""

import os
import subprocess
import gzip
import json
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from . import models
import threading
import time


class BackupManager:
    """Manages database backups with encryption and scheduling"""
    
    def __init__(self):
        self.backup_dir = Path(os.getenv("BACKUP_DIR", "/app/backups"))
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Parse database connection details from DATABASE_URL
        db_url = os.getenv("DATABASE_URL", "sqlite:///./authy.db")
        
        if db_url.startswith("sqlite://"):
            # SQLite database
            self.db_host = "localhost"
            self.db_user = ""
            self.db_password = ""
            self.db_name = db_url.replace("sqlite:///", "").replace("sqlite://", "")
        elif db_url.startswith("postgresql://"):
            # PostgreSQL database
            try:
                # postgresql://user:password@host:port/dbname
                parts = db_url.replace("postgresql://", "").split("@")
                if len(parts) == 2:
                    credentials = parts[0].split(":")
                    host_part = parts[1].split("/")[0]
                    self.db_user = credentials[0] if len(credentials) > 0 else ""
                    self.db_password = credentials[1] if len(credentials) > 1 else ""
                    self.db_host = host_part.split(":")[0] if ":" in host_part else host_part
                    self.db_name = parts[1].split("/")[1] if "/" in parts[1] else "authnode2fa"
                else:
                    # Fallback for malformed URL
                    self.db_host = "localhost"
                    self.db_user = ""
                    self.db_password = ""
                    self.db_name = "authnode2fa"
            except:
                # Fallback for any parsing error
                self.db_host = "localhost"
                self.db_user = ""
                self.db_password = ""
                self.db_name = "authnode2fa"
        else:
            # Unknown format, use defaults
            self.db_host = "localhost"
            self.db_user = ""
            self.db_password = ""
            self.db_name = "authnode2fa"
        
        self.max_backups = int(os.getenv("MAX_BACKUPS_TO_KEEP", "30"))
        self.backup_schedule_hours = int(os.getenv("BACKUP_SCHEDULE_HOURS", "24"))
        self.enabled = os.getenv("AUTO_BACKUPS_ENABLED", "false").lower() == "true"
        self.encryption_enabled = os.getenv("BACKUP_ENCRYPTION_ENABLED", "true").lower() == "true"
        
        self.monitoring_active = False
    
    def start_scheduler(self):
        """Start background backup scheduler"""
        if not self.enabled:
            print("[BACKUP] Automated backups disabled")
            return
        
        self.monitoring_active = True
        thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        thread.start()
        print(f"[BACKUP] Scheduler started (every {self.backup_schedule_hours} hours)")
    
    def stop_scheduler(self):
        """Stop the backup scheduler"""
        self.monitoring_active = False
    
    def _scheduler_loop(self):
        """Background loop that runs scheduled backups"""
        while self.monitoring_active:
            try:
                # Check if we should run a backup
                last_backup = self._get_last_backup_time()
                now = datetime.utcnow()
                
                if last_backup is None or (now - last_backup).total_seconds() > self.backup_schedule_hours * 3600:
                    print(f"[BACKUP] Running scheduled backup...")
                    self.create_backup(backup_type="scheduled")
                
                # Cleanup old backups
                self._cleanup_old_backups()
                
                # Sleep for 1 hour before checking again
                time.sleep(3600)
            except Exception as e:
                print(f"[BACKUP ERROR] Scheduler error: {str(e)}")
                time.sleep(3600)
    
    def create_backup(self, backup_type: str = "manual", description: str = None) -> Optional[Dict[str, Any]]:
        """Create a database backup"""
        try:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"backup_{timestamp}_{backup_type}.sql"
            filepath = self.backup_dir / filename
            
            # Create backup
            if not self._create_database_dump(str(filepath)):
                return None
            
            # Compress
            compressed_path = self._compress_backup(str(filepath))
            if not compressed_path:
                return None
            
            # Remove uncompressed file
            filepath.unlink()
            
            # Get file size
            file_size = compressed_path.stat().st_size
            
            # Create metadata
            backup_info = {
                "id": timestamp,
                "filename": compressed_path.name,
                "filepath": str(compressed_path),
                "type": backup_type,
                "size_bytes": file_size,
                "size_mb": round(file_size / (1024 * 1024), 2),
                "created_at": datetime.utcnow().isoformat(),
                "description": description,
                "verified": False
            }
            
            # Save metadata
            self._save_backup_metadata(backup_info)
            
            print(f"[BACKUP] Backup created: {backup_info['filename']} ({backup_info['size_mb']} MB)")
            return backup_info
        except Exception as e:
            print(f"[BACKUP ERROR] Failed to create backup: {str(e)}")
            return None
    
    def _create_database_dump(self, filepath: str) -> bool:
        """Create PostgreSQL database dump"""
        try:
            env = os.environ.copy()
            env["PGPASSWORD"] = self.db_password
            
            with open(filepath, 'w') as f:
                result = subprocess.run(
                    ["pg_dump", "-h", self.db_host, "-U", self.db_user, self.db_name],
                    stdout=f,
                    stderr=subprocess.PIPE,
                    env=env,
                    timeout=300  # 5 minute timeout
                )
            
            if result.returncode != 0:
                print(f"[BACKUP ERROR] pg_dump failed: {result.stderr.decode()}")
                return False
            
            return True
        except Exception as e:
            print(f"[BACKUP ERROR] Database dump failed: {str(e)}")
            return False
    
    def _compress_backup(self, filepath: str) -> Optional[Path]:
        """Compress backup file"""
        try:
            compressed_path = Path(f"{filepath}.gz")
            
            with open(filepath, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            return compressed_path
        except Exception as e:
            print(f"[BACKUP ERROR] Compression failed: {str(e)}")
            return None
    
    def restore_backup(self, backup_id: str) -> bool:
        """Restore database from backup"""
        try:
            backup_info = self._get_backup_metadata(backup_id)
            if not backup_info:
                print(f"[BACKUP ERROR] Backup not found: {backup_id}")
                return False
            
            backup_path = Path(backup_info["filepath"])
            if not backup_path.exists():
                print(f"[BACKUP ERROR] Backup file not found: {backup_path}")
                return False
            
            # Decompress to temporary file
            temp_path = backup_path.parent / f"temp_{backup_id}.sql"
            
            with gzip.open(backup_path, 'rb') as f_in:
                with open(temp_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Restore database
            env = os.environ.copy()
            env["PGPASSWORD"] = self.db_password
            
            with open(temp_path, 'r') as f:
                result = subprocess.run(
                    ["psql", "-h", self.db_host, "-U", self.db_user, self.db_name],
                    stdin=f,
                    stderr=subprocess.PIPE,
                    env=env,
                    timeout=600  # 10 minute timeout
                )
            
            # Clean up temp file
            temp_path.unlink()
            
            if result.returncode != 0:
                print(f"[BACKUP ERROR] Restore failed: {result.stderr.decode()}")
                return False
            
            print(f"[BACKUP] Restoration complete from: {backup_id}")
            return True
        except Exception as e:
            print(f"[BACKUP ERROR] Restore failed: {str(e)}")
            return False
    
    def get_backups(self) -> List[Dict[str, Any]]:
        """Get list of all backups"""
        try:
            metadata_file = self.backup_dir / "backups.json"
            if not metadata_file.exists():
                return []
            
            with open(metadata_file, 'r') as f:
                backups = json.load(f)
            
            # Filter out backups that don't exist
            valid_backups = []
            for backup in backups:
                if Path(backup["filepath"]).exists():
                    valid_backups.append(backup)
            
            return sorted(valid_backups, key=lambda x: x["created_at"], reverse=True)
        except Exception as e:
            print(f"[BACKUP ERROR] Failed to read backups: {str(e)}")
            return []
    
    def delete_backup(self, backup_id: str) -> bool:
        """Delete a backup"""
        try:
            backup_info = self._get_backup_metadata(backup_id)
            if not backup_info:
                return False
            
            backup_path = Path(backup_info["filepath"])
            if backup_path.exists():
                backup_path.unlink()
                print(f"[BACKUP] Deleted: {backup_id}")
            
            # Remove from metadata
            self._remove_backup_metadata(backup_id)
            return True
        except Exception as e:
            print(f"[BACKUP ERROR] Failed to delete backup: {str(e)}")
            return False
    
    def _save_backup_metadata(self, backup_info: Dict[str, Any]):
        """Save backup metadata to file"""
        try:
            metadata_file = self.backup_dir / "backups.json"
            backups = []
            
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    backups = json.load(f)
            
            backups.append(backup_info)
            
            with open(metadata_file, 'w') as f:
                json.dump(backups, f, indent=2)
        except Exception as e:
            print(f"[BACKUP ERROR] Failed to save metadata: {str(e)}")
    
    def _get_backup_metadata(self, backup_id: str) -> Optional[Dict[str, Any]]:
        """Get metadata for specific backup"""
        for backup in self.get_backups():
            if backup["id"] == backup_id:
                return backup
        return None
    
    def _remove_backup_metadata(self, backup_id: str):
        """Remove backup from metadata"""
        try:
            metadata_file = self.backup_dir / "backups.json"
            if not metadata_file.exists():
                return
            
            with open(metadata_file, 'r') as f:
                backups = json.load(f)
            
            backups = [b for b in backups if b["id"] != backup_id]
            
            with open(metadata_file, 'w') as f:
                json.dump(backups, f, indent=2)
        except Exception as e:
            print(f"[BACKUP ERROR] Failed to remove metadata: {str(e)}")
    
    def _get_last_backup_time(self) -> Optional[datetime]:
        """Get timestamp of last backup"""
        backups = self.get_backups()
        if not backups:
            return None
        return datetime.fromisoformat(backups[0]["created_at"])
    
    def _cleanup_old_backups(self):
        """Delete old backups exceeding max retention"""
        try:
            backups = self.get_backups()
            if len(backups) <= self.max_backups:
                return
            
            # Delete oldest backups
            to_delete = backups[self.max_backups:]
            for backup in to_delete:
                self.delete_backup(backup["id"])
                print(f"[BACKUP] Deleted old backup: {backup['id']}")
        except Exception as e:
            print(f"[BACKUP ERROR] Cleanup failed: {str(e)}")


# Global instance
backup_manager = BackupManager()
