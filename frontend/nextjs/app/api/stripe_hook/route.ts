// Import necessary modules from Next.js and our backend service
import { NextRequest, NextResponse } from 'next/server';
import { handleStripeWebhook } from '@/config/firebase/backendService';

// Configure Next.js to always run this code on the server and use edge runtime
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Define an asynchronous POST handler for Stripe webhook events
export async function POST(req: NextRequest) {
  // Extract the raw body content from the request
  const body = await req.text();
  // Get the Stripe signature from the request headers
  const signature = req.headers.get('stripe-signature')!;

  try {
    // Call our backend service to handle the Stripe webhook
    // This function likely verifies the webhook signature and processes the event
    const result = await handleStripeWebhook(body, signature);
    
    // If successful, return the processed data as a JSON response
    return NextResponse.json(result.data);
  } catch (err) {
    // If an error occurs, prepare an error message
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    // Log the error for debugging purposes
    console.log(`❌ Error message: ${errorMessage}`);
    
    // Return an error response with a 400 status code
    // This informs Stripe that the webhook was not processed successfully
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }
}
