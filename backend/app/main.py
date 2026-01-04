import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import HTMLResponse
from sqlalchemy import text
from slowapi.errors import RateLimitExceeded
from .routers import users, applications, auth, admin, webauthn, notifications, sync, sharing
from .database import engine, SessionLocal
from .rate_limit import limiter, get_rate_limit_exceeded_handler
from . import models
from .security_monitor import initialize_security_monitoring

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

# Add rate limiter to app state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, get_rate_limit_exceeded_handler())

# Initialize security monitoring
initialize_security_monitoring(SessionLocal)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["User Management"])
app.include_router(applications.router, prefix="/api/applications", tags=["2FA Applications"])
app.include_router(admin.router, prefix="/api/admin", tags=["Administration"])
app.include_router(webauthn.router, prefix="/api/webauthn", tags=["Security Keys (WebAuthn)"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(sync.router, prefix="/api/sync", tags=["Multi-Device Sync"])
app.include_router(sharing.router, prefix="/api/sharing", tags=["Account Sharing"])


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
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f5f7fa;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .container {
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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
                color: #4361ee;
                font-size: 14px;
                font-weight: 600;
                letter-spacing: 1px;
                text-transform: uppercase;
            }
            
            .subtitle {
                color: #718096;
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
                padding: 10px 16px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                text-decoration: none;
                display: flex;
                flex-direction: column;
                gap: 8px;
                transition: all 0.3s;
                align-items: center;
                justify-content: center;
            }
            
            .link-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .docs-btn {
                background: #4361ee;
                color: white;
            }
            
            .docs-btn:hover {
                background: #3449d0;
            }
            
            .redoc-btn {
                background: #4361ee;
                color: white;
            }
            
            .redoc-btn:hover {
                background: #3449d0;
            }
            
            .health-btn {
                background: #4361ee;
                color: white;
            }
            
            .health-btn:hover {
                background: #3449d0;
            }
            
            .schema-btn {
                background: #4361ee;
                color: white;
            }
            
            .schema-btn:hover {
                background: #3449d0;
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
                border-top: 1px solid #e2e8f0;
                color: #718096;
                font-size: 12px;
            }
            
            .footer a {
                color: #4361ee;
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
                <a href="/api/schema" class="link-btn schema-btn">
                    <span class="icon">🔧</span>
                    <span class="label">API Schema</span>
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
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f5f7fa;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }}
            
            .container {{
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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
                background: #f5f7fa;
                border-radius: 8px;
                padding: 25px;
                margin-bottom: 30px;
                text-align: left;
            }}
            
            .status-item {{
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #e2e8f0;
            }}
            
            .status-item:last-child {{
                border-bottom: none;
            }}
            
            .status-label {{
                color: #718096;
                font-weight: 600;
            }}
            
            .status-value {{
                color: {status_color};
                font-weight: 700;
            }}
            
            .footer {{
                color: #718096;
                font-size: 12px;
                margin-top: 20px;
            }}
            
            .footer a {{
                color: #4361ee;
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


@app.get("/api/health")
def api_health_check():
    """JSON health check endpoint for monitoring tools"""
    try:
        # Test database connection
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": f"disconnected: {str(e)}",
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }


@app.get("/api/schema", response_class=HTMLResponse)
def schema_viewer():
    """Beautiful visual schema viewer with download option"""
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Schema - 2FA Manager</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f5f7fa;
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .header {
                background: #ffffff;
                border-radius: 12px;
                padding: 40px;
                margin-bottom: 30px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            }
            
            .header h1 {
                color: #333;
                margin-bottom: 10px;
                font-size: 32px;
            }
            
            .header p {
                color: #718096;
                margin-bottom: 25px;
                font-size: 16px;
            }
            
            .button-group {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 10px 16px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s;
            }
            
            .btn-primary {
                background: #4361ee;
                color: white;
            }
            
            .btn-primary:hover {
                transform: translateY(-2px);
                background: #3449d0;
                box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
            }
            
            .btn-secondary {
                background: #ffffff;
                color: #4361ee;
                border: 1px solid #e2e8f0;
            }
            
            .btn-secondary:hover {
                background: #f5f7fa;
                border-color: #4361ee;
            }
            
            .schema-card {
                background: #ffffff;
                border-radius: 12px;
                padding: 30px;
                margin-bottom: 20px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                border: 1px solid #e2e8f0;
            }
            
            .schema-card h2 {
                color: #333;
                margin-bottom: 20px;
                padding-bottom: 0;
                border-bottom: none;
                font-size: 18px;
                font-weight: 600;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-top: 0;
            }
            
            .info-item {
                padding: 12px;
                background: #f5f7fa;
                border-radius: 6px;
                border-left: none;
                border: 1px solid #e2e8f0;
            }
            
            .info-label {
                font-size: 12px;
                color: #718096;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
                font-weight: 600;
            }
            
            .info-value {
                font-size: 16px;
                color: #4361ee;
                font-weight: 700;
            }
            
            .code-block {
                background: #1e1e1e;
                color: #d4d4d4;
                padding: 20px;
                border-radius: 8px;
                overflow-x: auto;
                margin-top: 15px;
                font-family: 'Courier New', Courier, monospace;
                font-size: 13px;
                line-height: 1.5;
            }
            
            .code-block code {
                display: block;
            }
            
            .highlight {
                color: #4ec9b0;
            }
            
            .footer {
                text-align: center;
                margin-top: 40px;
                padding: 20px;
                color: #718096;
            }
            
            .footer a {
                color: #4361ee;
                text-decoration: underline;
            }
            
            .footer a:hover {
                opacity: 0.8;
            }
            
            .nav-link {
                display: inline-block;
                margin-top: 20px;
                color: #4361ee;
                text-decoration: none;
                font-weight: 600;
            }
            
            .nav-link:hover {
                text-decoration: underline;
            }
            
            @media (max-width: 768px) {
                .header {
                    padding: 25px;
                }
                
                .header h1 {
                    font-size: 24px;
                }
                
                .button-group {
                    flex-direction: column;
                }
                
                .btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔧 OpenAPI Schema</h1>
                <p>Complete API specification for 2FA Manager. Download the schema or explore it through our interactive documentation.</p>
                
                <div class="button-group">
                    <button class="btn btn-primary" onclick="downloadSchema()">
                        📥 Download JSON
                    </button>
                    <a href="/api/docs" class="btn btn-secondary">
                        📖 Swagger UI
                    </a>
                    <a href="/api/redoc" class="btn btn-secondary">
                        📚 ReDoc
                    </a>
                    <a href="/" class="btn btn-secondary">
                        🏠 Dashboard
                    </a>
                </div>
            </div>
            
            <div class="schema-card">
                <h2>📋 Schema Information</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Title</div>
                        <div class="info-value" id="schema-title">Loading...</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Version</div>
                        <div class="info-value" id="schema-version">Loading...</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Endpoints</div>
                        <div class="info-value" id="schema-endpoints">Loading...</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Schemas</div>
                        <div class="info-value" id="schema-models">Loading...</div>
                    </div>
                </div>
            </div>
            
            <div class="schema-card">
                <h2>🛣️ Available Endpoints</h2>
                <div id="endpoints-list" style="margin-top: 15px;"></div>
            </div>
            
            <div class="schema-card">
                <h2>📊 Data Models</h2>
                <div id="models-list" style="margin-top: 15px;"></div>
            </div>
            
            <div class="footer">
                <p>OpenAPI Schema Version 3.0.0 • <a href="https://github.com/lolerskatez/authnode2fa" target="_blank">View on GitHub</a></p>
            </div>
        </div>
        
        <script>
            async function loadSchema() {
                try {
                    const response = await fetch('/api/openapi.json');
                    const schema = await response.json();
                    
                    // Update schema info
                    document.getElementById('schema-title').textContent = schema.info.title || 'Unknown';
                    document.getElementById('schema-version').textContent = schema.info.version || 'Unknown';
                    document.getElementById('schema-endpoints').textContent = Object.keys(schema.paths || {}).length;
                    document.getElementById('schema-models').textContent = Object.keys(schema.components?.schemas || {}).length;
                    
                    // Build endpoints list
                    const endpointsList = document.getElementById('endpoints-list');
                    const paths = schema.paths || {};
                    
                    Object.entries(paths).forEach(([path, methods]) => {
                        const div = document.createElement('div');
                        div.style.cssText = 'margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;';
                        
                        const methodsHtml = Object.entries(methods)
                            .filter(([key]) => ['get', 'post', 'put', 'delete', 'patch'].includes(key))
                            .map(([method, details]) => {
                                const colors = {
                                    get: '#3b82f6',
                                    post: '#10b981',
                                    put: '#f59e0b',
                                    delete: '#ef4444',
                                    patch: '#8b5cf6'
                                };
                                return \`<span style="display: inline-block; background: \${colors[method] || '#999'}; color: white; padding: 4px 12px; border-radius: 4px; margin-right: 8px; font-weight: 600; font-size: 12px;">\${method.toUpperCase()}</span>\`;
                            })
                            .join('');
                        
                        div.innerHTML = \`
                            <div style="margin-bottom: 8px;">\${methodsHtml}</div>
                            <code style="color: #667eea; font-weight: 600;">\${path}</code>
                        \`;
                        endpointsList.appendChild(div);
                    });
                    
                    // Build models list
                    const modelsList = document.getElementById('models-list');
                    const schemas = schema.components?.schemas || {};
                    
                    Object.entries(schemas).forEach(([name, schema_def]) => {
                        const div = document.createElement('div');
                        div.style.cssText = 'margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;';
                        
                        const properties = schema_def.properties ? Object.keys(schema_def.properties).length : 0;
                        div.innerHTML = \`
                            <div style="font-weight: 600; color: #333; margin-bottom: 5px;">\${name}</div>
                            <div style="font-size: 13px; color: #666;">
                                \${schema_def.description || 'No description'}<br>
                                <span style="color: #999;">Fields: \${properties}</span>
                            </div>
                        \`;
                        modelsList.appendChild(div);
                    });
                    
                } catch (error) {
                    console.error('Error loading schema:', error);
                    document.getElementById('endpoints-list').innerHTML = '<p style="color: #e74c3c;">Error loading schema</p>';
                }
            }
            
            function downloadSchema() {
                fetch('/api/openapi.json')
                    .then(response => response.json())
                    .then(schema => {
                        const dataStr = JSON.stringify(schema, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = '2fa-manager-openapi-schema.json';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    })
                    .catch(error => {
                        console.error('Error downloading schema:', error);
                        alert('Error downloading schema');
                    });
            }
            
            // Load schema on page load
            document.addEventListener('DOMContentLoaded', loadSchema);
        </script>
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