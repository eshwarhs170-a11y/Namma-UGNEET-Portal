/**
 * visitorCounter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses https://api.counterapi.dev (free, no sign-up) to track unique daily
 * visitors. The namespace + key pair acts as a private identifier — only someone
 * who knows both can look up the count.
 *
 * PRIVATE — this file is only used internally and the admin route is hidden.
 */

// ── Config ────────────────────────────────────────────────────────────────────
const NAMESPACE = 'nammaugneet';      // change if you ever want to reset
const COUNTER_KEY = 'visits_v1';     // bump suffix to reset count
const BASE_URL = 'https://api.counterapi.dev/v1';

// Once-per-day dedup so page refreshes don't inflate the count
const LS_LAST_PING = 'namma_last_ping_day';

// ── Helpers ───────────────────────────────────────────────────────────────────
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
    if (last === today) return;           // already pinged today

    // Bump the all-time counter
    await fetch(`${BASE_URL}/${NAMESPACE}/${COUNTER_KEY}/up`, { mode: 'cors' }).catch(() => {});
    
    // Bump today's specific counter
    const todayKey = `visits_${today.replace(/-/g, '_')}`;
    await fetch(`${BASE_URL}/${NAMESPACE}/${todayKey}/up`, { mode: 'cors' }).catch(() => {});

    localStorage.setItem(LS_LAST_PING, today);
  } catch {
    // silently ignore — counter is non-critical
  }
}

/**
 * Fetches the current total visit count and today's visit count.
 * Returns an object with { total, today }, or nulls on failure.
 */
export async function fetchVisitCounts() {
  try {
    const today = todayStr();
    const todayKey = `visits_${today.replace(/-/g, '_')}`;

    const [totalRes, todayRes] = await Promise.all([
      fetch(`${BASE_URL}/${NAMESPACE}/${COUNTER_KEY}`, { mode: 'cors' }).catch(() => null),
      fetch(`${BASE_URL}/${NAMESPACE}/${todayKey}`, { mode: 'cors' }).catch(() => null)
    ]);

    let total = null;
    let todayCount = null;

    if (totalRes && totalRes.ok) {
      const json = await totalRes.json();
      total = typeof json.count === 'number' ? json.count : null;
    }
    
    if (todayRes && todayRes.ok) {
      const json = await todayRes.json();
      todayCount = typeof json.count === 'number' ? json.count : 0; // if missing, it's 0 today
    }

    return { total, today: todayCount };
  } catch {
    return { total: null, today: null };
  }
}
