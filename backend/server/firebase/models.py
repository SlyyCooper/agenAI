"""
@purpose: Pydantic models for Firebase data validation
@reference: Matches frontend types in frontend/nextjs/types/interfaces
@maintenance: Keep in sync with frontend schemas and Firestore rules
"""

from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import List, Optional, Any
from datetime import datetime
from enum import Enum

class ProcessingStatus(str, Enum):
    """Valid states for event processing"""
    PENDING = 'pending'
    COMPLETED = 'completed'
    FAILED = 'failed'

class UserProfile(BaseModel):
    """
    @purpose: Validates user profile data
    @reference: Matches UserProfileSchema in frontend
    """
    email: EmailStr
    created_at: datetime
    last_login: datetime
    stripe_customer_id: str
    tokens: int = Field(ge=0)
    has_access: bool
    one_time_purchase: bool
    token_history: List[Any]
    name: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ProcessedEvent(BaseModel):
    """
    @purpose: Validates Stripe event processing data
    @reference: Matches ProcessedEventSchema in frontend
    """
    event_type: str
    event_id: str
    completed_at: datetime
    processed_at: datetime
    processing_status: ProcessingStatus

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class StorageMetadata(BaseModel):
    """Storage file metadata validation"""
    contentType: str
    size: int = Field(gt=0)
    created: datetime
    updated: datetime

class StorageFile(BaseModel):
    """
    @purpose: Validates storage file data
    @reference: Matches StorageFileSchema in frontend
    """
    path: str
    url: HttpUrl
    metadata: StorageMetadata

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        } 