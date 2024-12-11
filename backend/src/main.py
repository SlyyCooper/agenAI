import os
import sys
from pathlib import Path

# Add backend directory to Python path
backend_root = str(Path(__file__).resolve().parents[1])
src_root = str(Path(__file__).resolve().parent)
sys.path.extend([backend_root, src_root])

# Set environment variable for imports
os.environ["PYTHONPATH"] = f"{backend_root}:{src_root}"

# Load environment variables from .env files
from dotenv import load_dotenv
env_path = os.path.join(backend_root, '.env.backend')
load_dotenv(env_path)

# Verify critical environment variables
required_vars = [
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL'
]

missing_vars = [var for var in required_vars if not os.getenv(var)]
if missing_vars:
    raise EnvironmentError(f"Missing required environment variables: {', '.join(missing_vars)}")

# Import app after environment variables are loaded
from src.api.routes.server import app

if __name__ == "__main__":
    import uvicorn
    print("Starting server with environment:")
    print(f"FIREBASE_PROJECT_ID: {os.getenv('FIREBASE_PROJECT_ID')}")
    print(f"FIREBASE_CLIENT_EMAIL: {os.getenv('FIREBASE_CLIENT_EMAIL')}")
    print(f"ALLOWED_ORIGINS: {os.getenv('ALLOWED_ORIGINS')}")
    
    uvicorn.run(app, host="0.0.0.0", port=8000) 