/**
 * visitorCounter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tracks unique daily visitors by contacting our secure MongoDB-backed backend
 * API (/api/visits). This ensures CORS compliance and completely bypasses adblockers
 * since it's hosted on our own domain.
 *
 * PRIVATE — this file is only used internally and the admin route is hidden.
 */

// Once-per-day dedup so page refreshes don't inflate the count
const LS_LAST_PING = 'namma_last_ping_day';

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Increments the counter by 1 (once per calendar day per device).
 * Fires silently — errors are swallowed so they never affect the app.
 */
export async function pingVisit() {
  try {
    const today = todayStr();
    const last  = localStorage.getItem(LS_LAST_PING);
    if (last === today) return; // already pinged today

    // Ping our API to register the visit
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      localStorage.setItem(LS_LAST_PING, today);
    }
  } catch {
    // silently ignore — counter is non-critical
  }
}

/**
 * Fetches the current total visit count and today's visit count from MongoDB.
 * Returns an object with { total, today }, or nulls on failure.
 */
export async function fetchVisitCounts() {
  try {
    const res = await fetch('/api/visits');
    if (!res.ok) throw new Error('API failed');

    const json = await res.json();
    return {
      total: typeof json.total === 'number' ? json.total : null,
      today: typeof json.today === 'number' ? json.today : null
    };
  } catch {
    return { total: null, today: null };
  }
}

