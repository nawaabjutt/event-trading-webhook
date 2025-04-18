import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Firebase Initialization
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.database();

// Webhook Endpoint for Plisio
app.post('/plisio-webhook', async (req, res) => {
  const data = req.body;

  // ✅ Only process completed transactions
  if (data.status === 'completed') {
    const amount = parseFloat(data.amount);
    const address = data.wallet_hash;
    const timestamp = Date.now();
    const userId = data.order_name; // Assume this holds the UID

    try {
      // ✅ Firebase Paths
      const balanceRef = db.ref(`users/${userId}/balance`);
      const historyRef = db.ref(`users/${userId}/deposit_history`);

      // 🔁 Get current balance
      const snapshot = await balanceRef.once('value');
      const currentBalance = snapshot.val() || 0;

      // ✅ Update balance
      await balanceRef.set(currentBalance + amount);

      // ✅ Add to deposit history
      await historyRef.push({
        amount,
        address,
        timestamp
      });

      console.log(`✅ Deposit added for user ${userId}`);
      res.status(200).send('Success');
    } catch (error) {
      console.error('❌ Firebase Update Error:', error);
      res.status(500).send('Server Error');
    }
  } else {
    console.log('⏭️ Transaction skipped (not completed)');
    res.status(200).send('Skipped');
  }
});

// Server Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
});
