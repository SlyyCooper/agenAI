// Import necessary modules from Next.js and our backend service
import { NextRequest, NextResponse } from 'next/server';
import { createReport, getReports, deleteReport } from '@/config/firebase/backendService';

// Handler for POST requests to create a new report
export async function POST(req: NextRequest) {
  try {
    // Extract userId and reportData from the request body
    const { userId, ...reportData } = await req.json();
    // Call the backend service to create a new report
    const result = await createReport(userId, reportData);
    // Return the created report data as a JSON response
    return NextResponse.json(result.data);
  } catch (error) {
    // Log any errors that occur during report creation
    console.error('Error creating report:', error);
    // Return a 500 Internal Server Error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler for GET requests to fetch reports for a user
export async function GET(req: NextRequest) {
  try {
    // Extract userId from the URL
    const userId = req.url.split('/').pop();
    // Check if userId is provided
    if (!userId) {
      // Return a 400 Bad Request if userId is missing
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    // Call the backend service to get reports for the user
    const result = await getReports(userId);
    // Return the fetched reports as a JSON response
    return NextResponse.json(result.data);
  } catch (error) {
    // Log any errors that occur during report fetching
    console.error('Error fetching reports:', error);
    // Return a 500 Internal Server Error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler for DELETE requests to remove a specific report
export async function DELETE(req: NextRequest) {
  try {
    // Extract userId and reportId from the URL
    const [userId, reportId] = req.url.split('/').slice(-2);
    // Check if both userId and reportId are provided
    if (!userId || !reportId) {
      // Return a 400 Bad Request if either is missing
      return NextResponse.json({ error: 'User ID and Report ID are required' }, { status: 400 });
    }
    // Call the backend service to delete the specified report
    const result = await deleteReport(userId, reportId);
    // Return the result of the deletion operation as a JSON response
    return NextResponse.json(result.data);
  } catch (error) {
    // Log any errors that occur during report deletion
    console.error('Error deleting report:', error);
    // Return a 500 Internal Server Error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
