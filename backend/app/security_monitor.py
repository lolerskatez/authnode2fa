"""
Security Monitoring Module for AuthNode2FA

Provides real-time monitoring and alerting for suspicious security events:
- Brute force attack detection
- Unusual login patterns
- Failed authentication spikes
- Suspicious IP activity
- Account compromise indicators

Monitors audit logs and triggers alerts via email when suspicious patterns are detected.
"""

import os
import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
import threading


class SecurityMonitor:
    """Monitors security events and triggers alerts for suspicious activity"""

    def __init__(self, db_session_factory=None):
        self.db_session_factory = db_session_factory
        self.alert_cooldowns: Dict[str, float] = {}  # alert_type -> last_alert_time
        self.event_queues: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))

        # Monitoring thresholds (configurable via environment)
        self.BRUTE_FORCE_THRESHOLD = int(os.getenv("BRUTE_FORCE_THRESHOLD", "5"))  # Failed logins per minute
        self.UNUSUAL_IP_THRESHOLD = int(os.getenv("UNUSUAL_IP_THRESHOLD", "3"))  # Different IPs per hour per user
        self.ALERT_COOLDOWN_MINUTES = int(os.getenv("ALERT_COOLDOWN_MINUTES", "15"))  # Min time between alerts

        # Start monitoring thread
        self.monitoring_active = False
        self.monitor_thread = None

    def start_monitoring(self):
        """Start the security monitoring thread"""
        if not self.monitoring_active:
            self.monitoring_active = True
            self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
            self.monitor_thread.start()

    def stop_monitoring(self):
        """Stop the security monitoring thread"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)

    def log_security_event(self, event_type: str, user_id: Optional[int] = None,
                          ip_address: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        """
        Log a security event for monitoring.
        This should be called from audit logging functions.
        """
        event = {
            'timestamp': time.time(),
            'type': event_type,
            'user_id': user_id,
            'ip_address': ip_address,
            'details': details or {}
        }

        # Add to event queue
        self.event_queues[event_type].append(event)

        # Check for immediate alerts
        self._check_immediate_alerts(event)

    def _monitor_loop(self):
        """Main monitoring loop that runs in background thread"""
        while self.monitoring_active:
            try:
                self._analyze_patterns()
                time.sleep(60)  # Check every minute
            except Exception as e:
                print(f"Security monitoring error: {e}")
                time.sleep(60)

    def _check_immediate_alerts(self, event: Dict[str, Any]):
        """Check for alerts that should be triggered immediately"""
        event_type = event['type']

        # Brute force detection
        if event_type == 'login_failed':
            failed_logins = [e for e in self.event_queues['login_failed']
                           if e['timestamp'] > time.time() - 60]  # Last minute

            if len(failed_logins) >= self.BRUTE_FORCE_THRESHOLD:
                # Group by IP to see if it's targeted
                ip_counts = defaultdict(int)
                for login in failed_logins:
                    ip_counts[login.get('ip_address', 'unknown')] += 1

                # Alert if any IP has many failures
                for ip, count in ip_counts.items():
                    if count >= self.BRUTE_FORCE_THRESHOLD:
                        self._trigger_alert('brute_force_attack', {
                            'ip_address': ip,
                            'failed_attempts': count,
                            'time_window': '1 minute'
                        })

        # Multiple failed logins for same user
        elif event_type == 'login_failed' and event.get('user_id'):
            user_id = event['user_id']
            user_failures = [e for e in self.event_queues['login_failed']
                           if e.get('user_id') == user_id and e['timestamp'] > time.time() - 300]  # Last 5 minutes

            if len(user_failures) >= 3:
                self._trigger_alert('multiple_user_failures', {
                    'user_id': user_id,
                    'failed_attempts': len(user_failures),
                    'time_window': '5 minutes'
                })

    def _analyze_patterns(self):
        """Analyze patterns in recent events to detect suspicious activity"""
        now = time.time()
        one_hour_ago = now - 3600

        # Analyze login patterns
        login_events = []
        for event_type in ['login_success', 'login_failed']:
            login_events.extend([
                e for e in self.event_queues[event_type]
                if e['timestamp'] > one_hour_ago
            ])

        # Group by user and IP
        user_ip_patterns: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

        for event in login_events:
            user_id = str(event.get('user_id', 'unknown'))
            ip = event.get('ip_address', 'unknown')
            user_ip_patterns[user_id][ip] += 1

        # Check for users logging in from many different IPs
        for user_id, ip_counts in user_ip_patterns.items():
            if len(ip_counts) >= self.UNUSUAL_IP_THRESHOLD:
                total_logins = sum(ip_counts.values())
                self._trigger_alert('unusual_login_pattern', {
                    'user_id': user_id,
                    'unique_ips': len(ip_counts),
                    'total_logins': total_logins,
                    'time_window': '1 hour'
                })

        # Check for password reset abuse
        password_reset_events = [
            e for e in self.event_queues.get('password_reset_requested', [])
            if e['timestamp'] > one_hour_ago
        ]

        if len(password_reset_events) >= 10:  # Many reset requests
            self._trigger_alert('password_reset_spike', {
                'reset_requests': len(password_reset_events),
                'time_window': '1 hour'
            })

        # Check for 2FA disable attempts
        disable_2fa_events = [
            e for e in self.event_queues.get('2fa_disabled', [])
            if e['timestamp'] > one_hour_ago
        ]

        if len(disable_2fa_events) >= 3:  # Multiple 2FA disables
            self._trigger_alert('multiple_2fa_disables', {
                'disable_events': len(disable_2fa_events),
                'time_window': '1 hour'
            })

    def _trigger_alert(self, alert_type: str, details: Dict[str, Any]):
        """Trigger a security alert with cooldown to prevent spam"""
        now = time.time()
        last_alert = self.alert_cooldowns.get(alert_type, 0)

        # Check cooldown
        if now - last_alert < (self.ALERT_COOLDOWN_MINUTES * 60):
            return  # Too soon since last alert

        self.alert_cooldowns[alert_type] = now

        # Log the alert
        print(f"SECURITY ALERT: {alert_type.upper()} - {details}")

        # Send email alert (async to avoid blocking)
        threading.Thread(target=self._send_alert_email, args=(alert_type, details), daemon=True).start()

    def _send_alert_email(self, alert_type: str, details: Dict[str, Any]):
        """Send security alert email"""
        try:
            if not self.db_session_factory:
                return

            # Get SMTP config and send email
            from .utils import get_smtp_config

            with self.db_session_factory() as db:
                smtp_config = get_smtp_config(db)
                if not smtp_config:
                    return

                # Prepare alert message
                alert_messages = {
                    'brute_force_attack': 'Brute Force Attack Detected',
                    'multiple_user_failures': 'Multiple Failed Login Attempts',
                    'unusual_login_pattern': 'Unusual Login Pattern Detected',
                    'password_reset_spike': 'Password Reset Request Spike',
                    'multiple_2fa_disables': 'Multiple 2FA Disable Events'
                }

                subject = f"Security Alert: {alert_messages.get(alert_type, alert_type)}"

                # Build email content
                body_lines = [
                    f"A security alert has been triggered: {alert_messages.get(alert_type, alert_type)}",
                    "",
                    "Details:"
                ]

                for key, value in details.items():
                    body_lines.append(f"- {key}: {value}")

                body_lines.extend([
                    "",
                    "Please investigate this activity immediately.",
                    "",
                    "This is an automated security alert."
                ])

                body = "\n".join(body_lines)

                # Get admin emails from database
                from . import models
                admin_users = db.query(models.User).filter(models.User.role == 'admin').all()
                admin_emails = [user.email for user in admin_users]

                if not admin_emails:
                    return

                # Send email to all admins
                import smtplib
                from email.mime.text import MIMEText
                from email.mime.multipart import MIMEMultipart

                for admin_email in admin_emails:
                    msg = MIMEMultipart('alternative')
                    msg['Subject'] = subject
                    msg['From'] = f"{smtp_config['from_name']} <{smtp_config['from_email']}>"
                    msg['To'] = admin_email

                    part1 = MIMEText(body, 'plain')
                    msg.attach(part1)

                    with smtplib.SMTP(smtp_config['host'], smtp_config['port']) as server:
                        server.starttls()
                        server.login(smtp_config['username'], smtp_config['password'])
                        server.send_message(msg)

        except Exception as e:
            print(f"Failed to send security alert email: {e}")


# Global security monitor instance
security_monitor = SecurityMonitor()


def get_security_monitor():
    """Get the global security monitor instance"""
    return security_monitor


def initialize_security_monitoring(db_session_factory):
    """Initialize security monitoring with database access"""
    global security_monitor
    security_monitor.db_session_factory = db_session_factory
    security_monitor.start_monitoring()


def log_security_event(event_type: str, user_id: Optional[int] = None,
                      ip_address: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
    """Convenience function to log security events"""
    security_monitor.log_security_event(event_type, user_id, ip_address, details)
