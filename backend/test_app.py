import uvicorn
import sys
import traceback

try:
    from app.main import app
    print("App imported successfully")
    
    # Try to run it
    config = uvicorn.Config(
        app=app,
        host="127.0.0.1",
        port=8000,
        log_level="info"
    )
    server = uvicorn.Server(config)
    asyncio.run(server.serve())
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
    sys.exit(1)
