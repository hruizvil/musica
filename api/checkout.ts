import Stripe from 'stripe';

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] as string);
const PRICE_ID = process.env['STRIPE_PRICE_ID'] as string;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const { uid, email } = req.body ?? {};
  if (!uid || !email) return res.status(400).json({ error: 'Missing uid or email' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${req.headers.origin}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/membership`,
      customer_email: email,
      metadata: { firebaseUid: uid },
      subscription_data: { metadata: { firebaseUid: uid } },
    });
    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
