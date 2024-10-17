# This file contains utility functions for authentication using Firebase Admin SDK
# It provides a mechanism to verify JWT tokens and extract user IDs for authenticated requests

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth

# Create an instance of HTTPBearer for token extraction from requests
security = HTTPBearer()

async def get_authenticated_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Authenticate the user and return their user ID.
    
    This function is used as a dependency in FastAPI routes to ensure that
    the request is authenticated and to provide the user's ID to the route handler.
    
    Args:
        credentials (HTTPAuthorizationCredentials): The credentials extracted from the request's Authorization header.
    
    Returns:
        str: The authenticated user's ID (uid) from the Firebase token.
    
    Raises:
        HTTPException: If the token is invalid or authentication fails.
    """
    # Extract the token from the credentials
    token = credentials.credentials
    try:
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(token)
        # Return the user ID from the decoded token
        return decoded_token['uid']
    except Exception as e:
        # If token verification fails, raise an HTTPException
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# This function integrates with the broader authentication flow:
# 1. The client obtains a Firebase ID token (JWT) after signing in.
# 2. The client includes this token in the Authorization header of requests.
# 3. FastAPI routes use this function as a dependency to authenticate requests.
# 4. If authentication succeeds, the route handler receives the user's ID.
# 5. If authentication fails, the client receives a 401 Unauthorized response.