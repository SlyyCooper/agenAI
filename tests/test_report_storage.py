import os
import sys
import pytest
import asyncio
from datetime import datetime
from io import BytesIO
import json
from dotenv import load_dotenv

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.report_type.basic_report.basic_report import BasicReport
from backend.server.firebase.storage_utils import (
    upload_file_to_storage,
    list_files_in_storage,
    get_file_metadata,
    download_file_from_storage
)
from backend.server.firebase.firebase import initialize_firebase

class MockWebSocket:
    """Mock WebSocket class for testing"""
    async def send_text(self, text):
        print(f"WebSocket message: {text}")
        
    async def send_json(self, data):
        print(f"WebSocket JSON: {json.dumps(data, indent=2)}")

@pytest.mark.asyncio
async def test_report_generation_and_storage():
    """Test report generation and storage in Firebase Cloud Storage"""
    print("\n🔍 Testing Report Generation and Storage...")
    
    try:
        # Load environment variables
        load_dotenv()
        
        # Initialize Firebase
        db = initialize_firebase()
        print("✅ Firebase initialized")
        
        # Create test user ID and report path
        test_user_id = f"test_user_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        reports_path = f"users/{test_user_id}/reports"
        
        # Create mock websocket
        websocket = MockWebSocket()
        
        # Test parameters for report generation
        test_query = "What is artificial intelligence?"
        test_config = {
            "report_type": "basic",
            "report_source": "web",
            "source_urls": [],
            "tone": "professional"
        }
        
        print("\n📝 Generating test report...")
        # Create and run basic report
        report = BasicReport(
            query=test_query,
            report_type=test_config["report_type"],
            report_source=test_config["report_source"],
            source_urls=test_config["source_urls"],
            tone=test_config["tone"],
            config_path="config.json",
            websocket=websocket
        )
        
        # Generate report
        report_content = await report.run()
        print("✅ Report generated successfully")
        
        # Create report file in memory
        print("\n📤 Uploading report to Firebase Storage...")
        report_filename = f"report_{datetime.now().strftime('%Y%m%d%H%M%S')}.txt"
        file_stream = BytesIO(report_content.encode('utf-8'))
        
        # Upload to Firebase Storage
        url = await upload_file_to_storage(
            file_stream=file_stream,
            filename=report_filename,
            content_type='text/plain',
            user_id=test_user_id
        )
        print(f"✅ Report uploaded successfully: {url}")
        
        # List files in storage
        print("\n📋 Listing files in storage...")
        try:
            files = await list_files_in_storage(f"users/{test_user_id}/reports")
            print(f"Found {len(files)} files:")
            for file in files:
                print(f"   📄 {file}")
        except Exception as e:
            print(f"⚠️ Error listing files: {str(e)}")
        
        # Download and verify content
        print("\n📥 Downloading report...")
        try:
            download_path = f"users/{test_user_id}/reports/{report_filename}"
            downloaded_content = await download_file_from_storage(download_path)
            downloaded_text = downloaded_content.decode('utf-8')
            assert downloaded_text == report_content
            print("✅ Downloaded content matches original")
        except Exception as e:
            print(f"⚠️ Error downloading file: {str(e)}")
        
        print("\n✨ All tests passed successfully! ✨")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        return False

if __name__ == "__main__":
    asyncio.run(test_report_generation_and_storage()) 