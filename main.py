import os
from dotenv import load_dotenv

# Load environment variables from .env files
load_dotenv('.env.backend')  # Load backend environment variables

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
from backend.server.server import app

if __name__ == "__main__":
    import uvicorn
    print("Starting server with environment:")
    print(f"FIREBASE_PROJECT_ID: {os.getenv('FIREBASE_PROJECT_ID')}")
    print(f"FIREBASE_CLIENT_EMAIL: {os.getenv('FIREBASE_CLIENT_EMAIL')}")
    print(f"ALLOWED_ORIGINS: {os.getenv('ALLOWED_ORIGINS')}")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
