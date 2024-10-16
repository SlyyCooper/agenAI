import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutSession } from '@/config/firebase/backendService';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;

  try {
    const result = await getCheckoutSession(sessionId);
    return NextResponse.json(result.data);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ statusCode: 500, message: errorMessage }, { status: 500 });
  }
}
