import json
import os
import re
import time
import shutil
from typing import Dict, List
from fastapi.responses import JSONResponse
from gpt_researcher.document.document import DocumentLoader
from backend.utils import write_md_to_pdf, write_md_to_word, write_text_to_md
from gpt_researcher.orchestrator.actions.utils import stream_output
from multi_agents.main import run_research_task
import firebase_admin
from firebase_admin import credentials, auth, firestore
from dotenv import load_dotenv
from urllib.parse import urlparse
import stripe
from stripe.error import StripeError
from fastapi import HTTPException

# Function to sanitize filenames
def sanitize_filename(filename: str) -> str:
    return re.sub(r"[^\w\s-]", "", filename).strip()

# Handle the start command for research tasks
async def handle_start_command(websocket, data: str, manager):
    json_data = json.loads(data[6:])
    task, report_type, source_urls, tone, headers, report_source = extract_command_data(json_data)

    if not task or not report_type:
        print("Error: Missing task or report_type")
        return

    sanitized_filename = sanitize_filename(f"task_{int(time.time())}_{task}")

    # Start the research task and generate the report
    report = await manager.start_streaming(
        task, report_type, report_source, source_urls, tone, websocket, headers
    )
    report = str(report)
    file_paths = await generate_report_files(report, sanitized_filename)
    
    # Save the report to Firestore
    user_id = websocket.scope.get('user_id')  # Assuming you've set this when authenticating the WebSocket
    if user_id:
        report_id = await save_report_to_firestore(user_id, report, report_type, task)
        if report_id:
            file_paths['report_id'] = report_id

    await send_file_paths(websocket, file_paths)

# Handle human feedback (placeholder for future implementation)
async def handle_human_feedback(data: str):
    feedback_data = json.loads(data[14:])  # Remove "human_feedback" prefix
    print(f"Received human feedback: {feedback_data}")
    # TODO: Add logic to forward the feedback to the appropriate agent or update the research state

# Generate report files in different formats
async def generate_report_files(report: str, filename: str) -> Dict[str, str]:
    pdf_path = await write_md_to_pdf(report, filename)
    docx_path = await write_md_to_word(report, filename)
    md_path = await write_text_to_md(report, filename)
    return {"pdf": pdf_path, "docx": docx_path, "md": md_path}

# Send file paths to the client
async def send_file_paths(websocket, file_paths: Dict[str, str]):
    await websocket.send_json({"type": "path", "output": file_paths})

# Get configuration dictionary
def get_config_dict(
    langchain_api_key: str, openai_api_key: str, tavily_api_key: str,
    google_api_key: str, google_cx_key: str, bing_api_key: str,
    searchapi_api_key: str, serpapi_api_key: str, serper_api_key: str, searx_url: str
) -> Dict[str, str]:
    # Return a dictionary of configuration values, using environment variables as fallbacks
    return {
        "LANGCHAIN_API_KEY": langchain_api_key or os.getenv("LANGCHAIN_API_KEY", ""),
        "OPENAI_API_KEY": openai_api_key or os.getenv("OPENAI_API_KEY", ""),
        "TAVILY_API_KEY": tavily_api_key or os.getenv("TAVILY_API_KEY", ""),
        "GOOGLE_API_KEY": google_api_key or os.getenv("GOOGLE_API_KEY", ""),
        "GOOGLE_CX_KEY": google_cx_key or os.getenv("GOOGLE_CX_KEY", ""),
        "BING_API_KEY": bing_api_key or os.getenv("BING_API_KEY", ""),
        "SEARCHAPI_API_KEY": searchapi_api_key or os.getenv("SEARCHAPI_API_KEY", ""),
        "SERPAPI_API_KEY": serpapi_api_key or os.getenv("SERPAPI_API_KEY", ""),
        "SERPER_API_KEY": serper_api_key or os.getenv("SERPER_API_KEY", ""),
        "SEARX_URL": searx_url or os.getenv("SEARX_URL", ""),
        "LANGCHAIN_TRACING_V2": os.getenv("LANGCHAIN_TRACING_V2", "true"),
        "DOC_PATH": os.getenv("DOC_PATH", "./my-docs"),
        "RETRIEVER": os.getenv("RETRIEVER", ""),
        "EMBEDDING_MODEL": os.getenv("OPENAI_EMBEDDING_MODEL", ""),
        "STRIPE_SECRET_KEY": os.getenv("STRIPE_SECRET_KEY", ""),
        "STRIPE_WEBHOOK_SECRET_WWW_AGENAI": os.getenv("STRIPE_WEBHOOK_SECRET_WWW_AGENAI", ""),
        "STRIPE_WEBHOOK_SECRET_AGENAI": os.getenv("STRIPE_WEBHOOK_SECRET_AGENAI", ""),
        "STRIPE_WEBHOOK_SECRET_TANALYZE": os.getenv("STRIPE_WEBHOOK_SECRET_TANALYZE", ""),
        "STRIPE_WEBHOOK_SECRET_WWW_TANALYZE": os.getenv("STRIPE_WEBHOOK_SECRET_WWW_TANALYZE", ""),
    }

# Update environment variables and initialize Stripe
def update_environment_variables(config: Dict[str, str]):
    for key, value in config.items():
        os.environ[key] = value
    
    # Initialize Stripe after updating environment variables
    initialize_stripe()

# Handle file upload
async def handle_file_upload(file, DOC_PATH: str) -> Dict[str, str]:
    file_path = os.path.join(DOC_PATH, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    print(f"File uploaded to {file_path}")

    document_loader = DocumentLoader(DOC_PATH)
    await document_loader.load()

    return {"filename": file.filename, "path": file_path}

# Handle file deletion
async def handle_file_deletion(filename: str, DOC_PATH: str) -> JSONResponse:
    file_path = os.path.join(DOC_PATH, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        print(f"File deleted: {file_path}")
        return JSONResponse(content={"message": "File deleted successfully"})
    else:
        print(f"File not found: {file_path}")
        return JSONResponse(status_code=404, content={"message": "File not found"})

# Execute multi-agent research task
async def execute_multi_agents(manager) -> Dict[str, str]:
    websocket = manager.active_connections[0] if manager.active_connections else None
    if websocket:
        report = await run_research_task("Is AI in a hype cycle?", websocket, stream_output)
        return {"report": report}
    else:
        return JSONResponse(status_code=400, content={"message": "No active WebSocket connection"})

# Handle WebSocket communication
async def handle_websocket_communication(websocket, manager):
    try:
        while True:
            data = await websocket.receive_text()
            if data.startswith("start"):
                await handle_start_command(websocket, data, manager)
            elif data.startswith("human_feedback"):
                await handle_human_feedback(data)
            else:
                print("Error: Unknown command or not enough parameters provided.")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.disconnect(websocket)

# Create a new user profile in Firestore
async def create_user_profile(user_id: str, email: str, name: str = None):
    user_ref = db.collection('users').document(user_id)
    user_data = {
        'email': email,
        'created_at': firestore.SERVER_TIMESTAMP,
        'last_login': firestore.SERVER_TIMESTAMP
    }
    if name:
        user_data['name'] = name
    user_ref.set(user_data)

# Update user data in Firestore
async def update_user_data(user_id: str, data: dict):
    user_ref = db.collection('users').document(user_id)
    user_ref.update(data)

# Retrieve user data from Firestore
async def get_user_data(user_id: str):
    user_ref = db.collection('users').document(user_id)
    doc = user_ref.get()
    return doc.to_dict() if doc.exists else None

# Verify Firebase token and manage user profile
async def verify_firebase_token(token: str):
    try:
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
        email = decoded_token.get('email', '')
        
        # Check if user exists in Firestore, if not, create profile
        user_data = await get_user_data(user_id)
        if not user_data:
            await create_user_profile(user_id, email)
        else:
            # Update last login
            await update_user_data(user_id, {'last_login': firestore.SERVER_TIMESTAMP})
        
        return decoded_token
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None

# Extract command data from JSON
def extract_command_data(json_data: Dict) -> tuple:
    return (
        json_data.get("task"),
        json_data.get("report_type"),
        json_data.get("source_urls"),
        json_data.get("tone"),
        json_data.get("headers", {}),
        json_data.get("report_source")
    )

# Get Stripe webhook secret based on the domain
def get_stripe_webhook_secret(domain: str) -> str:
    webhook_secrets = {
        "gpt-researcher-costom.vercel.app": os.getenv("STRIPE_WEBHOOK_SECRET_GPT_RESEARCHER"),
        "www.tanalyze.app": os.getenv("STRIPE_WEBHOOK_SECRET_TANALYZE_WWW"),
        "tanalyze.app": os.getenv("STRIPE_WEBHOOK_SECRET_TANALYZE"),
        "agenai.app": os.getenv("STRIPE_WEBHOOK_SECRET_AGENAI"),
        "www.agenai.app": os.getenv("STRIPE_WEBHOOK_SECRET_AGENAI_WWW"),
    }
    return webhook_secrets.get(domain, "")

# Load environment variables
load_dotenv()

# Initialize Firebase Admin SDK
cred = credentials.Certificate({
    "type": os.getenv("FIREBASE_TYPE"),
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
    "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace("\\n", "\n"),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
    "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
    "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
    "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
    "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL"),
    "universe_domain": os.getenv("FIREBASE_UNIVERSE_DOMAIN")
})
firebase_app = firebase_admin.initialize_app(cred)

# Initialize Firestore
db = firestore.client()

# Initialize Stripe
def initialize_stripe():
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Create a Stripe customer and store the ID in Firestore
async def create_stripe_customer(user_id: str, email: str):
    try:
        customer = stripe.Customer.create(
            email=email,
            metadata={"user_id": user_id}
        )
        # Store the Stripe customer ID and initial data in Firestore
        await update_user_data(user_id, {
            "stripe_customer_id": customer.id,
            "stripe_created_at": firestore.SERVER_TIMESTAMP,
            "total_amount_paid": 0,
            "reports_generated": 0
        })
        return customer.id
    except StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

async def update_subscription_data(user_id: str, subscription: stripe.Subscription):
    plan = subscription.plan
    subscription_data = {
        "subscription_id": subscription.id,
        "subscription_status": subscription.status,
        "subscription_plan": {
            "id": plan.id,
            "nickname": plan.nickname,
            "amount": plan.amount,
            "currency": plan.currency,
            "interval": plan.interval,
            "interval_count": plan.interval_count,
        },
        "subscription_start_date": firestore.Timestamp.from_seconds(subscription.start_date),
        "subscription_current_period_end": firestore.Timestamp.from_seconds(subscription.current_period_end),
        "subscription_cancel_at_period_end": subscription.cancel_at_period_end,
        "subscription_items": [{
            "id": item.id,
            "price": {
                "id": item.price.id,
                "nickname": item.price.nickname,
                "unit_amount": item.price.unit_amount,
                "currency": item.price.currency,
            }
        } for item in subscription.items.data],
    }
    
    if subscription.canceled_at:
        subscription_data["subscription_canceled_at"] = firestore.Timestamp.from_seconds(subscription.canceled_at)
    
    await update_user_data(user_id, subscription_data)

# Refactor this function to focus on Checkout-specific logic
async def handle_successful_payment(session: stripe.checkout.Session):
    customer_id = session.customer
    amount = session.amount_total
    
    customer = stripe.Customer.retrieve(customer_id)
    user_id = customer.metadata.get('user_id')
    
    if user_id:
        user_data = await get_user_data(user_id)
        new_total = user_data.get('total_amount_paid', 0) + amount
        await update_user_data(user_id, {
            "total_amount_paid": new_total,
            "last_payment_date": firestore.SERVER_TIMESTAMP,
            "last_payment_amount": amount
        })

# Refactor the webhook handler to focus on Checkout events
async def handle_stripe_webhook(payload, sig_header, webhook_secret):
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            await handle_successful_payment(session)
            await handle_checkout_session_completed(session)
        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            customer = stripe.Customer.retrieve(subscription.customer)
            user_id = customer.metadata.get('user_id')
            if user_id:
                await update_subscription_data(user_id, subscription)
        
        return event
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

async def save_report_to_firestore(user_id: str, report: str, report_type: str, task: str):
    try:
        # Get a reference to the user's document
        user_ref = db.collection('users').document(user_id)
        
        # Create a new report document in a subcollection
        report_ref = user_ref.collection('reports').document()
        
        report_data = {
            'content': report,
            'type': report_type,
            'task': task,
            'created_at': firestore.SERVER_TIMESTAMP
        }
        
        # Save the report
        report_ref.set(report_data)
        
        # Update the user's report count
        user_ref.update({
            'reports_generated': firestore.Increment(1)
        })
        
        return report_ref.id
    except Exception as e:
        print(f"Error saving report to Firestore: {e}")
        return None

async def get_user_reports(user_id: str, limit: int = 10) -> List[Dict]:
    try:
        user_ref = db.collection('users').document(user_id)
        reports_ref = user_ref.collection('reports').order_by('created_at', direction=firestore.Query.DESCENDING).limit(limit)
        
        reports = []
        for doc in reports_ref.stream():
            report_data = doc.to_dict()
            report_data['id'] = doc.id
            reports.append(report_data)
        
        return reports
    except Exception as e:
        print(f"Error fetching user reports: {e}")
        return []

async def get_subscription_details(user_id: str):
    user_data = await get_user_data(user_id)
    subscription_id = user_data.get('subscription_id')
    if not subscription_id:
        return None
    
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        plan = subscription.plan
        return {
            'id': subscription.id,
            'status': subscription.status,
            'plan': {
                'id': plan.id,
                'nickname': plan.nickname,
                'amount': plan.amount,
                'currency': plan.currency,
                'interval': plan.interval,
                'interval_count': plan.interval_count,
            },
            'current_period_end': subscription.current_period_end,
            'cancel_at_period_end': subscription.cancel_at_period_end
        }
    except stripe.error.StripeError as e:
        print(f"Error retrieving subscription: {e}")
        return None

async def get_payment_history(user_id: str, limit: int = 10):
    try:
        user_data = await get_user_data(user_id)
        customer_id = user_data.get('stripe_customer_id')
        if not customer_id:
            return []
        
        charges = stripe.Charge.list(customer=customer_id, limit=limit)
        return [{
            'id': charge.id,
            'amount': charge.amount,
            'currency': charge.currency,
            'status': charge.status,
            'created': charge.created
        } for charge in charges.data]
    except stripe.error.StripeError as e:
        print(f"Error retrieving payment history: {e}")
        return []

async def cancel_subscription(user_id: str):
    try:
        user_data = await get_user_data(user_id)
        subscription_id = user_data.get('subscription_id')
        if not subscription_id:
            return False
        
        subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        await update_user_data(user_id, {
            'subscription_cancel_at_period_end': True
        })
        return True
    except stripe.error.StripeError as e:
        print(f"Error cancelling subscription: {e}")
        return False

# Update this function to use Checkout Session instead of PaymentIntent
async def verify_stripe_payment(user_id: str, session_id: str):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == 'paid':
            # Update user's subscription status in Firestore
            await update_user_data(user_id, {
                "subscription_status": "active" if session.mode == 'subscription' else "one_time",
                "last_payment_date": firestore.SERVER_TIMESTAMP,
                "last_payment_amount": session.amount_total
            })
            return "paid"
        else:
            return "unpaid"
    except stripe.error.StripeError as e:
        print(f"Error verifying Stripe payment: {e}")
        return "error"

# Update this function to use Checkout Session
async def cancel_stripe_payment(user_id: str, session_id: str):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == 'unpaid':
            # Cancel the Stripe session
            stripe.checkout.Session.expire(session_id)
            
            # Update user's data in Firestore to reflect the cancellation
            await update_user_data(user_id, {
                "last_cancelled_payment": firestore.SERVER_TIMESTAMP,
                "last_cancelled_amount": session.amount_total
            })
            return "cancelled"
        elif session.payment_status == 'paid':
            return "already_paid"
        else:
            return "error"
    except stripe.error.StripeError as e:
        print(f"Error cancelling Stripe payment: {e}")
        return "error"

async def update_user_subscription(user_id: str, subscription_data: dict):
    user_ref = db.collection('users').document(user_id)
    user_ref.update({
        'subscription': subscription_data,
        'last_updated': firestore.SERVER_TIMESTAMP
    })

async def record_one_time_payment(user_id: str, payment_data: dict):
    user_ref = db.collection('users').document(user_id)
    payments_ref = user_ref.collection('payments')
    payments_ref.add({
        **payment_data,
        'timestamp': firestore.SERVER_TIMESTAMP
    })

async def get_user_subscription(user_id: str):
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    if user_doc.exists:
        return user_doc.to_dict().get('subscription')
    return None

async def get_user_payments(user_id: str, limit: int = 10):
    user_ref = db.collection('users').document(user_id)
    payments_ref = user_ref.collection('payments').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
    return [payment.to_dict() for payment in payments_ref.stream()]

# Update this function to use Checkout for subscription creation
async def create_subscription(customer_id: str, price_id: str, origin: str):
    return await create_stripe_checkout_session(customer_id, price_id, origin)

async def create_stripe_checkout_session(user_id: str, price_id: str, origin: str):
    user_data = await get_user_data(user_id)
    customer_id = user_data.get('stripe_customer_id')
    
    if not customer_id:
        customer = stripe.Customer.create(
            metadata={"user_id": user_id}
        )
        customer_id = customer.id
        await update_user_data(user_id, {"stripe_customer_id": customer_id})
    
    # Parse the origin URL
    parsed_origin = urlparse(origin)
    base_url = f"{parsed_origin.scheme}://{parsed_origin.netloc}"
    
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=['card'],
        line_items=[{
            'price': price_id,
            'quantity': 1,
        }],
        mode='subscription' if price_id == 'prod_Qvu89XrhkHjzZU' else 'payment',
        success_url=f'{base_url}/success?session_id={{CHECKOUT_SESSION_ID}}',
        cancel_url=f'{base_url}/cancel',
    )
    
    # Store the Checkout session information in Firestore
    db = firestore.client()
    checkout_ref = db.collection('users').document(user_id).collection('checkout_sessions').document(session.id)
    checkout_ref.set({
        'session_id': session.id,
        'customer_id': customer_id,
        'price_id': price_id,
        'status': 'created',
        'created_at': firestore.SERVER_TIMESTAMP,
        'mode': 'subscription' if price_id == 'prod_Qvu89XrhkHjzZU' else 'payment',
        'origin': origin,
    })
    
    return session

# Add this new function to handle Stripe webhook events
async def handle_checkout_session_completed(session):
    customer_id = session['customer']
    customer = stripe.Customer.retrieve(customer_id)
    user_id = customer.metadata.get('user_id')
    
    if not user_id:
        print(f"Error: Unable to find user_id for customer {customer_id}")
        return
    
    db = firestore.client()
    user_ref = db.collection('users').document(user_id)
    checkout_ref = user_ref.collection('checkout_sessions').document(session['id'])
    
    checkout_ref.update({
        'status': 'completed',
        'completed_at': firestore.SERVER_TIMESTAMP,
    })
    
    if session['mode'] == 'subscription':
        subscription_id = session['subscription']
        subscription = stripe.Subscription.retrieve(subscription_id)
        await update_subscription_data(user_id, subscription)
    elif session['mode'] == 'payment':
        payment_intent_id = session['payment_intent']
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        user_ref.collection('payments').add({
            'payment_intent_id': payment_intent_id,
            'amount': payment_intent.amount,
            'currency': payment_intent.currency,
            'status': payment_intent.status,
            'created_at': firestore.SERVER_TIMESTAMP,
        })
