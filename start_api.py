#!/usr/bin/env python3
"""
Startup script for the Azure Insurance Chat API
Loads environment variables and starts the FastAPI server
"""
import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Configuration
HOST = os.getenv("API_HOST", "0.0.0.0")
PORT = int(os.getenv("API_PORT", "8000"))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

if __name__ == "__main__":
    print(f"🚀 Starting Azure Insurance Chat API...")
    print(f"📍 Host: {HOST}")
    print(f"🔌 Port: {PORT}")
    print(f"🐛 Debug: {DEBUG}")
    print(f"🔗 API URL: http://{HOST}:{PORT}")
    print(f"📚 Docs: http://{HOST}:{PORT}/docs")
    print(f"💚 Health: http://{HOST}:{PORT}/healthz")
    print()
    
    uvicorn.run(
        "app:app",
        host=HOST,
        port=PORT,
        reload=DEBUG,
        log_level="info"
    )

