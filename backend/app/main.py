import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import HTMLResponse
from sqlalchemy import text
from .routers import users, applications, auth, admin
from .database import engine, SessionLocal
from . import models

# Create tables without startup
# try:
#     models.Base.metadata.create_all(bind=engine)
# except Exception as e:
#     print(f"Warning: Could not create tables: {e}")

app = FastAPI(
    title="2FA Manager API",
    description="Secure Two-Factor Authentication (2FA) Token Management System",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,  # We'll use a custom optimized ReDoc endpoint
    openapi_url="/api/openapi.json",
)

# Get allowed origins from environment, default to localhost for development
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:8040,http://127.0.0.1:8040,http://localhost:8041,http://127.0.0.1:8041"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["User Management"])
app.include_router(applications.router, prefix="/api/applications", tags=["2FA Applications"])
app.include_router(admin.router, prefix="/api/admin", tags=["Administration"])


def custom_openapi():
    """Custom OpenAPI schema with enhanced styling and information"""
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="2FA Manager API",
        version="1.0.0",
        description="""
# 2FA Manager API

A secure, production-ready API for managing Two-Factor Authentication tokens.

## Features

- **User Authentication**: OIDC SSO with optional local authentication
- **2FA Application Management**: Store and organize 2FA secrets with QR code support
- **Encrypted Storage**: Fernet encryption for sensitive secrets
- **Role-Based Access**: Admin and user roles with granular permissions
- **Comprehensive API**: RESTful endpoints for all operations

## Getting Started

1. **Authentication**: Login via `/api/auth/login` or OIDC provider
2. **Manage Applications**: Create, update, and delete 2FA applications
3. **Admin Panel**: Manage users and settings (admin role required)

## Documentation

- **Swagger UI**: This page
- **ReDoc**: `/api/redoc` (alternative documentation)
- **OpenAPI Schema**: `/api/openapi.json`

## Support

For issues and documentation, visit: https://github.com/lolerskatez/authnode2fa
        """,
        routes=app.routes,
    )
    
    # Add custom styling and info
    if "info" in openapi_schema:
        openapi_schema["info"]["x-logo"] = {
            "url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png",
            "altText": "2FA Manager Logo"
        }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

@app.get("/", response_class=HTMLResponse)
def read_root():
    """Enhanced visual root endpoint"""
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>2FA Manager API</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 600px;
                width: 100%;
                padding: 60px 40px;
                text-align: center;
            }
            
            .header {
                margin-bottom: 40px;
            }
            
            .logo {
                font-size: 48px;
                margin-bottom: 20px;
            }
            
            h1 {
                color: #333;
                font-size: 32px;
                margin-bottom: 10px;
            }
            
            .version {
                color: #667eea;
                font-size: 14px;
                font-weight: 600;
                letter-spacing: 1px;
                text-transform: uppercase;
            }
            
            .subtitle {
                color: #666;
                font-size: 16px;
                margin-top: 15px;
                line-height: 1.6;
            }
            
            .links {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-top: 40px;
            }
            
            .link-btn {
                padding: 15px 25px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                text-decoration: none;
                display: flex;
                flex-direction: column;
                gap: 5px;
                transition: all 0.3s ease;
                align-items: center;
                justify-content: center;
            }
            
            .link-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
            }
            
            .docs-btn {
                background: #667eea;
                color: white;
            }
            
            .docs-btn:hover {
                background: #5568d3;
            }
            
            .redoc-btn {
                background: #f5a623;
                color: white;
            }
            
            .redoc-btn:hover {
                background: #e39615;
            }
            
            .health-btn {
                background: #27ae60;
                color: white;
            }
            
            .health-btn:hover {
                background: #229954;
            }
            
            .schema-btn {
                background: #e74c3c;
                color: white;
            }
            
            .schema-btn:hover {
                background: #c0392b;
            }
            
            .icon {
                font-size: 18px;
            }
            
            .label {
                font-size: 12px;
                opacity: 0.9;
            }
            
            .footer {
                margin-top: 40px;
                padding-top: 30px;
                border-top: 1px solid #eee;
                color: #999;
                font-size: 12px;
            }
            
            .footer a {
                color: #667eea;
                text-decoration: none;
            }
            
            .footer a:hover {
                text-decoration: underline;
            }
            
            @media (max-width: 600px) {
                .container {
                    padding: 40px 25px;
                }
                
                h1 {
                    font-size: 24px;
                }
                
                .links {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔐</div>
                <h1>2FA Manager API</h1>
                <div class="version">v1.0.0</div>
                <p class="subtitle">Secure Two-Factor Authentication Token Management</p>
            </div>
            
            <div class="links">
                <a href="/api/docs" class="link-btn docs-btn">
                    <span class="icon">📘</span>
                    <span class="label">Swagger UI</span>
                </a>
                <a href="/api/redoc" class="link-btn redoc-btn">
                    <span class="icon">📚</span>
                    <span class="label">ReDoc</span>
                </a>
                <a href="/health" class="link-btn health-btn">
                    <span class="icon">💚</span>
                    <span class="label">Health Check</span>
                </a>
                <a href="/api/openapi.json" class="link-btn schema-btn">
                    <span class="icon">⚙️</span>
                    <span class="label">OpenAPI Schema</span>
                </a>
            </div>
            
            <div class="footer">
                <p>📖 <strong>Documentation:</strong> <a href="/api/docs">Interactive API Docs</a></p>
                <p style="margin-top: 10px;">🔗 <a href="https://github.com/lolerskatez/authnode2fa" target="_blank">GitHub Repository</a></p>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/health", response_class=HTMLResponse)
def health_check():
    """Health check endpoint with visual status display"""
    try:
        # Test database connection
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        
        status = "healthy"
        db_status = "connected"
        status_color = "#27ae60"
        status_icon = "✓"
        
    except Exception as e:
        status = "unhealthy"
        db_status = f"disconnected: {str(e)}"
        status_color = "#e74c3c"
        status_icon = "✗"
    
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>2FA Manager API - Health Check</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }}
            
            .container {{
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                width: 100%;
                padding: 50px 40px;
                text-align: center;
            }}
            
            .status-icon {{
                font-size: 80px;
                margin-bottom: 20px;
                animation: pulse 2s infinite;
            }}
            
            @keyframes pulse {{
                0%, 100% {{ opacity: 1; }}
                50% {{ opacity: 0.7; }}
            }}
            
            h1 {{
                color: #333;
                font-size: 28px;
                margin-bottom: 15px;
            }}
            
            .status-badge {{
                display: inline-block;
                padding: 10px 20px;
                background: {status_color};
                color: white;
                border-radius: 20px;
                font-weight: 600;
                margin-bottom: 30px;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-size: 14px;
            }}
            
            .status-grid {{
                background: #f8f9fa;
                border-radius: 8px;
                padding: 25px;
                margin-bottom: 30px;
                text-align: left;
            }}
            
            .status-item {{
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #e0e0e0;
            }}
            
            .status-item:last-child {{
                border-bottom: none;
            }}
            
            .status-label {{
                color: #666;
                font-weight: 600;
            }}
            
            .status-value {{
                color: {status_color};
                font-weight: 700;
            }}
            
            .footer {{
                color: #999;
                font-size: 12px;
                margin-top: 20px;
            }}
            
            .footer a {{
                color: #667eea;
                text-decoration: none;
            }}
            
            .footer a:hover {{
                text-decoration: underline;
            }}
            
            @media (max-width: 600px) {{
                .container {{
                    padding: 35px 25px;
                }}
                
                h1 {{
                    font-size: 22px;
                }}
                
                .status-icon {{
                    font-size: 60px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="status-icon">{status_icon}</div>
            <h1>System Status</h1>
            <div class="status-badge">{status.upper()}</div>
            
            <div class="status-grid">
                <div class="status-item">
                    <span class="status-label">Service</span>
                    <span class="status-value">2FA Manager API</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Status</span>
                    <span class="status-value">{status.capitalize()}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Database</span>
                    <span class="status-value">{db_status}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Timestamp</span>
                    <span class="status-value">{__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</span>
                </div>
            </div>
            
            <div class="footer">
                <p>System health check performed</p>
                <p><a href="/">← Back to Dashboard</a></p>
            </div>
        </div>
    </body>
    </html>
    """


@app.get("/api/redoc", response_class=HTMLResponse)
def redoc_ui():
    """ReDoc API documentation UI"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>ReDoc - 2FA Manager API</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>
            body {
                margin: 0;
                padding: 0;
                background: #f5f5f5;
            }
        </style>
    </head>
    <body>
        <redoc spec-url='/api/openapi.json'></redoc>
        <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
    </body>
    </html>
    """