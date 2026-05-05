import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStripe, PLANS } from '@/lib/stripe/config';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { plan } = await request.json();

    if (!plan || !['pro', 'business'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "pro" or "business".' },
        { status: 400 }
      );
    }

    const selectedPlan = PLANS[plan as 'pro' | 'business'];
    const priceId = selectedPlan.priceId;

    if (!priceId || priceId.startsWith('price_placeholder')) {
      return NextResponse.json(
        {
          error: 'stripe-not-configured',
          message:
            "Le paiement n'est pas encore activé. Contactez-nous pour démarrer.",
        },
        { status: 503 },
      );
    }
    if (
      !process.env.STRIPE_SECRET_KEY ||
      process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder'
    ) {
      return NextResponse.json(
        {
          error: 'stripe-not-configured',
          message:
            "Le paiement n'est pas encore activé. Contactez-nous pour démarrer.",
        },
        { status: 503 },
      );
    }

    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      // Upsert subscription record with customer ID
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          plan: 'free' as const,
          status: 'active' as const,
          analyses_used: 0,
          submissions_used: 0,
          stripe_subscription_id: null,
          current_period_end: null,
        });
    }

    // Create Checkout Session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/feed?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/feed?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
