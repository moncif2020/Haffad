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

const rateLimitMap = new Map<string, { 
  count: number; 
  resetTime: number 
}>();

function checkRateLimit(
  ip: string, 
  maxRequests: number, 
  windowMs: number
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { 
      count: 1, 
      resetTime: now + windowMs 
    });
    return true;
  }
  if (record.count >= maxRequests) return false;
  record.count++;
  return true;
}

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((value, key) => {
    if (now > value.resetTime) rateLimitMap.delete(key);
  });
}, 5 * 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN'); 
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.google-analytics.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.googleusercontent.com; " +
      "media-src 'self' blob: https://firebasestorage.googleapis.com https://*.everyayah.com https://everyayah.com https://mirrors.quranicaudio.com https://*.mp3quran.net; " +
      "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://www.google-analytics.com https://api.alquran.cloud https://api.quran.com https://*.everyayah.com https://everyayah.com https://mirrors.quranicaudio.com https://*.mp3quran.net; " +
      "frame-src 'self' https://*.firebaseapp.com https://*.firebaseio.com;"
    );
    next();
  });

  // API route to generate a custom token for TV login
  app.post('/api/generate-custom-token', async (req, res) => {
    const ip = req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 5, 60000)) {
      return res.status(429).json({ 
        error: 'Too many requests. Please wait a minute.' 
      });
    }

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
    const ip = req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 60, 60000)) {
      return res.status(429).json({ 
        error: 'Too many requests. Please wait a minute.' 
      });
    }

    const fileUrl = req.query.url as string;
    if (!fileUrl) {
      return res.status(400).send('Missing url parameter');
    }

    // SSRF Protection
    const allowedHost = 'firebasestorage.googleapis.com';
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(fileUrl);
    } catch {
      return res.status(400).send('Invalid URL format');
    }

    if (parsedUrl.hostname !== allowedHost || parsedUrl.protocol !== 'https:') {
      return res.status(403).send('Forbidden: Invalid URL source');
    }

    try {
      const response = await axios.get(parsedUrl.toString(), { 
        responseType: 'arraybuffer',
        timeout: 10000 // 10 seconds
      });
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
