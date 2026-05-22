import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripeKey = process.env['STRIPE_SECRET_KEY'];
  const serviceAccount = process.env['FIREBASE_SERVICE_ACCOUNT'];

  if (!stripeKey || !serviceAccount) {
    return res.status(500).json({ error: 'Missing required env vars' });
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  }

  const stripe = new Stripe(stripeKey);

  const { uid } = req.body ?? {};
  if (!uid) return res.status(400).json({ error: 'Missing uid' });

  try {
    const db = getFirestore();
    const snap = await db.collection('users').doc(uid).get();
    const stripeCustomerId = snap.data()?.['stripeCustomerId'];

    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${req.headers.origin}/membership`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
