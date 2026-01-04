import pyotp
import re
import numpy as np
from urllib.parse import unquote

# Try to import QR decoding libraries
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

def extract_qr_data(image_bytes: bytes) -> str:
    """Extract raw QR code data from image"""
    if not CV2_AVAILABLE:
        raise ValueError(
            "QR code decoding is not available. Please install opencv-python. "
            "As a workaround, you can manually enter the 2FA secret code instead of scanning a QR code."
        )

    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        # Decode image
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Could not decode image - invalid image format or corrupted file")

        # Use OpenCV's QR code detector
        detector = cv2.QRCodeDetector()
        qr_data, points, _ = detector.detectAndDecode(img)

        if not qr_data:
            raise ValueError("No QR code found in image - make sure the QR code is clearly visible and well-lit")

        return qr_data

    except Exception as e:
        raise ValueError(f"Failed to decode QR code: {str(e)}")

def extract_secret_from_qr(image_bytes: bytes) -> dict:
    """Extract TOTP/HOTP secret, type, and counter from QR code image using OpenCV"""
    qr_data = extract_qr_data(image_bytes)
    return extract_secret_from_qr_data(qr_data)

def extract_secret_from_qr_data(qr_data: str) -> dict:
    """Extract TOTP/HOTP secret, type, and counter from QR code data string"""
    if 'otpauth://' in qr_data:
        # Extract secret parameter
        secret_match = re.search(r'secret=([A-Z2-7]+)', qr_data, re.IGNORECASE)
        if not secret_match:
            return None
        
        secret = secret_match.group(1).upper()
        
        # Extract OTP type (totp/hotp)
        type_match = re.search(r'otpauth://(totp|hotp)', qr_data, re.IGNORECASE)
        otp_type = type_match.group(1).upper() if type_match else "TOTP"
        
        # Extract counter for HOTP
        counter_match = re.search(r'counter=(\d+)', qr_data, re.IGNORECASE)
        counter = int(counter_match.group(1)) if counter_match else 0
        
        return {
            "secret": secret,
            "otp_type": otp_type,
            "counter": counter
        }
    
    # If no otpauth format, assume the data is the secret directly
    return {
        "secret": qr_data.upper(),
        "otp_type": "TOTP",
        "counter": 0
    }

def extract_issuer_from_qr_data(qr_data: str) -> str:
    """Extract issuer/service name from QR code data"""
    if 'otpauth://' in qr_data:
        # Extract issuer parameter from otpauth URL
        issuer_match = re.search(r'issuer=([^&]+)', qr_data, re.IGNORECASE)
        if issuer_match:
            return unquote(issuer_match.group(1).replace('+', ' '))
        
        # If no issuer parameter, try to extract from the label part
        # Format: otpauth://totp/Issuer:Label?...
        label_match = re.search(r'otpauth://totp/([^:?]+)', qr_data)
        if label_match:
            return unquote(label_match.group(1).replace('+', ' '))
    
    return ""

def extract_account_name_from_qr_data(qr_data: str) -> str:
    """Extract account name from QR code data"""
    if 'otpauth://' in qr_data:
        # Extract account name from the label part
        # Format: otpauth://totp/Issuer:AccountName?...
        label_match = re.search(r'otpauth://totp/[^:]*:([^?]+)', qr_data)
        if label_match:
            return unquote(label_match.group(1).replace('+', ' '))
    
    return ""

def extract_issuer_from_qr(image_bytes: bytes) -> str:
    """Extract issuer from QR code image"""
    qr_data = extract_qr_data(image_bytes)
    return extract_issuer_from_qr_data(qr_data)

def get_service_icon(service_name: str) -> str:
    """Get FontAwesome icon class for a service based on its name"""
    if not service_name:
        return 'fab fa-key'
    
    service_name = service_name.lower().strip()
    
    # Common service mappings
    icon_map = {
        # Tech companies
        'google': 'fab fa-google',
        'microsoft': 'fab fa-microsoft',
        'apple': 'fab fa-apple',
        'amazon': 'fab fa-amazon',
        'facebook': 'fab fa-facebook',
        'twitter': 'fab fa-twitter',
        'instagram': 'fab fa-instagram',
        'linkedin': 'fab fa-linkedin',
        'github': 'fab fa-github',
        'gitlab': 'fab fa-gitlab',
        'bitbucket': 'fab fa-bitbucket',
        'slack': 'fab fa-slack',
        'discord': 'fab fa-discord',
        'zoom': 'fas fa-video',
        'teams': 'fab fa-microsoft',
        'skype': 'fab fa-skype',
        
        # Email services
        'gmail': 'fab fa-google',
        'outlook': 'fab fa-microsoft',
        'yahoo': 'fab fa-yahoo',
        'protonmail': 'fas fa-shield-alt',
        
        # Cloud services
        'aws': 'fab fa-aws',
        'azure': 'fab fa-microsoft',
        'digitalocean': 'fab fa-digital-ocean',
        'heroku': 'fab fa-heroku',
        'netlify': 'fas fa-globe',
        'vercel': 'fas fa-rocket',
        
        # Remote access
        'rustdesk': 'fas fa-desktop',
        'teamviewer': 'fas fa-tv',
        'anydesk': 'fas fa-desktop',
        'chrome remote desktop': 'fab fa-chrome',
        
        # Password managers
        'lastpass': 'fas fa-key',
        'bitwarden': 'fas fa-shield-alt',
        '1password': 'fas fa-key',
        'keepass': 'fas fa-key',
        
        # Banking/Finance
        'paypal': 'fab fa-paypal',
        'stripe': 'fab fa-stripe-s',
        'coinbase': 'fab fa-bitcoin',
        
        # Communication
        'telegram': 'fab fa-telegram',
        'whatsapp': 'fab fa-whatsapp',
        'signal': 'fas fa-comment',
        
        # Development
        'jetbrains': 'fas fa-code',
        'visual studio': 'fab fa-microsoft',
        'vscode': 'fas fa-code',
        
        # Self-hosted services
        'nextcloud': 'fas fa-cloud',
        'owncloud': 'fas fa-cloud',
        'pi-hole': 'fas fa-shield-alt',
        'home assistant': 'fas fa-home',
        'plex': 'fas fa-play',
        'jellyfin': 'fas fa-play',
        'emby': 'fas fa-play',
        
        # Generic fallbacks
        'auth': 'fas fa-key',
        'login': 'fas fa-sign-in-alt',
        'account': 'fas fa-user',
        'security': 'fas fa-shield-alt',
        '2fa': 'fas fa-key',
        'totp': 'fas fa-clock',
    }
    
    # Check for exact matches first
    if service_name in icon_map:
        return icon_map[service_name]
    
    # Check for partial matches
    for key, icon in icon_map.items():
        if key in service_name or service_name in key:
            return icon
    
    # Default fallback
    return 'fab fa-key'

def get_service_color(service_name: str) -> str:
    """Get color for a service based on its name"""
    if not service_name:
        return '#6B46C1'
    
    service_name = service_name.lower().strip()
    
    # Common service color mappings
    color_map = {
        # Tech companies
        'google': '#4285F4',
        'microsoft': '#00BCF2',
        'apple': '#000000',
        'amazon': '#FF9900',
        'facebook': '#1877F2',
        'twitter': '#1DA1F2',
        'instagram': '#E4405F',
        'linkedin': '#0077B5',
        'github': '#181717',
        'gitlab': '#FC6D26',
        'bitbucket': '#0052CC',
        'slack': '#4A154B',
        'discord': '#5865F2',
        'zoom': '#2D8CFF',
        'teams': '#6264A7',
        'skype': '#00AFF0',
        
        # Email services
        'gmail': '#EA4335',
        'outlook': '#0078D4',
        'yahoo': '#5F01D1',
        'protonmail': '#6D4AFF',
        
        # Cloud services
        'aws': '#FF9900',
        'azure': '#0078D4',
        'digitalocean': '#0080FF',
        'heroku': '#430098',
        'netlify': '#00C46A',
        'vercel': '#000000',
        
        # Remote access
        'rustdesk': '#1E90FF',
        'teamviewer': '#0E70F5',
        'anydesk': '#EF443B',
        'chrome remote desktop': '#4285F4',
        
        # Password managers
        'lastpass': '#D32F2F',
        'bitwarden': '#175DDC',
        '1password': '#0094F5',
        'keepass': '#4CAF50',
        
        # Banking/Finance
        'paypal': '#003087',
        'stripe': '#635BFF',
        'coinbase': '#0052FF',
        
        # Communication
        'telegram': '#0088CC',
        'whatsapp': '#25D366',
        'signal': '#3A76F0',
        
        # Development
        'jetbrains': '#000000',
        'visual studio': '#5C2D91',
        'vscode': '#007ACC',
        
        # Self-hosted services
        'nextcloud': '#0082C9',
        'owncloud': '#041E42',
        'pi-hole': '#96060C',
        'home assistant': '#18BCF2',
        'plex': '#E5A00D',
        'jellyfin': '#AA5CC3',
        'emby': '#52B54B',
        
        # Generic fallbacks
        'auth': '#6B46C1',
        'login': '#6B46C1',
        'account': '#6B46C1',
        'security': '#6B46C1',
        '2fa': '#6B46C1',
        'totp': '#6B46C1',
    }
    
    # Check for exact matches first
    if service_name in color_map:
        return color_map[service_name]
    
    # Check for partial matches
    for key, color in color_map.items():
        if key in service_name or service_name in key:
            return color
    
    # Default fallback
    return '#6B46C1'

def generate_totp_code(secret: str, otp_type: str = "TOTP", counter: int = 0) -> str:
    """Generate TOTP or HOTP code based on type"""
    if otp_type == "HOTP":
        hotp = pyotp.HOTP(secret)
        return hotp.at(counter)
    else:  # TOTP
        totp = pyotp.TOTP(secret)
        return totp.now()

def generate_backup_key() -> str:
    return pyotp.random_base32()


# Password Policy Functions
import re
import hashlib
import requests
from typing import List, Dict, Any, Optional


class PasswordPolicy:
    """Advanced password policy enforcement"""

    # Default policy settings (can be made configurable)
    MIN_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGITS = True
    REQUIRE_SPECIAL_CHARS = True
    PREVENT_COMMON_PASSWORDS = True
    MAX_REPEATED_CHARS = 3  # Max consecutive repeated characters

    COMMON_PASSWORDS = {
        "password", "123456", "123456789", "qwerty", "abc123", "password123",
        "admin", "letmein", "welcome", "monkey", "1234567890", "password1",
        "qwerty123", "welcome123", "admin123", "root", "user", "guest"
    }

    @classmethod
    def validate_password(cls, password: str) -> Dict[str, Any]:
        """
        Validate password against policy requirements.
        Returns dict with 'valid': bool and 'errors': list of error messages.
        """
        errors = []

        # Length check
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters long")

        # Character requirements
        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")

        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")

        if cls.REQUIRE_DIGITS and not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")

        if cls.REQUIRE_SPECIAL_CHARS and not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
            errors.append("Password must contain at least one special character")

        # Repeated characters check
        if re.search(r'(.)\1{' + str(cls.MAX_REPEATED_CHARS) + r',}', password):
            errors.append(f"Password cannot contain more than {cls.MAX_REPEATED_CHARS} consecutive repeated characters")

        # Common password check
        if cls.PREVENT_COMMON_PASSWORDS and password.lower() in cls.COMMON_PASSWORDS:
            errors.append("Password is too common. Please choose a more unique password")

        # Sequential characters check (basic)
        if re.search(r'(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)', password.lower()):
            errors.append("Password cannot contain sequential characters")

        if re.search(r'(?:012|123|234|345|456|567|678|789|890|901)', password):
            errors.append("Password cannot contain sequential digits")

        return {
            "valid": len(errors) == 0,
            "errors": errors
        }

    @classmethod
    def check_password_breach(cls, password: str) -> Dict[str, Any]:
        """
        Check if password has been breached using HaveIBeenPwned API.
        Uses k-anonymity: only sends first 5 chars of hash.
        Returns dict with 'breached': bool and 'count': int (breach count).
        """
        try:
            # Hash the password
            sha1_hash = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()

            # Send first 5 chars to API
            prefix = sha1_hash[:5]
            suffix = sha1_hash[5:]

            response = requests.get(f"https://api.pwnedpasswords.com/range/{prefix}", timeout=5)
            response.raise_for_status()

            # Check if our suffix appears in the response
            lines = response.text.split('\n')
            for line in lines:
                if line.startswith(suffix):
                    count = int(line.split(':')[1])
                    return {
                        "breached": True,
                        "count": count,
                        "message": f"This password has been seen in {count:,} data breaches"
                    }

            return {
                "breached": False,
                "count": 0,
                "message": "Password not found in known breaches"
            }

        except requests.RequestException:
            # If API is unavailable, don't block registration but log warning
            return {
                "breached": False,
                "count": 0,
                "message": "Could not check password against breach database",
                "error": True
            }


def hash_password_for_history(password: str) -> str:
    """Hash password for history storage (different from auth hash for security)"""
    return hashlib.sha256(password.encode()).hexdigest()


def check_password_history(db, user_id: int, password: str, history_limit: int = 5) -> bool:
    """
    Check if password has been used recently.
    Returns True if password is acceptable (not in history), False if it's been used recently.
    """
    from . import models

    # Hash the password for comparison
    password_hash = hash_password_for_history(password)

    # Get recent password history
    recent_passwords = db.query(models.PasswordHistory).filter(
        models.PasswordHistory.user_id == user_id
    ).order_by(models.PasswordHistory.created_at.desc()).limit(history_limit).all()

    # Check if this password hash matches any recent password
    for old_password in recent_passwords:
        if old_password.password_hash == password_hash:
            return False

    return True


def add_password_to_history(db, user_id: int, password: str):
    """Add a password to the user's history"""
    from . import models

    password_hash = hash_password_for_history(password)

    history_entry = models.PasswordHistory(
        user_id=user_id,
        password_hash=password_hash
    )

    db.add(history_entry)
    db.commit()

# Email utilities
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

def get_smtp_config(db):
    """Get SMTP configuration from database"""
    from .models import SMTPConfig
    from .smtp_encryption import decrypt_smtp_password
    
    config = db.query(SMTPConfig).first()
    if not config or not config.enabled:
        return None
    
    # Decrypt password if encrypted
    password = config.password
    try:
        from .smtp_encryption import is_encrypted
        if is_encrypted(password):
            password = decrypt_smtp_password(password)
    except:
        pass
    
    return {
        'host': config.host,
        'port': config.port,
        'username': config.username,
        'password': password,
        'from_email': config.from_email,
        'from_name': config.from_name
    }

def send_password_reset_email(db, user_email: str, reset_token: str, app_url: str = "http://localhost:3000"):
    """Send password reset email to user"""
    smtp_config = get_smtp_config(db)
    
    if not smtp_config:
        # Return False if SMTP not configured
        return False
    
    try:
        reset_link = f"{app_url}/auth/reset?token={reset_token}"
        
        # Create email
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Password Reset Request'
        msg['From'] = f"{smtp_config['from_name']} <{smtp_config['from_email']}>"
        msg['To'] = user_email
        
        # Plain text version
        text = f"""
Hello,

You have requested to reset your password. Click the link below to set a new password:

{reset_link}

This link will expire in 1 hour.

If you did not request this, please ignore this email.

Best regards,
{smtp_config['from_name']}
"""
        
        # HTML version
        html = f"""
<html>
  <body>
    <p>Hello,</p>
    <p>You have requested to reset your password. Click the link below to set a new password:</p>
    <p><a href="{reset_link}">Reset Password</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you did not request this, please ignore this email.</p>
    <p>Best regards,<br>{smtp_config['from_name']}</p>
  </body>
</html>
"""
        
        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email
        with smtplib.SMTP(smtp_config['host'], smtp_config['port']) as server:
            server.starttls()
            server.login(smtp_config['username'], smtp_config['password'])
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Failed to send password reset email: {str(e)}")
        return False

def send_security_alert_email(db, user_email: str, event_type: str, details: dict = None, app_url: str = "http://localhost:3000"):
    """Send security alert email to user"""
    smtp_config = get_smtp_config(db)
    
    if not smtp_config:
        return False
    
    try:
        event_messages = {
            'login': 'A new login to your account was detected',
            'password_changed': 'Your password has been changed',
            '2fa_enabled': 'Two-factor authentication has been enabled on your account',
            '2fa_disabled': 'Two-factor authentication has been disabled on your account',
            'account_added': 'A new 2FA account has been added',
            'suspicious_activity': 'Suspicious activity detected on your account'
        }
        
        event_message = event_messages.get(event_type, f'{event_type} event')
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'Security Alert: {event_message}'
        msg['From'] = f"{smtp_config['from_name']} <{smtp_config['from_email']}>"
        msg['To'] = user_email
        
        details_text = ""
        if details:
            if details.get('ip_address'):
                details_text += f"\nIP Address: {details['ip_address']}"
            if details.get('device'):
                details_text += f"\nDevice: {details['device']}"
            if details.get('time'):
                details_text += f"\nTime: {details['time']}"
        
        text = f"""
Hello,

{event_message}.{details_text}

If this was not you, please secure your account immediately by changing your password.

Settings: {app_url}/settings

Best regards,
{smtp_config['from_name']}
"""
        
        html = f"""
<html>
  <body>
    <p>Hello,</p>
    <p>{event_message}.{details_text.replace(chr(10), '<br>')}</p>
    <p>If this was not you, please secure your account immediately by changing your password.</p>
    <p><a href="{app_url}/settings">Go to Settings</a></p>
    <p>Best regards,<br>{smtp_config['from_name']}</p>
  </body>
</html>
"""
        
        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        with smtplib.SMTP(smtp_config['host'], smtp_config['port']) as server:
            server.starttls()
            server.login(smtp_config['username'], smtp_config['password'])
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Failed to send security alert email: {str(e)}")
        return False