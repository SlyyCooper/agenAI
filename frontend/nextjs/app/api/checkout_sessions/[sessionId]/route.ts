// This file defines an API route for retrieving Stripe checkout session details
// It's part of a Next.js application, handling GET requests for specific session IDs

import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutSession } from '@/config/firebase/backendService';

// Big Picture:
// This API endpoint is crucial for the payment flow in the application.
// It allows the frontend to fetch details of a Stripe checkout session,
// which is typically used to confirm the status of a payment or retrieve
// information about a completed transaction.

// How it works:
// 1. The route uses dynamic routing with [sessionId] in the file path
// 2. When a GET request is made to /api/checkout_sessions/{sessionId},
//    this handler function is invoked
// 3. It extracts the sessionId from the URL parameters
// 4. It then calls a backend service to fetch the session details from Stripe
// 5. The result is returned as a JSON response

// Relation to @route.ts:
// While @route.ts (in the parent directory) handles creating new checkout sessions,
// this file ([sessionId]/route.ts) is responsible for retrieving existing session details.
// Together, they form a complete flow for managing Stripe checkout sessions:
// - @route.ts initiates the checkout process
// - [sessionId]/route.ts allows for checking the status or details of that process

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  // Extract the sessionId from the route parameters
  const sessionId = params.sessionId;

  try {
    // Attempt to retrieve the checkout session details
    // This involves a call to the Stripe API via our backend service
    const result = await getCheckoutSession(sessionId);

    // If successful, return the session details as a JSON response
    // This allows the frontend to access information like payment status,
    // customer details, or any metadata associated with the session
    return NextResponse.json(result);
  } catch (err) {
    // If an error occurs, handle it gracefully
    // This could be due to invalid sessionId, Stripe API issues, or other errors
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';

    // Return an error response with a 500 status code
    // This informs the client that something went wrong on the server side
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
