// Import necessary modules from Next.js and our backend service
import { NextRequest, NextResponse } from 'next/server';
import { createSubscription, getSubscription, updateSubscription } from '@/config/firebase/backendService';

// Handler for POST requests to create a new subscription
export async function POST(req: NextRequest) {
  try {
    // Extract userId and subscriptionData from the request body
    const { userId, ...subscriptionData } = await req.json();
    // Call the backend service to create a new subscription
    const result = await createSubscription(userId, subscriptionData);
    // Return the created subscription data as a JSON response
    return NextResponse.json(result.data);
  } catch (error) {
    // Log any errors that occur during subscription creation
    console.error('Error creating subscription:', error);
    // Return a 500 Internal Server Error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler for GET requests to fetch a subscription for a user
export async function GET(req: NextRequest) {
  try {
    // Extract userId from the URL
    const userId = req.url.split('/').pop();
    // Check if userId is provided
    if (!userId) {
      // Return a 400 Bad Request if userId is missing
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    // Call the backend service to get the subscription for the user
    const result = await getSubscription(userId);
    // Return the fetched subscription as a JSON response
    return NextResponse.json(result.data);
  } catch (error) {
    // Log any errors that occur during subscription fetching
    console.error('Error fetching subscription:', error);
    // Return a 500 Internal Server Error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler for PUT requests to update an existing subscription
export async function PUT(req: NextRequest) {
  try {
    // Extract userId and updated subscriptionData from the request body
    const { userId, ...subscriptionData } = await req.json();
    // Call the backend service to update the subscription
    const result = await updateSubscription(userId, subscriptionData);
    // Return the updated subscription data as a JSON response
    return NextResponse.json(result.data);
  } catch (error) {
    // Log any errors that occur during subscription update
    console.error('Error updating subscription:', error);
    // Return a 500 Internal Server Error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
