import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import admin from 'firebase-admin';

// Initialize Firebase Admin if environment variables are present
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
  }
} else {
  console.warn('⚠️ Firebase Admin NOT initialized. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
  if (process.env.NODE_ENV === 'production') {
    console.warn('Production mode: TV Login features will be restricted to Guest mode.');
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to generate a custom token for TV login
  app.post('/api/generate-custom-token', async (req, res) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).send('Missing uid');

    if (!admin.apps.length) {
      return res.status(503).send('Firebase Admin not configured');
    }

    try {
      const customToken = await admin.auth().createCustomToken(uid);
      res.json({ customToken });
    } catch (error) {
      console.error('Error generating custom token:', error);
      res.status(500).send('Failed to generate token');
    }
  });

  // Proxy route to fetch images/audio from Firebase Storage and return as base64
  // This bypasses CORS issues on the client
  app.get('/api/proxy-file', async (req, res) => {
    const fileUrl = req.query.url as string;
    if (!fileUrl) {
      return res.status(400).send('Missing url parameter');
    }

    try {
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const contentType = response.headers['content-type'];
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      res.json({ base64, contentType });
    } catch (error) {
      console.error('Proxy Error:', error);
      res.status(500).send('Failed to fetch file');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
