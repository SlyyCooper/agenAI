"""
@purpose: Pydantic validation middleware for FastAPI-style validation
@reference: Used to validate request/response data in Firebase functions
"""

from functools import wraps
from typing import Type, TypeVar, Callable, Any, Optional, Dict, Union
from pydantic import BaseModel, ValidationError
from fastapi.responses import JSONResponse
import logging
import inspect
from datetime import datetime

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)

def validate_request(
    request_model: Optional[Type[BaseModel]] = None,
    response_model: Optional[Type[BaseModel]] = None
):
    """
    Decorator for validating request and response data using Pydantic models
    
    @example:
        @validate_request(request_model=UserProfile, response_model=UserProfile)
        async def create_user(data: dict):
            # data is validated UserProfile instance
            return data
    
    @param request_model: Pydantic model for validating input data
    @param response_model: Pydantic model for validating response data
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # Validate request data if model provided
                if request_model:
                    # Get the first dict argument as request data
                    request_data = next(
                        (arg for arg in args if isinstance(arg, dict)),
                        kwargs.get('data', {})
                    )
                    
                    # Convert any ISO format strings to datetime
                    for key, value in request_data.items():
                        if isinstance(value, str) and 'date' in key.lower():
                            try:
                                request_data[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                            except ValueError:
                                pass
                    
                    # Validate with Pydantic
                    validated_data = request_model(**request_data)
                    
                    # Replace dict argument with validated model
                    new_args = [
                        validated_data if isinstance(arg, dict) else arg
                        for arg in args
                    ]
                    if 'data' in kwargs:
                        kwargs['data'] = validated_data
                    
                    result = await func(*new_args, **kwargs)
                else:
                    result = await func(*args, **kwargs)
                
                # Validate response if model provided
                if response_model and result is not None:
                    if isinstance(result, dict):
                        return response_model(**result)
                    return result
                
                return result
                
            except ValidationError as e:
                logger.error(f"Validation error: {str(e)}")
                error_details = [
                    {
                        'field': '.'.join(str(loc) for loc in error['loc']),
                        'message': error['msg']
                    }
                    for error in e.errors()
                ]
                return {
                    'error': 'Validation Error',
                    'details': error_details
                }, 400
                
            except Exception as e:
                logger.error(f"Error in {func.__name__}: {str(e)}")
                return {
                    'error': 'Internal Server Error',
                    'message': str(e)
                }, 500
                
        return wrapper
    return decorator 