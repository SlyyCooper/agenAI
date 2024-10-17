// This file defines an API route for creating Stripe checkout sessions
// It's part of a Next.js application, handling POST requests to initiate the checkout process

import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/config/firebase/backendService';

// Big Picture:
// This API endpoint is crucial for initiating the payment flow in the application.
// It allows the frontend to create a new Stripe checkout session, which is the first step
// in processing a payment or subscription.

// How it works:
// 1. The route handles POST requests to /api/checkout_sessions
// 2. It extracts the plan and amount from the request body
// 3. It calls a backend service to create a new Stripe checkout session
// 4. The created session details are returned as a JSON response

// Relation to [sessionId]/route.ts:
// While this file (route.ts) handles creating new checkout sessions,
// [sessionId]/route.ts is responsible for retrieving existing session details.
// Together, they form a complete flow for managing Stripe checkout sessions:
// - route.ts initiates the checkout process
// - [sessionId]/route.ts allows for checking the status or details of that process

export async function POST(req: NextRequest) {
  try {
    // Extract plan and amount from the request body
    const { plan, amount } = await req.json();

    // Call the backend service to create a new checkout session
    const result = await createCheckoutSession(plan, amount);

    // Return the created session data as a JSON response
    return NextResponse.json(result.data);
  } catch (err) {
    // Handle any errors that occur during the process
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';

    // Return an error response with a 500 status code
    return NextResponse.json({ statusCode: 500, message: errorMessage }, { status: 500 });
  }
}
