import { NextRequest, NextResponse } from 'next/server';
import { createSubscription, getSubscription, updateSubscription } from '@/config/firebase/backendService';

export async function POST(req: NextRequest) {
  try {
    const { userId, ...subscriptionData } = await req.json();
    const result = await createSubscription(userId, subscriptionData);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.url.split('/').pop();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    const result = await getSubscription(userId);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId, ...subscriptionData } = await req.json();
    const result = await updateSubscription(userId, subscriptionData);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
