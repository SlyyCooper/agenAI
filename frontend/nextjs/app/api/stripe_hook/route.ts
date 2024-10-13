import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.log(`❌ Error message: ${errorMessage}`);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      // Handle successful payment
      await handleSuccessfulPayment(session);
      break;
    case 'invoice.paid':
      // Handle successful subscription payment
      await handleSuccessfulSubscription(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      // Handle failed subscription payment
      await handleFailedSubscription(event.data.object as Stripe.Invoice);
      break;
    default:
      console.warn(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  // Implement your logic here, e.g., update user's credits, send confirmation email, etc.
  console.log('Payment successful:', session);
}

async function handleSuccessfulSubscription(invoice: Stripe.Invoice) {
  // Implement your logic here, e.g., update user's subscription status, send confirmation email, etc.
  console.log('Subscription payment successful:', invoice);
}

async function handleFailedSubscription(invoice: Stripe.Invoice) {
  // Implement your logic here, e.g., notify user of failed payment, update subscription status, etc.
  console.log('Subscription payment failed:', invoice);
}
