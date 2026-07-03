import React, { useState, useMemo } from 'react';
import medicalData from '../../dataprocessing/output/compiled_allotments.json';
import './Dashboard.css';

export default function Dashboard() {
  // Navigation & View State ('explore' = Search/Filter Tables, 'predictor' = Cutoff College Predictor)
  const [activeTab, setActiveTab] = useState('explore');

  // Search & Filter State variables
  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState('MEDICAL');
  const [categoryFilter, setCategoryFilter] = useState('GM');
  const [maxBudget, setMaxBudget] = useState(1500000); // 15 Lakhs default slider upper limit
  const [roundFilter, setRoundFilter] = useState('ALL'); // 'ALL' | 'R1' | 'R2' | 'R3'...

  // Rank Predictor Input State variables
  const [userRank, setUserRank] = useState('');
  const [predictorCategory, setPredictorCategory] = useState('GM');
  const [predictorStream, setPredictorStream] = useState('MEDICAL');
  const [predictorRound, setPredictorRound] = useState('R3'); // default to latest/final round for realistic predictions

  // --- UNIQUE DROPDOWN OPTIONS LIST GENERATORS ---
  const dynamicCategories = useMemo(() => {
    const categoriesSet = new Set(medicalData.map(item => item.category));
    return Array.from(categoriesSet).sort();
  }, []);

  const dynamicRounds = useMemo(() => {
    const roundsSet = new Set(medicalData.map(item => item.round));
    return Array.from(roundsSet).sort(); // R1, R2, R3...
  }, []);

  // --- ENGINE 1: MAIN SEARCH & FILTER DATAVIEW PIPELINE ---
  const filteredDashboardData = useMemo(() => {
    return medicalData.filter(item => {
      const matchSearch = item.collegeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.collegeCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStream = item.stream === streamFilter;
      const matchCategory = item.category === categoryFilter;
      const matchBudget = item.fees <= maxBudget;
      const matchRound = roundFilter === 'ALL' || item.round === roundFilter;

      return matchSearch && matchStream && matchCategory && matchBudget && matchRound;
    }).sort((a, b) => a.rank - b.rank); // Sort sequentially ascending by closing cutoff rank
  }, [searchQuery, streamFilter, categoryFilter, maxBudget, roundFilter]);

  // --- ENGINE 2: SMART NEET SEAT PREDICTOR ALGORITHM ---
  const predictedColleges = useMemo(() => {
    if (!userRank || isNaN(userRank)) return [];
    const targetRank = parseInt(userRank, 10);

    return medicalData.filter(item => {
      const matchStream = item.stream === predictorStream;
      const matchCategory = item.category === predictorCategory;
      const matchRound = item.round === predictorRound;
      // Predict seats where the closing cutoff rank was greater than or equal to the student's rank
      const matchRankScope = item.rank >= targetRank;

      return matchStream && matchCategory && matchRound && matchRankScope;
    }).sort((a, b) => a.rank - b.rank); // Sort closest target match up top
  }, [userRank, predictorCategory, predictorStream, predictorRound]);

  return (
    <div className="dash">

      {/* HEADER */}
      <header className="dash-header">
        <span className="dash-eyebrow">KEA Counselling · Live Dataset</span>
        <h1 className="dash-title">NammaUGNEET Allotment Portal</h1>
        <p className="dash-subtitle">Cutoff ranks, fees and seat predictions across Medical, Dental &amp; AYUSH streams.</p>
      </header>

      {/* NAV TABS */}
      <div className="dash-tabs">
        <button
          className={`dash-tab${activeTab === 'explore' ? ' active' : ''}`}
          onClick={() => setActiveTab('explore')}
        >
          🔍 <span className="label">Explore Cutoffs &amp; Fees</span>
        </button>
        <button
          className={`dash-tab predictor${activeTab === 'predictor' ? ' active' : ''}`}
          onClick={() => setActiveTab('predictor')}
        >
          🎯 <span className="label">Smart College Predictor</span>
        </button>
      </div>

      <div className="dash-panel">

        {/* --- FEATURE 1: VIEW/SEARCH/FILTER INTERFACE --- */}
        {activeTab === 'explore' && (
          <div>
            <div className="filter-card">
              <h3>Filter Configuration Options</h3>
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
                  <label>Select Course Stream</label>
                  <select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
                    <option value="MEDICAL">🟢 MBBS (Medical)</option>
                    <option value="DENTAL">🔵 BDS (Dental)</option>
                    <option value="AYUSH">🟤 AYUSH Streams</option>
                  </select>
                </div>

                <div className="field">
                  <label>KEA Quota Category</label>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    {dynamicCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
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

                <div className="field">
                  <label>Counselling Round</label>
                  <select value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)}>
                    <option value="ALL">All Rounds</option>
                    {dynamicRounds.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            <p className="results-summary">
              📊 Found <strong>{filteredDashboardData.length}</strong> matching college allotment paths.
            </p>

            <div className="table-wrap">
              <table className="ledger">
                <thead>
                  <tr>
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
                      <td colSpan="7">No allotment matching your criteria found. Adjust filters.</td>
                    </tr>
                  ) : (
                    filteredDashboardData.slice(0, 100).map((item, i) => (
                      <tr key={i}>
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

        {/* --- FEATURE 2: PROBABILITY NEET RANK PREDICTOR INTERFACE --- */}
        {activeTab === 'predictor' && (
          <div>
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
                    {dynamicCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Counselling Round</label>
                  <select value={predictorRound} onChange={(e) => setPredictorRound(e.target.value)}>
                    {dynamicRounds.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="predicted-heading">💡 Predicted Eligible Target Opportunities</h3>
              <p className="predicted-sub">Colleges where <strong>{predictorRound}</strong> closing cutoff scores matched higher than or equal to Rank <strong>{userRank || '0'}</strong>:</p>

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
                          <span className={`stamp ${stampClass}`}>{badgeText}</span>
                        </div>
                        <h4 className="result-name">{item.collegeName}</h4>
                        <p className="result-meta">Course: <strong>{item.courseDetails}</strong></p>
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
    </div>
  );
}