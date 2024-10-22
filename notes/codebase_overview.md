- **Name of the Project or Codebase**: `gpt-researcher_costom`
- **Primary Programming Language(s) Used**: Python (98.1%), TypeScript (1.2%), JavaScript (0.3%), CSS (0.2%), HTML (0.1%), PowerShell (0.1%)-* **Main Purpose or Functionality**: The project is an LLM-based autonomous agent that performs comprehensive online research on any given topic.

# Overview
## Backend:
    * Hosted on https://dolphin-app-49eto.ondigitalocean.app/backend
    * FastAPI
    * Firebase Admin, Firestore, Stripe SDK
    * Stripe Chekcouts for payments and subscriptions

    * Backend Environment Variables are safely in @.env 
## Frontend:
    * Hosted on **ALL** of the following domains:
        * https://gpt-researcher-costom.vercel.app
        * https://www.tanalyze.app
        * https://tanalyze.app
        * https://agenai.app
        * https://www.agenai.app
        * http://agenai.app
        * http://www.agenai.app
    * Next.js 14 with Typescript
    * Firebase auth in Frontend that connects to Backend
    * Frontend Environment Variables are safely in @.env.local 
    * Use of Stripe Webhook in my backend @server.py and @server_utils.py
        * Stripe Webhook Endpoint: https://dolphin-app-49eto.ondigitalocean.app/backend/stripe/webhook
        * Stripe Webhook Signing Secret included in my .env under STRIPE_WEBHOOK_SECRET: whsec_3ocmjzSpOny0Mnq9m0XOX0VEUQeqYsiK
        * Stripe Webhook Endpoint ID: we_1QCjFF060pc64aKuH0ruB29Z
        * STRIPE_SUBSCRIPTION_PRODUCT_ID=prod_Qvu89XrhkHjzZU
        * STRIPE_SUBSCRIPTION_PRICE_ID=price_1Q42KT060pc64aKupjCogJZN
        * STRIPE_ONETIME_PRODUCT_ID=prod_R0bEOf1dWZCjyY
        * STRIPE_ONETIME_PRICE_ID=price_1Q8a1z060pc64aKuwy1n1wzz

# Project Strucutre
## Backend:
    * Hosted on https://dolphin-app-49eto.ondigitalocean.app/backend
    * FastAPI
    * Firebase Admin, Firestore, Stripe SDK
    * Stripe Configuration

## Frontend:
    * Hosted on **ALL** of the following domains:
        * https://gpt-researcher-costom.vercel.app
        * https://www.tanalyze.app
        * https://tanalyze.app
        * https://agenai.app
        * https://www.agenai.app
        * http://agenai.app
        * http://www.agenai.app
    * Next.js 14 with Typescript
    * Firebase auth in Frontend that connects to Backend

# Stripe Webhook Secrets
STRIPE_WEBHOOK_SECRET=

# Project Strucutre

```
├── backend
    ├── memory
    │   ├── draft.py
    │   └── research.py
    ├── report_type
    │   ├── basic_report
    │   │   └── basic_report.py
    │   └── detailed_report
    │   │   └── detailed_report.py
    ├── server
    │   ├── server.py  # Main FastAPI server file, handles API routes, WebSocket connections
    │   ├── server_utils.py  # Utility functions for server operations, including file handling and Firebase authentication
    │   ├── stripe_utils.py  # Handles Stripe integration, including customer creation, checkout sessions, and webhook processing
    │   ├── firebase_utils.py  # Manages Firebase operations, including user data retrieval and updates
    │   └── websocket_manager.py  # Manages WebSocket connections, handles authentication, and facilitates real-time communication
    └── utils.py
├── frontend
    ├── nextjs
    │   ├── actions
    │   │   ├── apiActions.ts  # Contains API action functions for handling sources, answers, and AI-powered research
    │   │   ├── stripeAPI.ts  # Handles Stripe-related API calls for subscriptions, payments, and checkout sessions
    │   │   ├── userprofileAPI.ts  # Manages user profile-related API calls
    │   │   └── reportAPI.ts  # Handles API calls for user reports and research data
    │   ├── app
    │   │   ├── cancel
    │   │   │   └── page.tsx  # Handles payment cancellation, displays message and options
    │   │   ├── dashboard
    │   │   │   └── page.tsx  # User dashboard with account info, subscription details, and recent reports
    │   │   ├── globals.css   # Global styles for the application
    │   │   ├── layout.tsx    # Main layout component for the app
    │   │   ├── login
    │   │   │   └── page.tsx  # Handles user authentication with email/password, Google, and Twitter
    │   │   ├── page.tsx      # Home page component
    │   │   ├── plans
    │   │   │   └── page.tsx  # Displays subscription plans and handles Stripe payments
    │   │   ├── research
    │   │   │   └── page.tsx  # Main research interface for conducting AI-powered research
    │   │   ├── signup
    │   │   │   └── page.tsx  # User registration page with email/password, Google, and Twitter options
    │   │   ├── success
    │   │   │   └── page.tsx  # Confirmation page for successful payments or actions
    │   │   └── userprofile
    │   │   │   ├── UserProfile.module.css  # Styles specific to the user profile page
    │   │   │   └── page.tsx  # User profile management page with settings and account information
    │   ├── components
    │   │   └── ...
    │   ├── config.ts  # Contains client-side configuration, including Firebase settings
    │   ├── config
    │   │   ├── firebase
    │   │   │   ├── AuthContext.tsx  # Manages authentication state and user context across the app
    │   │   │   └── firebase.ts  # Initializes and exports Firebase app and authentication instances
    │   │   ├── stripe
    │   │   │   └── get-stripejs.ts  # Initializes and exports Stripe instance for payment processing
    │   │   └── task.js
├── main.py
└── requirements.txt