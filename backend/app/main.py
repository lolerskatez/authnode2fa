import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import users, applications, auth, admin
from .database import engine
from . import models

# Create tables without startup
# try:
#     models.Base.metadata.create_all(bind=engine)
# except Exception as e:
#     print(f"Warning: Could not create tables: {e}")

app = FastAPI(title="2FA Manager", version="1.0.0")

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

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(applications.router, prefix="/api/applications", tags=["applications"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

@app.get("/")
def read_root():
    return {"message": "2FA Manager API"}