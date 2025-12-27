import pyotp
import re
import numpy as np

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
            raise ValueError("Could not decode image")
        
        # Use OpenCV's QR code detector
        detector = cv2.QRCodeDetector()
        qr_data, points, _ = detector.detectAndDecode(img)
        
        if not qr_data:
            raise ValueError("No QR code found in image")
        
        return qr_data
        
    except Exception as e:
        raise ValueError(f"Failed to decode QR code: {str(e)}")

def extract_secret_from_qr(image_bytes: bytes) -> str:
    """Extract TOTP secret from QR code image using OpenCV"""
    qr_data = extract_qr_data(image_bytes)
    return extract_secret_from_qr_data(qr_data)

def extract_secret_from_qr_data(qr_data: str) -> str:
    """Extract TOTP secret from QR code data string"""
    # QR codes for TOTP are in otpauth:// format
    # Example: otpauth://totp/Example:user@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example
    if 'otpauth://' in qr_data:
        # Extract secret parameter from otpauth URL
        match = re.search(r'secret=([A-Z2-7]+)', qr_data, re.IGNORECASE)
        if match:
            return match.group(1).upper()
    
    # If no otpauth format, assume the data is the secret directly
    return qr_data.upper()

def extract_issuer_from_qr_data(qr_data: str) -> str:
    """Extract issuer/service name from QR code data"""
    if 'otpauth://' in qr_data:
        # Extract issuer parameter from otpauth URL
        issuer_match = re.search(r'issuer=([^&]+)', qr_data, re.IGNORECASE)
        if issuer_match:
            return issuer_match.group(1).replace('+', ' ')
        
        # If no issuer parameter, try to extract from the label part
        # Format: otpauth://totp/Issuer:Label?...
        label_match = re.search(r'otpauth://totp/([^:]+)', qr_data)
        if label_match:
            return label_match.group(1).replace('+', ' ')
    
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

def generate_totp_code(secret: str) -> str:
    totp = pyotp.TOTP(secret)
    return totp.now()

def generate_backup_key() -> str:
    return pyotp.random_base32()