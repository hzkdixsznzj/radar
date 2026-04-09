import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/config';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { SubscriptionPlan, SubscriptionStatus } from '@/types/database';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan as SubscriptionPlan | undefined;

        if (!userId || !plan) {
          console.error('Missing metadata in checkout session');
          break;
        }

        const subscriptionId = session.subscription as string;

        // Fetch subscription details from Stripe
        const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);

        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscriptionId,
            plan,
            status: 'active' as SubscriptionStatus,
            current_period_end: new Date(stripeSubscription.items.data[0].current_period_end * 1000).toISOString(),
            analyses_used: 0,
            submissions_used: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Map Stripe status to our status
        const statusMap: Record<string, SubscriptionStatus> = {
          active: 'active',
          trialing: 'trialing',
          past_due: 'past_due',
          canceled: 'canceled',
          incomplete: 'incomplete',
        };

        const status = statusMap[subscription.status] || 'active';

        // Determine plan from price
        const priceId = subscription.items.data[0]?.price?.id;
        let plan: SubscriptionPlan = 'free';
        if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
          plan = 'pro';
        } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
          plan = 'business';
        }

        await supabase
          .from('subscriptions')
          .update({
            plan,
            status,
            current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Reset to free plan
        await supabase
          .from('subscriptions')
          .update({
            plan: 'free' as SubscriptionPlan,
            status: 'canceled' as SubscriptionStatus,
            stripe_subscription_id: null,
            current_period_end: null,
            analyses_used: 0,
            submissions_used: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
