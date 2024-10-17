// Import necessary modules from Next.js and our backend service
import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/config/firebase/backendService';

// Define an asynchronous POST handler for the /api/payment_intents route
export async function POST(req: NextRequest) {
  try {
    // Extract the 'amount' from the request body
    const { amount } = await req.json();

    // Call our backend service to create a new payment intent with the specified amount
    // This likely interacts with Stripe's API to initialize a payment process
    const result = await createPaymentIntent(amount);

    // If successful, return the payment intent data as a JSON response
    return NextResponse.json(result.data);
  } catch (err) {
    // If an error occurs during the process, log it for debugging
    console.error('Error creating payment intent:', err);

    // Prepare an error message, using the error's message if available, or a default message
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';

    // Return an error response with a 500 status code
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
