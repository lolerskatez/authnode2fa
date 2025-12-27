#!/usr/bin/env python
import uvicorn
import sys
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    # Import after setting env vars
    from app.main import app
    
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8041,
        log_level="info",
        access_log=True
    )

