/**
 * api/lib/db.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared MongoDB connection helper for Vercel serverless functions.
 *
 * Uses connection pooling so each warm invocation reuses the same client
 * instead of opening a new TCP+TLS handshake every request (~300 ms saved).
 *
 * Requires MONGODB_URI env var set in Vercel dashboard.
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'nammaugneet';

if (!MONGODB_URI) {
  throw new Error(
    'MONGODB_URI environment variable is not set. ' +
    'Add it in Vercel Dashboard → Settings → Environment Variables.'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during local development and API Route usage.
 */
let cached = global._mongoCache;

if (!cached) {
  cached = global._mongoCache = { client: null, db: null, promise: null };
}

/**
 * Returns a reusable { client, db } pair.
 * On cold start, connects and caches. On warm invocations, returns cached.
 */
async function connectToDatabase() {
  if (cached.client && cached.db) {
    return { client: cached.client, db: cached.db };
  }

  if (!cached.promise) {
    const client = new MongoClient(MONGODB_URI, {
      // Serverless-friendly pool settings
      maxPoolSize: 10,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    cached.promise = client.connect();
  }

  const client = await cached.promise;
  const db = client.db(DB_NAME);

  cached.client = client;
  cached.db = db;

  return { client, db };
}

export { connectToDatabase };
