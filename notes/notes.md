# Core Backend Services Documentation

This documentation focuses on the core backend services (Firebase/Firestore and Stripe) and their integration points. It outlines:
1. All Firestore operations for user management
2. Stripe payment processing flows
3. Data structures needed for frontend integration
4. Required environment variables

The frontend needs to implement corresponding API calls and data handling for these services.

## Firebase/Firestore Operations

### User Profile Management
1. **Create User Profile**
   - Function: `create_user_profile(user_id, email, name)`
   - Data Stored:
     ```json
     {
       "email": string,
       "created_at": timestamp,
       "last_login": timestamp,
       "name": string (optional)
     }
     ```

2. **Update User Data**
   - Function: `update_user_data(user_id, data)`
   - Updates any user fields in Firestore

3. **Get User Data**
   - Function: `get_user_data(user_id)`
   - Returns all user data from Firestore

4. **Verify Firebase Token**
   - Function: `verify_firebase_token(token)`
   - Validates user authentication
   - Creates profile if new user
   - Updates last login timestamp

## Stripe Integration

### Payment Processing
1. **Order Fulfillment**
   - Function: `fulfill_order(session)`
   - Handles both subscription and one-time payments
   - Updates Firestore with:
     ```json
     // For Subscription
     {
       "subscription_status": "active",
       "subscription_id": string,
       "subscription_end_date": timestamp,
       "product_id": string,
       "price_id": string,
       "has_access": true
     }
     
     // For One-time Purchase
     {
       "one_time_purchase": true,
       "purchase_date": timestamp,
       "product_id": string,
       "price_id": string,
       "has_access": true
     }
     ```

2. **Subscription Management**
   - Update Status: `update_subscription_status(invoice)`
   - Cancel Subscription: `handle_subscription_cancellation(subscription)`
   - Updates Firestore with:
     ```json
     {
       "subscription_status": string,
       "last_payment_date": timestamp,
       "subscription_end_date": timestamp,
       "has_access": boolean
     }
     ```

### Webhook Events
- `checkout.session.completed`: Triggers order fulfillment
- `invoice.paid`: Updates subscription status
- `customer.subscription.deleted`: Handles cancellation

## Required Frontend Integration Points

### User Authentication
```typescript
interface UserProfile {
  email: string;
  name?: string;
  created_at: timestamp;
  last_login: timestamp;
  has_access: boolean;
  subscription_status?: string;
  subscription_end_date?: timestamp;
  one_time_purchase?: boolean;
}
```

### Payment Integration
```typescript
interface PaymentSession {
  mode: 'subscription' | 'payment';
  price_id: string;
  user_id: string;
}

interface SubscriptionStatus {
  has_access: boolean;
  subscription_status?: string;
  subscription_end_date?: timestamp;
  one_time_purchase: boolean;
}
```

### Required Environment Variables
```env
FIREBASE_CONFIG={}
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SUBSCRIPTION_PRODUCT_ID=
STRIPE_SUBSCRIPTION_PRICE_ID=
STRIPE_ONETIME_PRODUCT_ID=
STRIPE_ONETIME_PRICE_ID=
```

## API Routes Reference

### User Authentication & Profile Routes

1. **GET** `/api/user/profile`
   ```typescript
   // Frontend Implementation
   const getUserProfile = async () => {
     const response = await fetch(
       'https://dolphin-app-49eto.ondigitalocean.app/backend/api/user/profile',
       {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${firebaseToken}`,
           'Content-Type': 'application/json',
         },
       }
     );
     return await response.json();
   };
   ```

2. **PUT** `/api/user/profile`
   ```typescript
   // Frontend Implementation
   const createUserProfile = async (data: { email: string; name?: string }) => {
     const response = await fetch(
       'https://dolphin-app-49eto.ondigitalocean.app/backend/api/user/profile',
       {
         method: 'PUT',
         headers: {
           'Authorization': `Bearer ${firebaseToken}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(data),
       }
     );
     return await response.json();
   };
   ```

3. **PUT** `/api/user/update`
   ```typescript
   // Frontend Implementation
   const updateUserProfile = async (data: Record<string, any>) => {
     const response = await fetch(
       'https://dolphin-app-49eto.ondigitalocean.app/backend/api/user/update',
       {
         method: 'PUT',
         headers: {
           'Authorization': `Bearer ${firebaseToken}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(data),
       }
     );
     return await response.json();
   };
   ```

4. **GET** `/api/user/subscription`
   ```typescript
   // Frontend Implementation
   const getUserSubscription = async () => {
     const response = await fetch(
       'https://dolphin-app-49eto.ondigitalocean.app/backend/api/user/subscription',
       {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${firebaseToken}`,
           'Content-Type': 'application/json',
         },
       }
     );
     return await response.json();
   };
   ```

5. **GET** `/api/user/payment-history`
   ```typescript
   // Frontend Implementation
   const getPaymentHistory = async () => {
     const response = await fetch(
       'https://dolphin-app-49eto.ondigitalocean.app/backend/api/user/payment-history',
       {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${firebaseToken}`,
           'Content-Type': 'application/json',
         },
       }
     );
     return await response.json();
   };
   ```

6. **GET** `/api/user/access-status`
   ```typescript
   // Frontend Implementation
   const getAccessStatus = async () => {
     const response = await fetch(
       'https://dolphin-app-49eto.ondigitalocean.app/backend/api/user/access-status',
       {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${firebaseToken}`,
           'Content-Type': 'application/json',
         },
       }
     );
     return await response.json();
   };
   ```

### Stripe Payment Routes

1. **POST** `/api/stripe/webhook`
   ```typescript
   // Note: Webhook is handled on the backend, no frontend implementation needed
   ```

2. **POST** `/api/stripe/create-checkout-session`
   ```typescript
   // Frontend Implementation
   const createCheckoutSession = async (
     price_id: string,
     mode: 'subscription' | 'payment'
   ) => {
     const response = await fetch(
       'https://dolphin-app-49eto.ondigitalocean.app/backend/api/stripe/create-checkout-session',
       {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${firebaseToken}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ price_id, mode }),
       }
     );
     const { sessionId } = await response.json();
     
     // Redirect to Stripe Checkout
     const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
     await stripe?.redirectToCheckout({ sessionId });
   };
   ```

3. **POST** `/api/stripe/create-portal-session`
   ```typescript
   // Frontend Implementation
   const createPortalSession = async () => {
     const response = await fetch(
       'https://dolphin-app-49eto.ondigitalocean.app/backend/api/stripe/create-portal-session',
       {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${firebaseToken}`,
           'Content-Type': 'application/json',
         },
       }
     );
     const { url } = await response.json();
     window.location.href = url;
   };
   ```

4. **POST** `/api/stripe/cancel-subscription`
   ```typescript
   // Frontend Implementation
   const cancelSubscription = async () => {
     const response = await fetch(
       'https://dolphin-app-49eto.ondigitalocean.app/backend/api/stripe/cancel-subscription',
       {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${firebaseToken}`,
           'Content-Type': 'application/json',
         },
       }
     );
     return await response.json();
   };
   ```

5. **GET** `/api/stripe/subscription-status`
   ```typescript
   // Frontend Implementation
   const getSubscriptionStatus = async () => {
     const response = await fetch(
       'https://dolphin-app-49eto.ondigitalocean.app/backend/api/stripe/subscription-status',
       {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${firebaseToken}`,
           'Content-Type': 'application/json',
         },
       }
     );
     return await response.json();
   };
   ```

### Utility Function for Firebase Token
```typescript
// Helper to get Firebase token
const getFirebaseToken = async (): Promise<string> => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No user logged in');
  }
  return await currentUser.getIdToken();
};

// Usage example with error handling
const apiCall = async () => {
  try {
    const firebaseToken = await getFirebaseToken();
    // Use any of the above API functions
  } catch (error) {
    console.error('API Error:', error);
    // Handle error appropriately
  }
};
```

## Data Models

### Firestore User Document
```typescript
interface UserDocument {
  email: string;
  name?: string;
  created_at: timestamp;
  last_login: timestamp;
  has_access: boolean;
  subscription_status?: 'active' | 'cancelled' | null;
  subscription_id?: string;
  subscription_end_date?: timestamp;
  one_time_purchase?: boolean;
  purchase_date?: timestamp;
  product_id?: string;
  price_id?: string;
  stripe_customer_id?: string;
  last_payment_date?: timestamp;
}
```

### API Request/Response Types
```typescript
interface CreateCheckoutSessionRequest {
  price_id: string;
  mode: 'subscription' | 'payment';
}

interface SubscriptionStatusResponse {
  has_access: boolean;
  subscription_status?: string;
  subscription_end_date?: timestamp;
  subscription_id?: string;
  one_time_purchase: boolean;
}

interface UserProfileUpdateRequest {
  email?: string;
  name?: string;
  [key: string]: any;
}
```