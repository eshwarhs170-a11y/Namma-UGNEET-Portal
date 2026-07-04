import React, { useState, useMemo, useEffect, useRef } from 'react';
import medicalData from '../../dataprocessing/output/compiled_allotments.json';
import logo from '../assets/namma-ugneet-logo.png';
import './Dashboard.css';

const SAVED_KEY = 'namma_saved_colleges';
const makeId = (item) => `${item.stream}-${item.round}-${item.serialNo}-${item.category}`;

export default function Dashboard() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState('explore');
  const [showEdgeHint, setShowEdgeHint] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowEdgeHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // --- Feature tour: a quick guided walkthrough of what's on the page ---
  const TOUR_KEY = 'namma_tour_seen';
  const tourSteps = [
    { title: '🎯 Quick Predict', body: 'Enter your NEET rank right on this page to jump straight into the Smart College Predictor.' },
    { title: '🎚️ Quick Filters', body: 'Search by name, filter by stream, category, round, and budget — all update the table live.' },
    { title: '☆ Save Colleges', body: 'Tap the star on any row or predictor card to bookmark it. Saved colleges show up in the sidebar.' },
    { title: '☰ Sidebar', body: 'Use the edge handle (top-left) to open the sidebar anytime for live stats and your saved list.' },
  ];
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) {
        setTourOpen(true);
      }
    } catch {
      // localStorage unavailable — skip auto-tour, manual button still works
    }
  }, []);

  const closeTour = () => {
    setTourOpen(false);
    setTourStep(0);
    try { localStorage.setItem(TOUR_KEY, 'true'); } catch { /* ignore */ }
  };
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 881px)').matches; // open by default on desktop, closed on mobile
  });
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1200 : window.innerWidth
  );
  const userToggledRef = useRef(false);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setViewportWidth(w);
      // Keep the sidebar in sync with screen size automatically —
      // but stop doing that the moment the user manually opens/closes it themselves.
      if (!userToggledRef.current) {
        setSidebarOpen(w >= 881);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // matches the sidebar's own responsive width rules in Dashboard.css
  const sidebarWidthPx = viewportWidth <= 420 ? Math.min(viewportWidth * 0.88, 300) : 280;

  // Search & Filter State variables
  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState('MEDICAL');
  const [categoryFilter, setCategoryFilter] = useState('GM');
  const [maxBudget, setMaxBudget] = useState(1500000);
  const [roundFilter, setRoundFilter] = useState('ALL');

  // Rank Predictor Input State variables
  const [userRank, setUserRank] = useState('');
  const [predictorCategory, setPredictorCategory] = useState('GM');
  const [predictorStream, setPredictorStream] = useState('MEDICAL');
  const [predictorRound, setPredictorRound] = useState('R1');

  // Saved / bookmarked colleges — persisted across sessions
  const [savedColleges, setSavedColleges] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(savedColleges));
    } catch {
      // storage unavailable — saved list just won't persist this session
    }
  }, [savedColleges]);

  const isSaved = (item) => savedColleges.some((s) => s.id === makeId(item));

  const toggleSave = (item) => {
    const id = makeId(item);
    setSavedColleges((prev) =>
      prev.some((s) => s.id === id)
        ? prev.filter((s) => s.id !== id)
        : [...prev, { id, ...item }]
    );
  };

  const removeSaved = (id) => setSavedColleges((prev) => prev.filter((s) => s.id !== id));

  // --- UNIQUE DROPDOWN OPTIONS LIST GENERATORS ---
  const dynamicCategories = useMemo(() => {
    const categoriesSet = new Set(medicalData.map((item) => item.category));
    return Array.from(categoriesSet).sort();
  }, []);

  const dynamicRounds = useMemo(() => {
    const roundsSet = new Set(medicalData.map((item) => item.round));
    return Array.from(roundsSet).sort();
  }, []);

  // --- ENGINE 1: MAIN SEARCH & FILTER DATAVIEW PIPELINE ---
  const filteredDashboardData = useMemo(() => {
    return medicalData
      .filter((item) => {
        const matchSearch =
          item.collegeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.collegeCode.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStream = item.stream === streamFilter;
        const matchCategory = item.category === categoryFilter;
        const matchBudget = item.fees <= maxBudget;
        const matchRound = roundFilter === 'ALL' || item.round === roundFilter;

        return matchSearch && matchStream && matchCategory && matchBudget && matchRound;
      })
      .sort((a, b) => a.rank - b.rank);
  }, [searchQuery, streamFilter, categoryFilter, maxBudget, roundFilter]);

  // --- ENGINE 2: SMART NEET SEAT PREDICTOR ALGORITHM ---
  const predictedColleges = useMemo(() => {
    if (!userRank || isNaN(userRank)) return [];
    const targetRank = parseInt(userRank, 10);

    return medicalData
      .filter((item) => {
        const matchStream = item.stream === predictorStream;
        const matchCategory = item.category === predictorCategory;
        const matchRound = predictorRound === 'ALL' || item.round === predictorRound;
        const matchRankScope = item.rank >= targetRank;

        return matchStream && matchCategory && matchRound && matchRankScope;
      })
      .sort((a, b) => a.rank - b.rank);
  }, [userRank, predictorCategory, predictorStream, predictorRound]);

  // --- Quick stats for sidebar ---
  const avgFeesShown = useMemo(() => {
    const list = activeTab === 'predictor' ? predictedColleges : filteredDashboardData;
    if (list.length === 0) return 0;
    const total = list.reduce((sum, item) => sum + item.fees, 0);
    return Math.round(total / list.length);
  }, [filteredDashboardData, predictedColleges, activeTab]);

  return (
    <div className="app-shell">

      {/* FEATURE TOUR OVERLAY */}
      {tourOpen && (
        <div className="tour-backdrop" onClick={closeTour}>
          <div className="tour-card" onClick={(e) => e.stopPropagation()}>
            <div className="tour-dots">
              {tourSteps.map((_, i) => (
                <span key={i} className={`tour-dot${i === tourStep ? ' active' : ''}`} />
              ))}
            </div>
            <h3>{tourSteps[tourStep].title}</h3>
            <p>{tourSteps[tourStep].body}</p>
            <div className="tour-actions">
              <button className="tour-skip" onClick={closeTour}>Skip</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {tourStep > 0 && (
                  <button className="tour-back" onClick={() => setTourStep((s) => s - 1)}>Back</button>
                )}
                {tourStep < tourSteps.length - 1 ? (
                  <button className="tour-next" onClick={() => setTourStep((s) => s + 1)}>Next</button>
                ) : (
                  <button className="tour-next" onClick={closeTour}>Got it</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOUR RELAUNCH BUTTON */}
      <button className="tour-fab" onClick={() => { setTourStep(0); setTourOpen(true); }}>
        ✨ Tour
      </button>

      {/* BACKDROP (mobile only, dims content behind the open sidebar) */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => { userToggledRef.current = true; setSidebarOpen(false); }} />}

      {/* EDGE HANDLE — always present so the sidebar can be reopened once closed */}
      <button
        className={`sidebar-edge-handle${showEdgeHint ? ' hint-pulse' : ''}`}
        style={{ left: sidebarOpen ? `${sidebarWidthPx}px` : '0px' }}
        onClick={() => { userToggledRef.current = true; setSidebarOpen((prev) => !prev); setShowEdgeHint(false); }}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <img src={logo} alt="" className="edge-logo" />
        <span className="edge-chevron">{sidebarOpen ? '‹' : '›'}</span>
        <span className="edge-tooltip">{sidebarOpen ? 'Hide menu' : 'Open menu'}</span>
      </button>

      {/* SIDEBAR */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ' closed'}`}>

        <div className="sidebar-top">
          <div className="sidebar-brand">
            <img src={logo} alt="NammaUGNEET" className="brand-mark" />
            <div>
              <div className="brand-name">NammaUGNEET</div>
              <div className="brand-tag">KEA Allotment Portal</div>
            </div>
          </div>
          <button className="sidebar-close" onClick={() => { userToggledRef.current = true; setSidebarOpen(false); }} aria-label="Close sidebar">✕</button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={activeTab === 'explore' ? 'active' : ''}
            onClick={() => {
              setActiveTab('explore');
              if (window.matchMedia('(max-width: 880px)').matches) setSidebarOpen(false);
            }}
          >
            🔍 Explore Cutoffs &amp; Fees
          </button>
          <button
            className={`predictor${activeTab === 'predictor' ? ' active' : ''}`}
            onClick={() => {
              setActiveTab('predictor');
              if (window.matchMedia('(max-width: 880px)').matches) setSidebarOpen(false);
            }}
          >
            🎯 Smart College Predictor
          </button>
        </nav>

        <div className="sidebar-section">
          <h4>Quick Stats</h4>
          <div className="stat-row"><span>Total Records</span><span>{medicalData.length.toLocaleString('en-IN')}</span></div>
          <div className="stat-row">
            <span>{activeTab === 'predictor' ? 'Predicted Matches' : 'Matching Filters'}</span>
            <span>{(activeTab === 'predictor' ? predictedColleges.length : filteredDashboardData.length).toLocaleString('en-IN')}</span>
          </div>
          <div className="stat-row"><span>Avg Fees (shown)</span><span>₹{avgFeesShown.toLocaleString('en-IN')}</span></div>
          <div className="stat-row"><span>Saved</span><span>{savedColleges.length}</span></div>
        </div>

        {activeTab === 'explore' && (
          <div className="sidebar-section">
            <h4>Filters</h4>

            <div className="field">
              <label>Search Institution</label>
              <input
                type="text"
                placeholder="Name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Course Stream</label>
              <select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
                <option value="MEDICAL">🟢 MBBS (Medical)</option>
                <option value="DENTAL">🔵 BDS (Dental)</option>
                <option value="AYUSH">🟤 AYUSH Streams</option>
              </select>
            </div>

            <div className="field">
              <label>KEA Quota Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {dynamicCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Counselling Round</label>
              <select value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)}>
                <option value="ALL">All Rounds</option>
                {dynamicRounds.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Max Fees: ₹{maxBudget.toLocaleString('en-IN')}</label>
              <input
                type="range"
                min="10000"
                max="1500000"
                step="10000"
                value={maxBudget}
                onChange={(e) => setMaxBudget(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
        )}

        <div className="sidebar-section saved-section">
          <h4>⭐ Saved Colleges ({savedColleges.length})</h4>
          {savedColleges.length === 0 ? (
            <p className="empty-hint">Tap the ☆ on any college to save it here.</p>
          ) : (
            <ul className="saved-list">
              {savedColleges.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>{s.collegeCode}</strong>
                    <span>{s.round} · {s.category} · ₹{s.fees.toLocaleString('en-IN')}</span>
                  </div>
                  <button onClick={() => removeSaved(s.id)} aria-label="Remove saved college">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">

        <header className="dash-header">
          <div className="dash-header-row">
            <img src={logo} alt="Namma-UGNEET" className="header-logo" />
            <div>
              <span className="dash-eyebrow">KEA Counselling · Live Dataset</span>
              <h1 className="dash-title">
                {activeTab === 'explore' ? 'Explore Cutoffs & Fees' : 'Smart College Predictor'}
              </h1>
            </div>
          </div>
          <p className="dash-subtitle">
            {activeTab === 'explore'
              ? 'Cutoff ranks, fees and seat allotments across Medical, Dental & AYUSH streams.'
              : 'Enter your rank to see which colleges you realistically qualify for.'}
          </p>
        </header>

        <div className="dash-panel">

          {/* --- FEATURE 1: EXPLORE --- */}
          {activeTab === 'explore' && (
            <div>
              <div className="predictor-teaser">
                <div className="predictor-teaser-text">
                  <h3>🎯 Not sure where you stand?</h3>
                  <p>Enter your NEET rank and jump straight to the Smart College Predictor.</p>
                </div>
                <div className="predictor-teaser-action">
                  <input
                    type="number"
                    placeholder="Enter rank"
                    value={userRank}
                    onChange={(e) => setUserRank(e.target.value)}
                  />
                  <button onClick={() => setActiveTab('predictor')}>Predict My Colleges →</button>
                </div>
              </div>

              {!sidebarOpen && (
                <div className="filter-card inline-filters">
                  <h3>Quick Filters</h3>
                  <div className="filter-grid">
                    <div className="field">
                      <label>Search Institution</label>
                      <input
                        type="text"
                        placeholder="Enter name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Course Stream</label>
                      <select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
                        <option value="MEDICAL">🟢 MBBS (Medical)</option>
                        <option value="DENTAL">🔵 BDS (Dental)</option>
                        <option value="AYUSH">🟤 AYUSH Streams</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>KEA Quota Category</label>
                      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        {dynamicCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Counselling Round</label>
                      <select value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)}>
                        <option value="ALL">All Rounds</option>
                        {dynamicRounds.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Max Fees: ₹{maxBudget.toLocaleString('en-IN')}</label>
                      <input
                        type="range"
                        min="10000"
                        max="1500000"
                        step="10000"
                        value={maxBudget}
                        onChange={(e) => setMaxBudget(parseInt(e.target.value, 10))}
                      />
                    </div>
                  </div>
                </div>
              )}

              <p className="results-summary">
                📊 Found <strong>{filteredDashboardData.length}</strong> matching college allotment paths.
              </p>

              <div className="table-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th></th>
                      <th>KEA Code</th>
                      <th>College Name</th>
                      <th>Course</th>
                      <th>Category</th>
                      <th>Annual Fees</th>
                      <th>Cutoff Rank</th>
                      <th>Round</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDashboardData.length === 0 ? (
                      <tr className="empty-row">
                        <td colSpan="8">No allotment matching your criteria found. Adjust filters.</td>
                      </tr>
                    ) : (
                      filteredDashboardData.slice(0, 100).map((item, i) => (
                        <tr key={i}>
                          <td>
                            <button
                              className={`star-btn${isSaved(item) ? ' saved' : ''}`}
                              onClick={() => toggleSave(item)}
                              aria-label="Save college"
                            >
                              {isSaved(item) ? '★' : '☆'}
                            </button>
                          </td>
                          <td className="code-cell">{item.collegeCode}</td>
                          <td style={{ maxWidth: '380px' }}>{item.collegeName}</td>
                          <td><span className="pill">{item.courseDetails}</span></td>
                          <td>{item.category}</td>
                          <td className="fees-cell">₹{item.fees.toLocaleString('en-IN')}</td>
                          <td><span className="rank-pill">{item.rank.toLocaleString('en-IN')}</span></td>
                          <td><span className="pill">{item.round}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredDashboardData.length > 100 && (
                <p className="truncate-note">Truncated at 100 entries for view performance. Refine filters to narrow results.</p>
              )}
            </div>
          )}

          {/* --- FEATURE 2: PREDICTOR --- */}
          {activeTab === 'predictor' && (
            <div>
              <button className="back-home-btn" onClick={() => setActiveTab('explore')}>
                ← Back to Explore
              </button>

              <div className="ticket-hero">
                <h3>🎯 Target Seat Predictor Matrix</h3>
                <p className="desc">Enter your parameters below. The algorithm matches your score against previous allotment thresholds to generate target seat listings.</p>

                <div className="predictor-grid">
                  <div className="field">
                    <label>Your All-India NEET Rank</label>
                    <input
                      type="number"
                      placeholder="e.g. 15420"
                      value={userRank}
                      onChange={(e) => setUserRank(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Stream Target</label>
                    <select value={predictorStream} onChange={(e) => setPredictorStream(e.target.value)}>
                      <option value="MEDICAL">MBBS (Medical)</option>
                      <option value="DENTAL">BDS (Dental)</option>
                      <option value="AYUSH">AYUSH Courses</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Reservation Category</label>
                    <select value={predictorCategory} onChange={(e) => setPredictorCategory(e.target.value)}>
                      {dynamicCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Counselling Round</label>
                    <select value={predictorRound} onChange={(e) => setPredictorRound(e.target.value)}>
                      <option value="ALL">All Rounds</option>
                      {dynamicRounds.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="predicted-heading">💡 Predicted Eligible Target Opportunities</h3>
                <p className="predicted-sub">
                  Colleges where <strong>{predictorRound === 'ALL' ? 'any round\'s' : predictorRound}</strong> closing cutoff scores matched higher than or equal to Rank <strong>{userRank || '0'}</strong>:
                </p>

                <div className="predicted-grid">
                  {predictedColleges.length === 0 ? (
                    <div className="empty-predict">
                      Enter your exact NEET Rank above to populate your custom eligible target mapping list.
                    </div>
                  ) : (
                    predictedColleges.map((item, idx) => {
                      const safetyMargin = item.rank - parseInt(userRank, 10);
                      let stampClass = 'safe';
                      let badgeText = 'Safe Match';

                      if (safetyMargin < 2000) {
                        stampClass = 'borderline';
                        badgeText = 'Borderline Chance';
                      } else if (safetyMargin < 8000) {
                        stampClass = 'moderate';
                        badgeText = 'Moderate Chance';
                      }

                      return (
                        <div key={idx} className="result-card">
                          <div className="result-top">
                            <span className="result-code">CODE: {item.collegeCode}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={`stamp ${stampClass}`}>{badgeText}</span>
                              <button
                                className={`star-btn${isSaved(item) ? ' saved' : ''}`}
                                onClick={() => toggleSave(item)}
                                aria-label="Save college"
                              >
                                {isSaved(item) ? '★' : '☆'}
                              </button>
                            </div>
                          </div>
                          <h4 className="result-name">{item.collegeName}</h4>
                          <p className="result-meta">Course: <strong>{item.courseDetails}</strong></p>
                          <p className="result-meta">Round: <strong>{item.round}</strong></p>
                          <p className="result-meta">Annual Cost: <strong>₹{item.fees.toLocaleString('en-IN')}</strong></p>
                          <div className="result-footer">
                            <span>Last Cutoff</span>
                            <span className="val">{item.rank.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}