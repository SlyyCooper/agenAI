# Project Documentation

## Backend Setup

### Environment Variables (@.env)

- OPENAI_API_KEY: Used for OpenAI integration
- TAVILY_API_KEY: Used for Tavily API integration
- LANGCHAIN_API_KEY: Used for LangChain integration
- FIREBASE_TYPE: Firebase configuration
- FIREBASE_PROJECT_ID: Firebase project ID
- FIREBASE_PRIVATE_KEY_ID: Firebase private key ID
- FIREBASE_PRIVATE_KEY: Firebase private key
- FIREBASE_CLIENT_EMAIL: Firebase client email
- FIREBASE_CLIENT_ID: Firebase client ID
- FIREBASE_AUTH_URI: Firebase authentication URI
- FIREBASE_TOKEN_URI: Firebase token URI
- FIREBASE_AUTH_PROVIDER_X509_CERT_URL: Firebase auth provider cert URL
- FIREBASE_CLIENT_X509_CERT_URL: Firebase client cert URL
- FIREBASE_UNIVERSE_DOMAIN: Firebase universe domain
- AUTH_SECRET: Authentication secret
- STRIPE_WEBHOOK_SECRET_GPT_RESEARCHER: Stripe webhook secret for GPT Researcher
- STRIPE_WEBHOOK_SECRET_TANALYZE_WWW: Stripe webhook secret for Tanalyze (www)
- STRIPE_WEBHOOK_SECRET_TANALYZE: Stripe webhook secret for Tanalyze
- STRIPE_WEBHOOK_SECRET_AGENAI: Stripe webhook secret for Agenai
- STRIPE_WEBHOOK_SECRET_AGENAI_WWW: Stripe webhook secret for Agenai (www)
- STRIPE_SECRET_KEY: Stripe secret key
- STRIPE_WEBHOOK_SECRET: General Stripe webhook secret

### Server Setup (@server.py)

1. FastAPI application initialization
2. CORS middleware configuration
3. Firebase Admin SDK initialization
4. Stripe initialization

Key routes:
- POST /create-checkout-session: Creates a Stripe checkout session
- POST /stripe-webhook: Handles Stripe webhooks
- GET /user/subscription: Retrieves user subscription details
- POST /user/cancel-subscription: Cancels a user's subscription
- GET /verify-payment/{session_id}: Verifies a payment
- POST /cancel-payment/{session_id}: Cancels a payment

### Server Utilities (@server_utils.py)

Key functions:
- create_stripe_checkout_session: Creates a Stripe checkout session
- handle_stripe_webhook: Processes Stripe webhook events
- update_subscription_data: Updates user subscription data in Firestore
- get_subscription_details: Retrieves subscription details from Stripe
- cancel_subscription: Cancels a user's subscription
- verify_stripe_payment: Verifies a Stripe payment
- cancel_stripe_payment: Cancels a Stripe payment

Firestore data structure:
- Collection: users
  - Document: {user_id}
    - Fields: email, created_at, last_login, stripe_customer_id, subscription details
    - Subcollection: checkout_sessions
      - Document: {session_id}
        - Fields: session_id, customer_id, price_id, status, created_at, mode, origin
    - Subcollection: payments
      - Document: {payment_id}
        - Fields: payment_intent_id, amount, currency, status, created_at
    - Subcollection: reports
      - Document: {report_id}
        - Fields: content, type, task, created_at

## Frontend Setup

### Environment Variables (@.env.local)

- NEXT_PUBLIC_FIREBASE_API_KEY: Firebase API key
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: Firebase auth domain
- NEXT_PUBLIC_FIREBASE_PROJECT_ID: Firebase project ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: Firebase storage bucket
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: Firebase messaging sender ID
- NEXT_PUBLIC_FIREBASE_APP_ID: Firebase app ID
- NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: Firebase measurement ID
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Stripe publishable key

### Stripe Integration (@get-stripejs.ts)

- getStripe function: Initializes and returns a Stripe instance

### Firebase and Authentication (@AuthContext.tsx)

- AuthProvider component: Manages user authentication state
- useAuth hook: Provides access to authentication context

### API Actions (@apiActions.ts)

Key functions:
- createCheckoutSession: Creates a Stripe checkout session
- getUserSubscription: Retrieves user subscription details
- getUserPaymentHistory: Fetches user payment history
- cancelUserSubscription: Cancels a user's subscription
- verifyPayment: Verifies a payment
- cancelPayment: Cancels a payment

### Plans Page (@page.tsx - plans)

Components:
- CheckoutForm: Handles the checkout process
- PlanCard: Displays individual plan details
- PlansPage: Main component for the plans page

Product IDs:
- One-time payment: prod_R0bEOf1dWZCjyY
- Subscription: prod_Qvu89XrhkHjzZU

### Success Page (@page.tsx - success)

- Handles successful payments
- Verifies payment status
- Displays appropriate messages based on payment status

### Cancel Page (@page.tsx - cancel)

- Handles cancelled payments
- Allows users to return to plans or contact support

## Flow

1. User selects a plan on the Plans Page
2. CheckoutForm component initiates checkout process
3. Backend creates a Stripe checkout session
4. User is redirected to Stripe Checkout
5. After payment, user is redirected to Success or Cancel page
6. Backend processes Stripe webhook events
7. User subscription/payment data is updated in Firestore

## Implementation Notes

- The system uses Stripe Checkout for both one-time payments and subscriptions
- Firebase is used for authentication and Firestore for data storage
- Stripe customer IDs are stored in Firestore and linked to user accounts
- Webhook events are used to update user data after successful payments
- The frontend uses React hooks and context for state management
- Environment variables are used to securely store API keys and configuration



