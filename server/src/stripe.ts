import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
export const stripe =
  stripeSecret && stripeSecret !== 'YOUR_STRIPE_SECRET_KEY'
    ? new Stripe(stripeSecret, { apiVersion: '2023-10-16' })
    : null;
