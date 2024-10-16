import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/config/firebase/backendService';

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json();
    const result = await createPaymentIntent(amount);
    return NextResponse.json(result.data);
  } catch (err) {
    console.error('Error creating payment intent:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
