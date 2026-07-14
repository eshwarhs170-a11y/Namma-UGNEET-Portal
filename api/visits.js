import { connectToDatabase } from './lib/db.js';
import crypto from 'crypto';

// Hash function to protect user privacy (MD5 is fast and sufficient for hashing IP + date)
function hashIpDate(ip, dateStr) {
  return crypto.createHash('md5').update(`${ip}-${dateStr}`).digest('hex');
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const visitsCollection = db.collection('visits');

    // Ensure unique index on hash to prevent duplicate entries
    await visitsCollection.createIndex({ hash: 1 }, { unique: true });
    await visitsCollection.createIndex({ date: 1 });

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const today = getTodayStr();

    if (req.method === 'POST') {
      const hash = hashIpDate(clientIp, today);
      
      try {
        // Attempt to insert. If hash already exists, it throws a duplicate key error
        // which means the user already visited today. We just ignore it safely.
        await visitsCollection.insertOne({
          hash,
          date: today,
          createdAt: new Date()
        });
      } catch (insertError) {
        // 11000 is MongoDB duplicate key error code
        if (insertError.code !== 11000) {
          throw insertError;
        }
      }

      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
      // Calculate total visits and today's visits
      const [total, todayCount] = await Promise.all([
        visitsCollection.estimatedDocumentCount(), // super fast metadata count
        visitsCollection.countDocuments({ date: today })
      ]);

      // Return formatted counts
      return res.status(200).json({
        total,
        today: todayCount
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/visits error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
