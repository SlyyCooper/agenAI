import { NextRequest, NextResponse } from 'next/server';
import { createUserProfile, getUserProfile, updateUserProfile } from '@/config/firebase/backendService';

export async function POST(req: NextRequest) {
  try {
    const { uid, ...profileData } = await req.json();
    const result = await createUserProfile(uid, profileData);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error creating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.url.split('/').pop();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    const result = await getUserProfile(userId);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { uid, ...profileData } = await req.json();
    const result = await updateUserProfile(uid, profileData);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
