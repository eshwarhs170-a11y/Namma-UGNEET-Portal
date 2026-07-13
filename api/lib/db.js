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

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'nammaugneet';

if (!MONGODB_URI) {
  throw new Error(
    'MONGODB_URI environment variable is not set. ' +
    'Add it in Vercel Dashboard → Settings → Environment Variables.'
  );
}

/** @type {MongoClient} */
let cachedClient = null;
/** @type {import('mongodb').Db} */
let cachedDb = null;

/**
 * Returns a reusable { client, db } pair.
 * On cold start, connects and caches. On warm invocations, returns cached.
 */
async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI, {
    // Serverless-friendly pool settings
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 10000,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  await client.connect();
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

module.exports = { connectToDatabase, DB_NAME };
