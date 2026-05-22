import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] as string);

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env['FIREBASE_SERVICE_ACCOUNT'] as string)),
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

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
