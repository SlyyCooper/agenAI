from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.server.firebase.firebase_utils import verify_firebase_token
from backend.server.token_management.token_utils import (
    add_tokens,
    use_tokens,
    get_token_balance,
    get_token_history
)

router = APIRouter(
    prefix="/api/tokens",
    tags=["tokens"]
)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    decoded_token = await verify_firebase_token(token)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return decoded_token

@router.get("/balance")
async def get_balance(current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    balance = await get_token_balance(user_id)
    return {"balance": balance}

@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    history = await get_token_history(user_id)
    return {"history": history}

@router.post("/use")
async def use_token(amount: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    try:
        await use_tokens(user_id, amount)
        return {"status": "success", "amount": amount}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
