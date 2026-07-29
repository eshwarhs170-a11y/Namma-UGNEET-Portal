import { connectToDatabase } from './lib/db.js';
import crypto from 'crypto';

// Hash function to protect user privacy (MD5 is fast and sufficient for hashing IP)
function hashIp(ip) {
  return crypto.createHash('md5').update(ip).digest('hex');
}

export default async function handler(req, res) {
  // CORS headers
  const allowedOrigins = ['https://namma-ugneet-portal.vercel.app', 'http://localhost:5173', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://namma-ugneet-portal.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const installsCollection = db.collection('installs');

    // Ensure unique index on hash to prevent duplicate entries
    await installsCollection.createIndex({ hash: 1 }, { unique: true });

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

    if (req.method === 'POST') {
      const hash = hashIp(clientIp);
      
      try {
        await installsCollection.insertOne({
          hash,
          createdAt: new Date()
        });
      } catch (insertError) {
        if (insertError.code !== 11000) {
          throw insertError;
        }
      }

      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
      const total = await installsCollection.estimatedDocumentCount();
      return res.status(200).json({ total });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/installs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
