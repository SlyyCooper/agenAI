# Import the load_dotenv function from the dotenv library
from dotenv import load_dotenv

# Load environment variables from a .env file into the application's environment
load_dotenv()

# Import the 'app' object from the backend server module
from backend.server.server import app

# This block ensures that the code only runs if this script is executed directly (not imported)
if __name__ == "__main__":
    # Import the uvicorn server
    import uvicorn

    # Run the application using uvicorn
    # - app: The ASGI application (our FastAPI app)
    # - host: The host IP to bind to (0.0.0.0 means all available interfaces)
    # - port: The port number to listen on (8000 in this case)
    uvicorn.run(app, host="0.0.0.0", port=8000)
