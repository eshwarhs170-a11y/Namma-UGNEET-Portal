/**
 * visitorCounter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tracks unique daily visitors by contacting our secure MongoDB-backed backend
 * API (/api/visits). This ensures CORS compliance and completely bypasses adblockers
 * since it's hosted on our own domain.
 */

// Once-ever dedup so page refreshes don't inflate the count
const LS_HAS_PINGED = 'namma_has_pinged_ever';

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Increments the counter by 1 (once per device ever).
 * Fires silently — errors are swallowed so they never affect the app.
 */
export async function pingVisit() {
  try {
    if (localStorage.getItem(LS_HAS_PINGED)) return; // already pinged ever on this device

    // Ping our API to register the visit
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      localStorage.setItem(LS_HAS_PINGED, 'true');
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

const LS_HAS_INSTALLED = 'namma_has_installed';

export async function pingInstall() {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'app_installed', {
        event_category: 'engagement'
      });
    }
    
    if (localStorage.getItem(LS_HAS_INSTALLED)) return;

    const res = await fetch('/api/installs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      localStorage.setItem(LS_HAS_INSTALLED, 'true');
    }
  } catch {
    // silently ignore
  }
}

export async function fetchInstallCounts() {
  try {
    const res = await fetch('/api/installs');
    if (!res.ok) throw new Error('API failed');

    const json = await res.json();
    return {
      total: typeof json.total === 'number' ? json.total : null
    };
  } catch {
    return { total: null };
  }
}

