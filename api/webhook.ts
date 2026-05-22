import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const config = { api: { bodyParser: false } };

function getRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripeKey = process.env['STRIPE_SECRET_KEY'];
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
  const serviceAccount = process.env['FIREBASE_SERVICE_ACCOUNT'];

  if (!stripeKey || !webhookSecret || !serviceAccount) {
    return res.status(500).json({ error: 'Missing required env vars' });
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  }

  const stripe = new Stripe(stripeKey);
  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const db = getFirestore();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const uid = session.metadata?.['firebaseUid'];
    if (uid) {
      await db.collection('users').doc(uid).set(
        { membershipActive: true, stripeCustomerId: session.customer },
        { merge: true }
      );
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const uid = sub.metadata?.['firebaseUid'];
    if (uid) {
      await db.collection('users').doc(uid).set(
        { membershipActive: false },
        { merge: true }
      );
    }
  }

  res.json({ received: true });
}
