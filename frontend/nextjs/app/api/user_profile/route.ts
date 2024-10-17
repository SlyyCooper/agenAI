// Import necessary modules from Next.js and our backend service
import { NextRequest, NextResponse } from 'next/server';
import { createUserProfile, getUserProfile, updateUserProfile } from '@/config/firebase/backendService';

// Handler for POST requests to create a new user profile
export async function POST(req: NextRequest) {
  try {
    // Extract uid and profileData from the request body
    const { uid, ...profileData } = await req.json();
    // Call the backend service to create a new user profile
    const result = await createUserProfile(uid, profileData);
    // Return the created profile data as a JSON response
    return NextResponse.json(result.data);
  } catch (error) {
    // Log any errors that occur during profile creation
    console.error('Error creating user profile:', error);
    // Return a 500 Internal Server Error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler for GET requests to fetch a user profile
export async function GET(req: NextRequest) {
  try {
    // Extract userId from the URL
    const userId = req.url.split('/').pop();
    // Check if userId is provided
    if (!userId) {
      // Return a 400 Bad Request if userId is missing
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    // Call the backend service to get the user profile
    const result = await getUserProfile(userId);
    // Return the fetched profile as a JSON response
    return NextResponse.json(result.data);
  } catch (error) {
    // Log any errors that occur during profile fetching
    console.error('Error fetching user profile:', error);
    // Return a 500 Internal Server Error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler for PUT requests to update an existing user profile
export async function PUT(req: NextRequest) {
  try {
    // Extract uid and updated profileData from the request body
    const { uid, ...profileData } = await req.json();
    // Call the backend service to update the user profile
    const result = await updateUserProfile(uid, profileData);
    // Return the updated profile data as a JSON response
    return NextResponse.json(result.data);
  } catch (error) {
    // Log any errors that occur during profile update
    console.error('Error updating user profile:', error);
    // Return a 500 Internal Server Error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
