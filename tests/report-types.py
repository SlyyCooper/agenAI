import pytest
from unittest.mock import patch, Mock
from gpt_researcher import GPTResearcher
from backend.server.firebase.storage_utils import save_research_report
from io import BytesIO

# Define the report types to test
report_types = [
    "research_report",
    "subtopic_report"
]

# Define a common query and sources for testing
query = "What are the latest advancements in AI?"

@pytest.fixture
def mock_firebase_storage():
    """Mock Firebase storage for testing"""
    with patch('backend.server.firebase.storage_utils.storage_bucket') as mock_bucket:
        mock_blob = Mock()
        mock_blob.generate_signed_url.return_value = "https://storage.example.com/test.pdf"
        mock_bucket.blob.return_value = mock_blob
        yield mock_bucket

@pytest.fixture
def mock_firestore():
    """Mock Firestore for testing"""
    with patch('backend.server.firebase.storage_utils.db') as mock_db:
        mock_doc = Mock()
        mock_db.collection.return_value.document.return_value.collection.return_value.document.return_value = mock_doc
        yield mock_db

@pytest.mark.asyncio
@pytest.mark.parametrize("report_type", report_types)
async def test_gpt_researcher(report_type, mock_firebase_storage, mock_firestore):
    """Test report generation and storage"""
    # Create an instance of GPTResearcher
    researcher = GPTResearcher(query=query, report_type=report_type)
    
    # Conduct research and write the report
    await researcher.conduct_research()
    report = await researcher.write_report()
    
    # Save to Firebase Storage
    file_stream = BytesIO(report.encode('utf-8'))
    metadata = {
        'title': query,
        'report_type': report_type,
        'source': 'test',
        'userId': 'test_user'  # Test user ID
    }
    
    result = await save_research_report(
        file_stream=file_stream,
        metadata=metadata,
        content=report
    )

    # Verify Firebase interactions
    assert mock_firebase_storage.blob.called
    assert mock_firestore.collection.called
    assert result['url'].startswith('https://storage.example.com/')

if __name__ == "__main__":
    pytest.main()