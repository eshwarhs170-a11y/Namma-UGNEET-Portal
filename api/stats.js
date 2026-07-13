/**
 * api/stats.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns distinct values for dropdowns (years, categories, streams, etc.)
 * so the frontend can populate its filters without loading all the data.
 *
 * GET /api/stats?dataset=KEA
 */

import { connectToDatabase } from './lib/db.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('colleges');

    const dataset = req.query.dataset || 'KEA';
    if (dataset !== 'KEA' && dataset !== 'AIQ') {
      return res.status(400).json({ error: 'Dataset must be KEA or AIQ' });
    }

    // Cache the stats for 12 hours since they rarely change
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=86400');

    // Fetch distinct values for dropdowns in parallel
    const [years, streams, categories, rounds, quotas] = await Promise.all([
      collection.distinct('year', { dataset }),
      collection.distinct('stream', { dataset }),
      collection.distinct('category', { dataset }),
      collection.distinct('round', { dataset }),
      dataset === 'AIQ' ? collection.distinct('quota', { dataset }) : Promise.resolve([]),
    ]);

    return res.status(200).json({
      years: years.filter(Boolean).sort(),
      streams: streams.filter(Boolean).sort(),
      categories: categories.filter(Boolean).sort(),
      rounds: rounds.filter(Boolean).sort(),
      quotas: quotas.filter(Boolean).sort(),
    });
  } catch (err) {
    console.error('API /api/stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
