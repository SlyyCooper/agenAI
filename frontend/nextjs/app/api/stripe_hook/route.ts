import { NextRequest, NextResponse } from 'next/server';
import { handleStripeWebhook } from '@/config/firebase/backendService';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  try {
    const result = await handleStripeWebhook(body, signature);
    return NextResponse.json(result.data);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.log(`❌ Error message: ${errorMessage}`);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }
}
