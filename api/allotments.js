/**
 * api/allotments.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Main API endpoint for querying allotment data from MongoDB.
 *
 * GET /api/allotments?dataset=KEA&stream=MEDICAL&category=GM&year=2025&page=1
 *
 * Query Parameters:
 *   dataset   — 'KEA' | 'AIQ' (required)
 *   stream    — 'MEDICAL' | 'DENTAL' | 'AYUSH' | 'MEDICAL_DENTAL'
 *   category  — 'GM', 'SC', 'OBC', 'Open', 'EWS', etc.
 *   year      — '2024', '2025'
 *   round     — 'R1', 'R2', 'R3', 'STRAY'
 *   quota     — AIQ quota filter (e.g. 'All India', 'Open Seat Quota')
 *   search    — text search on collegeName / collegeCode
 *   minRank   — minimum rank (for predictor)
 *   maxRank   — maximum rank (for predictor)
 *   sort      — field to sort by (default: 'rank')
 *   order     — 'asc' | 'desc' (default: 'asc')
 *   page      — page number (default: 1)
 *   limit     — records per page (default: 50, max: 200)
 *   maxBudget — maximum fees filter
 *
 * Response:
 *   { data: [...], total: 1234, page: 1, totalPages: 25 }
 */

import { connectToDatabase } from './lib/db.js';

// ── Rate Limiting (in-memory, per serverless instance) ───────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 120; // requests per window per IP

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// Clean up stale entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS * 2);

// ── Input Sanitization ───────────────────────────────────────────────────────
const ALLOWED_DATASETS = new Set(['KEA', 'AIQ']);
const ALLOWED_STREAMS = new Set(['MEDICAL', 'DENTAL', 'AYUSH', 'MEDICAL_DENTAL']);
const ALLOWED_SORT_FIELDS = new Set(['rank', 'collegeName', 'collegeCode', 'fees', 'year', 'round', 'category', 'stream']);
const ALLOWED_ORDER = new Set(['asc', 'desc']);

function sanitizeString(str, maxLen = 200) {
  if (!str || typeof str !== 'string') return null;
  // Remove any MongoDB operators ($ prefix) to prevent injection
  return str.replace(/[${}]/g, '').trim().slice(0, maxLen);
}

function sanitizeInt(val, min, max, fallback) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// ── Handler ──────────────────────────────────────────────────────────────────
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

  // Rate limiting
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('colleges');

    // ── Parse & validate query params ──
    const {
      dataset, stream, category, year, round, quota,
      search, minRank, maxRank, sort, order, page, limit, maxBudget,
    } = req.query;

    // Dataset is required
    const safeDataset = sanitizeString(dataset);
    if (!safeDataset || !ALLOWED_DATASETS.has(safeDataset)) {
      return res.status(400).json({ error: 'Invalid or missing "dataset" parameter. Must be "KEA" or "AIQ".' });
    }

    // Build MongoDB filter
    const filter = { dataset: safeDataset };

    const safeStream = sanitizeString(stream);
    if (safeStream && ALLOWED_STREAMS.has(safeStream)) {
      filter.stream = safeStream;
    }

    const safeCategory = sanitizeString(category);
    if (safeCategory) {
      filter.category = safeCategory;
    }

    // College code exact match (for college detail modal)
    const safeCollegeCode = sanitizeString(req.query.collegeCode, 20);
    if (safeCollegeCode) {
      filter.collegeCode = safeCollegeCode;
    }

    const safeYear = sanitizeString(year);
    if (safeYear && /^\d{4}$/.test(safeYear)) {
      filter.year = safeYear;
    }

    const safeRound = sanitizeString(round);
    if (safeRound && safeRound !== 'ALL') {
      filter.round = safeRound;
    }

    const safeQuota = sanitizeString(quota);
    if (safeQuota && safeQuota !== 'ALL') {
      filter.quota = safeQuota;
    }

    // Rank range for predictor
    const safeMinRank = sanitizeInt(minRank, 1, 9999999, null);
    const safeMaxRank = sanitizeInt(maxRank, 1, 9999999, null);
    if (safeMinRank !== null || safeMaxRank !== null) {
      filter.rank = {};
      if (safeMinRank !== null) filter.rank.$gte = safeMinRank;
      if (safeMaxRank !== null) filter.rank.$lte = safeMaxRank;
    }

    // Budget filter
    const safeBudget = sanitizeInt(maxBudget, 0, 100000000, null);
    if (safeBudget !== null) {
      filter.$or = [
        { fees: { $lte: safeBudget } },
        { fees: null },
        { fees: { $exists: false } },
      ];
    }

    // Text search on college name / code
    const safeSearch = sanitizeString(search, 100);
    if (safeSearch && safeSearch.length >= 2) {
      const searchTerms = safeSearch.split(/[\s,]+/).filter(t => t.length > 0);
      if (searchTerms.length > 0) {
        const termConditions = searchTerms.map(term => {
          const escapedSearch = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return {
            $or: [
              { collegeName: { $regex: escapedSearch, $options: 'i' } },
              { collegeCode: { $regex: escapedSearch, $options: 'i' } },
            ]
          };
        });
        filter.$and = [
          ...(filter.$and || []),
          ...termConditions
        ];
      }
    }

    // Sorting
    const safeSortField = (sort && ALLOWED_SORT_FIELDS.has(sort)) ? sort : 'rank';
    const safeSortOrder = (order && ALLOWED_ORDER.has(order)) ? order : 'asc';
    const sortObj = { [safeSortField]: safeSortOrder === 'asc' ? 1 : -1 };

    // Pagination
    const safeLimit = sanitizeInt(limit, 1, 10000, 50);
    const safePage = sanitizeInt(page, 1, 100000, 1);
    const skip = (safePage - 1) * safeLimit;

    // Execute query
    const [data, total] = await Promise.all([
      collection.find(filter).sort(sortObj).skip(skip).limit(safeLimit).toArray(),
      collection.countDocuments(filter),
    ]);

    // Strip MongoDB _id from response
    const cleanData = data.map(({ _id, ...rest }) => rest);

    // Cache for 5 minutes (data rarely changes)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({
      data: cleanData,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
      limit: safeLimit,
    });
  } catch (err) {
    console.error('API /api/allotments error:', err);
    return res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
};
