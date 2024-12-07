"""
@purpose: Test suite for Pydantic validation middleware
@reference: Tests backend/server/middleware/validation.py
"""

import pytest
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from ..backend.server.middleware.validation import validate_request

# Test Models
class TestRequestModel(BaseModel):
    email: EmailStr
    age: int = Field(ge=18)
    name: str

class TestResponseModel(BaseModel):
    id: str
    timestamp: datetime
    data: dict

# Test Data
VALID_REQUEST_DATA = {
    'email': 'test@example.com',
    'age': 25,
    'name': 'Test User'
}

INVALID_REQUEST_DATA = {
    'email': 'invalid-email',
    'age': 15,
    'name': 'Test User'
}

@pytest.mark.asyncio
async def test_validate_request_valid_data():
    """Test validation with valid request data"""
    
    @validate_request(request_model=TestRequestModel)
    async def test_handler(data: dict):
        assert isinstance(data, TestRequestModel)
        assert data.email == VALID_REQUEST_DATA['email']
        assert data.age == VALID_REQUEST_DATA['age']
        return {'success': True}
    
    result = await test_handler(VALID_REQUEST_DATA)
    assert result == {'success': True}

@pytest.mark.asyncio
async def test_validate_request_invalid_data():
    """Test validation with invalid request data"""
    
    @validate_request(request_model=TestRequestModel)
    async def test_handler(data: dict):
        return {'success': True}
    
    result, status_code = await test_handler(INVALID_REQUEST_DATA)
    assert status_code == 400
    assert result['error'] == 'Validation Error'
    assert len(result['details']) == 2  # email and age errors

@pytest.mark.asyncio
async def test_validate_response():
    """Test response validation"""
    
    @validate_request(response_model=TestResponseModel)
    async def test_handler(data: dict):
        return {
            'id': '123',
            'timestamp': datetime.now(),
            'data': {'key': 'value'}
        }
    
    result = await test_handler({})
    assert isinstance(result, TestResponseModel)
    assert result.id == '123'
    assert isinstance(result.timestamp, datetime)

@pytest.mark.asyncio
async def test_validate_request_and_response():
    """Test both request and response validation"""
    
    @validate_request(
        request_model=TestRequestModel,
        response_model=TestResponseModel
    )
    async def test_handler(data: TestRequestModel):
        assert isinstance(data, TestRequestModel)
        return {
            'id': '123',
            'timestamp': datetime.now(),
            'data': {'name': data.name}
        }
    
    result = await test_handler(VALID_REQUEST_DATA)
    assert isinstance(result, TestResponseModel)
    assert result.data['name'] == VALID_REQUEST_DATA['name']

@pytest.mark.asyncio
async def test_handle_internal_error():
    """Test handling of internal errors"""
    
    @validate_request(request_model=TestRequestModel)
    async def test_handler(data: dict):
        raise ValueError("Internal error")
    
    result, status_code = await test_handler(VALID_REQUEST_DATA)
    assert status_code == 500
    assert result['error'] == 'Internal Server Error'

@pytest.mark.asyncio
async def test_datetime_conversion():
    """Test automatic datetime string conversion"""
    
    class DateModel(BaseModel):
        created_at: datetime
        updated_at: datetime
    
    @validate_request(request_model=DateModel)
    async def test_handler(data: dict):
        assert isinstance(data.created_at, datetime)
        assert isinstance(data.updated_at, datetime)
        return {'success': True}
    
    test_data = {
        'created_at': '2024-01-01T12:00:00Z',
        'updated_at': '2024-01-02T12:00:00+00:00'
    }
    
    result = await test_handler(test_data)
    assert result == {'success': True}

@pytest.mark.asyncio
async def test_nested_validation():
    """Test validation of nested objects"""
    
    class NestedModel(BaseModel):
        name: str
        details: dict
        tags: list
    
    @validate_request(request_model=NestedModel)
    async def test_handler(data: dict):
        assert isinstance(data, NestedModel)
        assert isinstance(data.details, dict)
        assert isinstance(data.tags, list)
        return {'success': True}
    
    test_data = {
        'name': 'Test',
        'details': {'key': 'value'},
        'tags': ['tag1', 'tag2']
    }
    
    result = await test_handler(test_data)
    assert result == {'success': True} 