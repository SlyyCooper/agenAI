"""
@purpose: Configure test environment for Stripe integration tests
@prereq: Requires test environment variables
"""

import os
import pytest
from dotenv import load_dotenv

def pytest_configure(config):
    """
    Configure test environment before running tests
    """
    # Load test environment variables
    load_dotenv(".env.test", override=True)
    
    # Set Stripe API key for testing
    os.environ["STRIPE_SECRET_KEY"] = os.getenv("STRIPE_TEST_SECRET_KEY", "")
    os.environ["STRIPE_WEBHOOK_SECRET"] = os.getenv("STRIPE_TEST_WEBHOOK_SECRET", "")
    
    # Set test mode
    os.environ["TEST_MODE"] = "true"

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """
    Setup test environment with required configurations
    """
    # Verify required environment variables
    required_vars = [
        "STRIPE_TEST_SECRET_KEY",
        "STRIPE_TEST_WEBHOOK_SECRET",
        "FIREBASE_PROJECT_ID",
        "FIREBASE_PRIVATE_KEY",
        "FIREBASE_CLIENT_EMAIL"
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        pytest.skip(f"Missing required environment variables: {', '.join(missing_vars)}") 