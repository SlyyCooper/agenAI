import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/config/firebase/backendService';

export async function POST(req: NextRequest) {
  try {
    const { plan, amount } = await req.json();
    const result = await createCheckoutSession(plan, amount);
    return NextResponse.json(result.data);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ statusCode: 500, message: errorMessage }, { status: 500 });
  }
}
