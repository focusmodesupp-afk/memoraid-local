import { Request, Response } from 'express';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { stripe } from './stripe';
import { families } from '../../shared/schemas/schema';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function handleBillingWebhook(req: Request, res: Response) {
  if (!stripe || !endpointSecret) {
    return res.status(503).send('Webhook not configured');
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    return res.status(400).send('Missing stripe-signature');
  }

  let event: Stripe.Event;
  try {
    const rawBody = req.body;
    const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(JSON.stringify(rawBody ?? {}));
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string | null;
        const customerId = session.customer as string | null;
        const familyId = session.metadata?.familyId;

        if (!familyId) {
          console.log('checkout.session.completed: no familyId in metadata, skipping family update');
          break;
        }

        const subscription = subscriptionId && await stripe.subscriptions.retrieve(subscriptionId);
        const tier = subscription?.metadata?.tier ?? 'premium';

        await db
          .update(families)
          .set({
            subscriptionTier: tier,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
          })
          .where(eq(families.id, familyId));

        console.log(`Updated family ${familyId} to tier ${tier}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;
        const customerId = sub.customer as string;

        const [f] = await db
          .select()
          .from(families)
          .where(eq(families.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (!f) {
          console.log('subscription.updated: no family found for subscription', subscriptionId);
          break;
        }

        const status = sub.status;
        const tier = sub.metadata?.tier ?? (status === 'active' ? 'premium' : f.subscriptionTier);

        await db
          .update(families)
          .set({
            subscriptionTier: status === 'active' ? tier : (status === 'canceled' || status === 'unpaid' ? 'free' : f.subscriptionTier),
          })
          .where(eq(families.id, f.id));

        console.log(`Updated family ${f.id} subscription status ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;

        await db
          .update(families)
          .set({
            subscriptionTier: 'free',
            stripeSubscriptionId: null,
          })
          .where(eq(families.stripeSubscriptionId, subscriptionId));

        console.log(`Family subscription ${subscriptionId} deleted, set to free`);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).send('Webhook handler failed');
  }
}
