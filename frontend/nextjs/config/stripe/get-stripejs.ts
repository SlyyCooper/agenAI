// Import the loadStripe function from the Stripe.js library
// This function is used to initialize Stripe on the client-side
import { loadStripe } from '@stripe/stripe-js';

// Declare a variable to store the Stripe promise
// This allows us to reuse the same Stripe instance across the application
let stripePromise: Promise<any>;

// Define a function to get the Stripe instance
const getStripe = () => {
  // Check if the Stripe promise has not been initialized
  if (!stripePromise) {
    // If not initialized, create a new Stripe instance using the publishable key
    // The '!' at the end asserts that the environment variable is defined
    // This key should be set in your environment variables
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  // Return the Stripe promise (either existing or newly created)
  return stripePromise;
};

// Export the getStripe function as the default export
// This function can be imported and used in other parts of the application
// to access the Stripe instance
export default getStripe;

// Interaction with other files:
// 1. AuthContext.tsx: While not directly interacting, the auth state from AuthContext
//    may be used in components that also use this Stripe instance for payments.
//
// 2. firebase.ts: This file doesn't directly interact with firebase.ts, but both
//    are part of the overall configuration. The Firebase setup in firebase.ts
//    handles authentication, while this file sets up Stripe for payments.
//
// 3. backendService.ts: The Stripe instance created here is likely used in 
//    conjunction with the payment-related functions in backendService.ts.
//    For example, when createCheckoutSession or createPaymentIntent is called
//    in backendService.ts, the frontend might use this Stripe instance to
//    handle the client-side part of the payment process.
//
// 4. app/api/checkout_sessions/route.ts:
//    This file creates Stripe checkout sessions. The Stripe instance from getStripe()
//    is likely used on the client-side to redirect to the Stripe checkout page
//    after the session is created.

// 5. app/api/checkout_sessions/[sessionId]/route.ts:
//    While this file handles retrieving session details on the server-side,
//    the client might use the Stripe instance from getStripe() to handle
//    post-payment actions or display payment status.

// 6. app/api/payment_intents/route.ts:
//    This file creates payment intents. The Stripe instance from getStripe()
//    is used on the client-side to confirm the payment intent and complete
//    the payment process.

// 7. app/api/subscription/route.ts:
//    For subscription-based payments, the Stripe instance from getStripe()
//    might be used to handle recurring payments or update payment methods
//    on the client-side.

// 8. app/api/stripe_hook/route.ts:
//    While this file handles server-side webhook events, the client-side
//    Stripe instance from getStripe() might be used to update the UI
//    based on webhook events, such as displaying payment success or failure.

// 1. plans/page.tsx: //    - This page likely uses getStripe() when a user selects a plan //    - It might call getStripe() to initialize Stripe and redirect to checkout //    - Example: const stripe = await getStripe(); stripe.redirectToCheckout({...});

// 2. success/page.tsx: //    - After a successful payment, this page might use getStripe() //    - It could retrieve the session details or update UI based on payment status //    - Example: const stripe = await getStripe(); stripe.retrieveSession(sessionId);

// 3. cancel/page.tsx: //    - If a user cancels the payment, this page might use getStripe() //    - It could handle cleanup or offer to retry the payment //    - Example: const stripe = await getStripe(); stripe.cancelPayment(paymentId);  

// Note: These pages work together with getStripe() to create a complete payment flow:
// - plans/page.tsx initiates the payment process
// - success/page.tsx handles successful payments
// - cancel/page.tsx manages cancelled or failed payments
// The Stripe instance from getStripe() ensures consistent Stripe functionality across these pages
// Note: This file is crucial for integrating Stripe payments in the frontend.
// It ensures that only one Stripe instance is created and reused across the app,
// which is important for performance and consistency in payment processing.
// The Stripe instance created here works in tandem with the server-side
// Stripe operations defined in the various route.ts files to create a complete
// payment flow in the application.

