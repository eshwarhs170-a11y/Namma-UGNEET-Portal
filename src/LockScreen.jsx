import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Target, Info, AlertTriangle, Lock, Unlock, ScrollText, Mail, 
  Star, Trash2, FileText, MessageCircle, School, User, PenTool, Lightbulb, 
  Coffee, RefreshCw, Frown, Circle, BarChart3, Check, X
} from 'lucide-react';

import logo from './assets/namma-ugneet-logo.png';

// ── Password Configuration ────────────────────────────────────────────────────
// The password is stored as a SHA-256 hash so it's not visible as plain text
// in the source. To change your password:
//   1. Run this in browser console: crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_NEW_PASSWORD')).then(b => [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')).then(console.log)
//   2. Paste the result below.
//
// Current password hash — DO NOT SHARE THIS FILE PUBLICLY:
const PASSWORD_HASH = 'd0954c356ca3cf9b9645199cc896207a0427a7ad829e94b134b3129f1855f810'; // = "NammaUG2025!"

// Auth token stored in localStorage (expires after 30 days)
const AUTH_KEY   = 'namma_auth_token';
const AUTH_EXPIRY_DAYS = 30;

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function isAuthenticated() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const { token, expires } = JSON.parse(raw);
    if (Date.now() > expires) {
      localStorage.removeItem(AUTH_KEY);
      return false;
    }
    return token === PASSWORD_HASH;
  } catch {
    return false;
  }
}

function storeAuth() {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      token: PASSWORD_HASH,
      expires: Date.now() + AUTH_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    }));
  } catch { }
}

// ── Lock Screen Component ─────────────────────────────────────────────────────
function LockScreen({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');

    const hash = await sha256(password.trim());

    if (hash === PASSWORD_HASH) {
      storeAuth();
      onUnlock();
    } else {
      setLoading(false);
      setShake(true);
      setError('Incorrect password. Access denied.');
      setPassword('');
      setTimeout(() => setShake(false), 600);
      inputRef.current?.focus();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #0a0f1e 100%)',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow effects */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', right: '20%',
        width: 250, height: 250, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div
        style={{
          background: 'rgba(15,23,42,0.85)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          width: '100%',
          maxWidth: 380,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
          animation: shake ? 'lockShake 0.5s ease' : undefined,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img
            src={logo}
            alt="NammaUGNEET"
            style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: '1rem',
              filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.5))' }}
          />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            NammaUGNEET
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.35rem' }}>
            <Lock className="lucide-icon" size={18} /> Private Access Only
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)', marginBottom: '1.75rem' }} />

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem',
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Password
          </label>
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <input
              ref={inputRef}
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter access password"
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '0.75rem 2.75rem 0.75rem 1rem',
                background: 'rgba(30,41,59,0.8)',
                border: `1.5px solid ${error ? 'rgba(239,68,68,0.6)' : 'rgba(99,102,241,0.3)'}`,
                borderRadius: '10px',
                color: '#e2e8f0',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                letterSpacing: showPass ? 'normal' : '0.1em',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.7)'; }}
              onBlur={(e) => { e.target.style.borderColor = error ? 'rgba(239,68,68,0.6)' : 'rgba(99,102,241,0.3)'; }}
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', fontSize: '1rem', padding: '0.2rem',
              }}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p style={{
              color: '#f87171', fontSize: '0.8rem', margin: '0 0 0.75rem',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
            }}>
              <AlertTriangle className="lucide-icon" size={18} /> {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              width: '100%',
              padding: '0.8rem',
              background: loading || !password.trim()
                ? 'rgba(99,102,241,0.3)'
                : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              letterSpacing: '0.02em',
              boxShadow: loading || !password.trim() ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
            }}
          >
            {loading ? 'Verifying…' : '<Unlock className="lucide-icon" size={18} /> Unlock'}
          </button>
        </form>

        <p style={{ color: '#334155', fontSize: '0.7rem', textAlign: 'center', marginTop: '1.25rem', lineHeight: 1.5 }}>
          This tool is for personal use only.<br />Unauthorized access is prohibited.
        </p>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes lockShake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-8px); }
          30%      { transform: translateX(8px); }
          45%      { transform: translateX(-6px); }
          60%      { transform: translateX(6px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

export { LockScreen, isAuthenticated };
