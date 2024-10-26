import os
import stripe
from dotenv import load_dotenv

load_dotenv()

def initialize_stripe():
    """Initialize the Stripe client with API key from environment variables."""
    try:
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        if not stripe.api_key:
            raise ValueError("STRIPE_SECRET_KEY environment variable not set")
    except Exception as e:
        print(f"Failed to initialize Stripe: {str(e)}")
        raise

# Export the initialized Stripe client
stripe_client = stripe
