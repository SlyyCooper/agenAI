import os
import stripe
from dotenv import load_dotenv
import logging

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

async def setup_stripe_products():
    """Setup or update Stripe products with token metadata"""
    try:
        # Example product setup
        products = {
            'basic': {
                'name': 'Basic Token Pack',
                'metadata': {'token_amount': '10'},
                'price': 500  # $5.00
            },
            'premium': {
                'name': 'Premium Token Pack',
                'metadata': {'token_amount': '50'},
                'price': 2000  # $20.00
            }
        }
        
        for product_id, details in products.items():
            product = stripe.Product.create(
                name=details['name'],
                metadata=details['metadata']
            )
            
            stripe.Price.create(
                product=product.id,
                unit_amount=details['price'],
                currency='usd',
                metadata={'token_amount': details['metadata']['token_amount']}
            )
            
        logging.info("Stripe products configured successfully")
    except Exception as e:
        logging.error(f"Error setting up Stripe products: {str(e)}")
        raise
