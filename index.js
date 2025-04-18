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

  // Only process completed transactions
  if (data.status === 'completed') {
    const amount = parseFloat(data.amount);
    const address = data.source_currency;
    const timestamp = Date.now();

    try {
      // Update User Balance (Replace "user_id_here" with your logic later)
      const balanceRef = db.ref('users/user_id_here/balance');
      const historyRef = db.ref('users/user_id_here/deposit_history');

      // Updating balance
      const snapshot = await balanceRef.once('value');
      const currentBalance = snapshot.val() || 0;
      await balanceRef.set(currentBalance + amount);

      // Adding transaction to history
      await historyRef.push({
        amount,
        address,
        timestamp
      });

      console.log('✅ Balance and history updated successfully');
      res.status(200).send('Success');
    } catch (error) {
      console.error('❌ Error updating Firebase:', error);
      res.status(500).send('Server Error');
    }
  } else {
    console.log('Transaction not completed, skipping...');
    res.status(200).send('Skipped');
  }
});

// Server Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
});
