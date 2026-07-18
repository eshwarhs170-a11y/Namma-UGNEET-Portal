import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Target, Info, AlertTriangle, Lock, Unlock, ScrollText, Mail, 
  Star, Trash2, FileText, MessageCircle, School, User, PenTool, Lightbulb, 
  Coffee, RefreshCw, Frown, Circle, BarChart3, Check, X,
  Sun, Moon, Home, Download, Landmark, Globe, Wallet
} from 'lucide-react';

// jsPDF loaded on-demand (lazy) to keep initial bundle small
import logo from '../assets/namma-ugneet-logo.png';
import { fetchVisitCounts } from '../visitorCounter.js';
import './Dashboard.css';

// ── Custom autocomplete dropdown (replaces native <datalist> which bounces on mobile) ──
function CollegeAutocomplete({ value, onChange, onCommit, suggestions, placeholder, id }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!value || value.length < 1) return [];
    const q = value.toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 10);
  }, [value, suggestions]);

  const updateRect = () => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
  };

  // Close on outside click/touch
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    // Update rect position on scroll so dropdown tracks the input
    window.addEventListener('scroll', updateRect, { passive: true, capture: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      window.removeEventListener('scroll', updateRect, { capture: true });
    };
  }, []);

  const handleFocus = () => {
    updateRect();
    setOpen(true);
  };

  const handleChange = (e) => {
    onChange(e.target.value);
    updateRect();
    setOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setOpen(false);
      if (onCommit) onCommit(value);
      if (inputRef.current) {
        inputRef.current.setAttribute('readonly', 'true');
        inputRef.current.blur();
        setTimeout(() => { if (inputRef.current) inputRef.current.removeAttribute('readonly'); }, 100);
      }
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // The key anti-bounce trick: set readonly BEFORE blur so iOS does not
  // dismiss the keyboard via a full viewport-resize animation
  const handleSelect = (name) => {
    onChange(name);
    setOpen(false);
    if (onCommit) onCommit(name);
    if (inputRef.current) {
      inputRef.current.setAttribute('readonly', 'true');
      inputRef.current.blur();
      setTimeout(() => { if (inputRef.current) inputRef.current.removeAttribute('readonly'); }, 100);
    }
  };

  const showDropdown = open && filtered.length > 0 && rect;

  return (
    <div ref={wrapRef} className="college-autocomplete-wrap" style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        inputMode="search"
        placeholder={placeholder || 'Name or code...'}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        style={{ width: '100%' }}
      />
      {value && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onChange(''); if (onCommit) onCommit(''); setOpen(false); }}
          onTouchStart={(e) => { e.preventDefault(); onChange(''); if (onCommit) onCommit(''); setOpen(false); }}
          aria-label="Clear search"
          className="autocomplete-clear-btn"
        >
          <X className="lucide-icon" size={16} />
        </button>
      )}
      {showDropdown && typeof document !== 'undefined' && createPortal(
        <ul
          className="college-autocomplete-list"
          style={{
            position: 'fixed',
            top: rect.bottom + 2,
            left: rect.left,
            width: rect.width,
            zIndex: 99999,
          }}
        >
          {filtered.map((name) => (
            <li
              key={name}
              className="college-autocomplete-item"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(name); }}
              onTouchStart={(e) => { e.preventDefault(); handleSelect(name); }}
            >
              {name}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}




const SAVED_KEY = 'namma_saved_colleges';
const PROFILES_KEY = 'namma_saved_profiles';
const makeId = (item) => `${item.year}-${item.stream}-${item.round}-${item.serialNo}-${item.category}`;

// ── LocalStorage keys for persisted user inputs ──────────────────────────────
const LS_PREDICTOR = 'namma_predictor_state';
const LS_EXPLORE   = 'namma_explore_state';
const LS_DATASRC   = 'namma_data_source';

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
}

const LEGAL_CONTENT = {
  about: {
    title: <span><Info className="lucide-icon" size={18} /> About Us</span>,
    paragraphs: [
      'NammaUGNEET is an independent, student-built tool created to help Karnataka NEET UG aspirants (and now All India Quota candidates too) explore past counselling cutoffs and estimate realistic college options.',
      'It is not affiliated with, endorsed by, or connected to the Karnataka Examinations Authority (KEA), the Medical Counselling Committee (MCC), or any government body.',
      'The goal is simple: give students and parents a clearer, faster way to understand cutoff trends during a genuinely stressful and confusing time — counselling season.',
    ],
  },
  disclaimer: {
    title: <span><AlertTriangle className="lucide-icon" size={18} /> Disclaimer</span>,
    paragraphs: [
      'This tool provides estimates based on historical counselling data. Actual cutoffs change every year based on the number of applicants, seat availability, and policy changes — predictions here are not guarantees of admission.',
      'All cutoff, fee, and allotment data is manually compiled from official KEA and AIQ seat allotment PDFs. Every effort is made to extract this data accurately, but small errors are possible during parsing.',
      'Always cross-verify important decisions against the original allotment PDF or the official KEA website (kea.kar.nic.in) / MCC website before making any counselling decisions.',
      'Use this as a planning aid alongside official notifications, not as a replacement for them.',
    ],
  },
  terms: {
    title: <span><ScrollText className="lucide-icon" size={18} /> Terms & Conditions</span>,
    paragraphs: [
      'By using NammaUGNEET, you agree to the following:',
      '• This site is provided free of charge, for informational and planning purposes only. No account or payment is required to use it.',
      '• The data shown is for reference only and should not be treated as an official or final source. Always verify with KEA/MCC before making admission decisions.',
      '• We make no warranty, express or implied, about the accuracy, completeness, or availability of the site or its data, and accept no liability for decisions made based on it.',
      '• Content, data compilations, and design on this site may not be copied or redistributed for commercial purposes without permission.',
      '• The site, its features, or its availability may change or be discontinued at any time without prior notice.',
      '• Misuse of the site — including attempts to scrape data at scale, disrupt service, or bypass normal usage — is not permitted.',
    ],
  },
  privacy: {
    title: <span><Lock className="lucide-icon" size={18} /> Privacy Policy</span>,
    paragraphs: [
      'No account creation is required to use NammaUGNEET, and we do not collect personal information to let you use the core features.',
      'Saved colleges, notes, rank profiles, and filter preferences are stored locally in your own browser (using localStorage) — this data never leaves your device or gets sent to us.',
      'If you contact us directly via email or Instagram, we only see whatever information you choose to include in that message. Standard privacy practices of those platforms apply to that communication.',
      'Like most modern hosted websites, our hosting provider may automatically log basic technical information (such as page requests) for security and reliability purposes. This is not used for advertising or personal tracking.',
      'External links (e.g., to the official KEA or MCC websites) are outside our control, and their own privacy policies apply once you leave our site.',
      'Questions about your data? Reach out at nammaugneet@gmail.com.',
    ],
  },
  contact: {
    title: <span><Mail className="lucide-icon" size={18} /> Contact Us</span>,
    paragraphs: [
      'Found an error in the data, hit a bug, or have a feature suggestion? We\'d genuinely like to hear about it.',
      'This is a small, independently-run project, so replies may take a little time — but every message is read.',
    ],
  },
};

const CATEGORY_GLOSSARY = {
  GM: 'General Merit — open to all candidates regardless of category.',
  '1G': 'Category I (Karnataka) — reserved for a specific backward class group.',
  '1K': 'Category I, Kannada-medium background.',
  '1R': 'Category I, rural background.',
  '2AG': 'Category IIA — general.',
  '2AK': 'Category IIA, Kannada-medium background.',
  '2AR': 'Category IIA, rural background.',
  '2BG': 'Category IIB (mainly Muslim community reservation) — general.',
  '2BK': 'Category IIB, Kannada-medium background.',
  '2BR': 'Category IIB, rural background.',
  '3AG': 'Category IIIA — general.',
  '3AK': 'Category IIIA, Kannada-medium background.',
  '3AR': 'Category IIIA, rural background.',
  '3BG': 'Category IIIB — general.',
  '3BK': 'Category IIIB, Kannada-medium background.',
  '3BR': 'Category IIIB, rural background.',
  SC: 'Scheduled Caste reservation.',
  ST: 'Scheduled Tribe reservation.',
  GMP: 'General Merit, Physically Challenged (PWD) reservation.',
  NRI: 'Non-Resident Indian quota — separate, higher fee structure.',
  MNG: 'Management quota seat (private college discretion).',
  OPN: 'Open/unreserved seat within a private or deemed college quota.',
  OTH: 'Other/general category, typically used for private college quotas.',
  KM: 'Kannada Medium candidate reservation.',
  EWS: 'Economically Weaker Section reservation.',
  BC: 'Other Backward Class (OBC-NCL) — AIQ category.',
  'BC PwD': 'Other Backward Class (OBC-NCL), Person with Disability — AIQ category.',
  EW: 'General-EWS (Economically Weaker Section) — AIQ category.',
  'EW PwD': 'General-EWS, Person with Disability — AIQ category.',
  GN: 'Open Seat (general, unreserved) — AIQ category.',
  'GN PwD': 'Open Seat, Person with Disability — AIQ category.',
  'SC PwD': 'Scheduled Caste, Person with Disability — AIQ category.',
  'ST PwD': 'Scheduled Tribe, Person with Disability — AIQ category.',
  UNKNOWN: 'Category not recorded — this candidate\'s seat was finalized in an earlier round, and this particular AIQ report only records category for the final round.',
};

const AIQ_QUOTA_GLOSSARY = {
  'All India': 'Government medical/dental seats under All India Quota — 15% of total seats in every govt college.',
  'Open Seat Quota': 'Open seats in central institutions (AIIMS, JIPMER, etc.) — merit-based, no domicile restriction.',
  'Deemed/ Paid Seats Quota': 'Seats in Deemed Universities with higher fees — separate merit list.',
  'NonResident Indian': 'NRI quota seats — reserved for NRI-sponsored candidates, typically in private/deemed colleges.',
  'Non- Resident Indian': 'NRI quota seats — reserved for NRI-sponsored candidates, typically in private/deemed colleges.',
  'Delhi University Quota': 'Seats reserved for Delhi domicile candidates in Delhi University colleges.',
  'IP University Quota': 'Seats reserved under IP University, Delhi for its affiliated medical colleges.',
  'Muslim Minority Quota': 'Minority quota in institutions with Muslim minority status (e.g., Jamia, AMU).',
  'Jain Minority Quota': 'Minority quota in institutions with Jain minority status.',
  'Management/Paid Seats Quota': 'Management/paid seats in private AYUSH colleges with higher fee structures.',
  'Management/ Paid Seats Quota': 'Management/paid seats in private AYUSH colleges with higher fee structures.',
  'All India Quota Government': 'Government AYUSH college seats under centralized AIQ counselling.',
  'All India Quota Govt Aided': 'Government-aided AYUSH college seats under centralized AIQ counselling.',
  'Central Universites / National Institutions': 'Seats in central universities and national-level AYUSH institutes.',
  'Self Finance': 'Self-financed seats in private AYUSH colleges.',
  'Linguistic Minority': 'Quota for linguistic minority institutions.',
  'Employee s State Insurance Scheme( ESI)': 'Seats for dependants of ESI-insured workers.',
  'Foreign Country Quota': 'Seats reserved for foreign nationals.',
  'Aligarh Muslim University (AMU) Quota': 'Internal AMU quota seats.',
};

const getQuotaMeaning = (quota) =>
  AIQ_QUOTA_GLOSSARY[quota] || 'AIQ seat quota — refer to the official MCC notification for eligibility details.';

const getCategoryMeaning = (code) =>
  CATEGORY_GLOSSARY[code] || 'Reservation/quota category code — refer to the official counselling notification for exact eligibility rules.';

const formatFees = (fees) =>
  fees === null || fees === undefined ? 'Not available' : `₹${fees.toLocaleString('en-IN')}`;

// jsPDF helvetica doesn't support ₹, so we use Rs. instead for PDF exports to avoid garbled characters
const formatFeesPdf = (fees) =>
  fees === null || fees === undefined ? '—' : `Rs. ${fees.toLocaleString('en-IN')}`;

const formatCategory = (category) => (category === 'UNKNOWN' ? 'Category not recorded' : category);

const OPTIONS_KEY = 'namma_option_entries';
const makeOptionId = (item) => `${item.year}-${item.stream}-${item.round}-${item.serialNo}-${item.category}`;

function RankSparkline({ points }) {
  if (!points || points.length < 2) return null;

  const width = 100;
  const height = 28;
  const padX = 8;
  const padY = 6;

  const ranks = points.map((p) => p.rank);
  const maxRank = Math.max(...ranks);
  const minRank = Math.min(...ranks);
  const range = maxRank - minRank || 1;

  const coords = points.map((p, i) => {
    const x = padX + (i * (width - padX * 2)) / (points.length - 1);
    const normalized = (p.rank - minRank) / range;
    const y = padY + normalized * (height - padY * 2);
    return { x, y, rank: p.rank };
  });

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline-svg" preserveAspectRatio="xMidYMid meet">
      <path d={pathD} className="sparkline-line" fill="none" />
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={c.rank === minRank ? 3 : 2}
          className={c.rank === minRank ? 'sparkline-dot sparkline-dot-best' : 'sparkline-dot'}
        />
      ))}
    </svg>
  );
}

const PredictedGrid = React.memo(function PredictedGrid({
  predictedColleges,
  userRank,
  isSaved,
  toggleSave,
  isInOptionList,
  addToOptionList,
  getTrends,
  onSelectCollege,
  showFees,
}) {
  const CARD_RENDER_LIMIT = 150;
  const [visibleCount, setVisibleCount] = useState(CARD_RENDER_LIMIT);

  useEffect(() => {
    setVisibleCount(CARD_RENDER_LIMIT);
  }, [predictedColleges]);

  if (predictedColleges.length === 0) {
    return (
      <div className="predicted-grid">
        <div className="empty-predict">
          Enter your exact NEET Rank above to populate your custom eligible target mapping list.
        </div>
      </div>
    );
  }

  const visibleColleges = predictedColleges.slice(0, visibleCount);

  return (
    <div className="predicted-grid-wrap">
      <div className="predicted-grid">
        {visibleColleges.map((item, idx) => {
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span className={`stamp ${stampClass}`}>{badgeText}</span>
                <button
                  className={`star-btn${isSaved(item) ? ' saved' : ''}`}
                  onClick={() => toggleSave(item)}
                  aria-label="Save college"
                >
                  {isSaved(item) ? <Star className="lucide-icon" size={16} fill="currentColor" /> : <Star className="lucide-icon" size={16} />}
                </button>
                <button
                  className={`add-option-btn${isInOptionList(item) ? ' added' : ''}`}
                  onClick={() => addToOptionList(item)}
                  title="Add to Option Entry List"
                >
                  {isInOptionList(item) ? '<Check className="lucide-icon" size={16} /> Added' : '+ Add'}
                </button>
              </div>
            </div>
            <h4
              className="result-name college-name-link"
              onClick={() => onSelectCollege({ collegeCode: item.collegeCode, stream: item.stream, collegeName: item.collegeName })}
            >
              {item.collegeName}
            </h4>
            <p className="result-meta">Course: <strong>{item.courseDetails}</strong></p>
            <p className="result-meta">Round: <strong>{item.round}</strong> · Year: <strong>{item.year}</strong></p>
            {showFees && <p className="result-meta">Annual Cost: <strong>{formatFees(item.fees)}</strong></p>}

            {(() => {
              const { roundsThisYear, otherYearSameRound } = getTrends(item);
              const uniqueRounds = Array.from(new Map(roundsThisYear.map((r) => [r.round, r])).values());
              const otherYear = otherYearSameRound[0];
              if (uniqueRounds.length <= 1 && !otherYear) return null;
              return (
                <div className="trend-box">
                  {uniqueRounds.length > 1 && (
                    <div className="trend-line trend-line-with-spark">
                      <div>
                        <span className="trend-label">This year:</span>
                        {uniqueRounds.map((r) => (
                          <span key={r.round} className="trend-chip">{r.round} {r.rank.toLocaleString('en-IN')}</span>
                        ))}
                      </div>
                      <RankSparkline points={uniqueRounds} />
                    </div>
                  )}
                  {otherYear && (
                    <div className="trend-line">
                      <span className="trend-label">vs {otherYear.year}:</span>
                      <span className="trend-chip">
                        {otherYear.rank.toLocaleString('en-IN')}
                        {otherYear.rank > item.rank ? ' (tighter now)' : otherYear.rank < item.rank ? ' (looser now)' : ' (same)'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="result-footer">
              <span>Last Cutoff</span>
              <span className="val">{item.rank.toLocaleString('en-IN')}</span>
            </div>
          </div>
        );
        })}
      </div>
      {predictedColleges.length > visibleCount && (
        <div className="show-more-wrap">
          <p className="truncate-note">
            Showing top {visibleCount.toLocaleString('en-IN')} of {predictedColleges.length.toLocaleString('en-IN')} matches (closest cutoffs first).
          </p>
          <button
            className="show-more-btn"
            onClick={() => setVisibleCount((prev) => prev + CARD_RENDER_LIMIT)}
          >
            Show {Math.min(CARD_RENDER_LIMIT, predictedColleges.length - visibleCount).toLocaleString('en-IN')} More
          </button>
        </div>
      )}
    </div>
  );
});

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('home');

  const navigateTo = (tab) => {
    if (tab === activeTab) return;
    window.history.pushState({ tab }, '', `#${tab}`);
    setActiveTab(tab);
  };

  useEffect(() => {
    const initialTab = window.location.hash.replace('#', '') || 'home';
    setActiveTab(initialTab);
    window.history.replaceState({ tab: initialTab }, '', `#${initialTab}`);

    const handleRouting = () => {
      const tab = window.location.hash.replace('#', '') || 'home';
      setActiveTab(tab);
    };

    window.addEventListener('popstate', handleRouting);
    window.addEventListener('hashchange', handleRouting);
    return () => {
      window.removeEventListener('popstate', handleRouting);
      window.removeEventListener('hashchange', handleRouting);
    };
  }, []);

  // ── ADMIN PANEL STATE (hidden, developer-only) ────────────────────────────
  const ADMIN_HASH = 'admin-nammaugneet-dev';
  const [adminVisitCount, setAdminVisitCount] = useState({ total: null, today: null });
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== ADMIN_HASH) return;
    setAdminLoading(true);
    fetchVisitCounts().then((counts) => {
      setAdminVisitCount(counts);
      setAdminLoading(false);
    });
  }, [activeTab]);


  const [dataSource, setDataSource] = useState(() => lsGet(LS_DATASRC, 'KEA'));
  const [initialLoading, setInitialLoading] = useState(false);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [dataError, setDataError] = useState(false);
  const [dropdownStats, setDropdownStats] = useState({ years: [], streams: [], categories: [], rounds: [], quotas: [] });
  const [apiData, setApiData] = useState([]);
  const [apiTotal, setApiTotal] = useState(0);
  const [explorePage, setExplorePage] = useState(1);
  const [predictedData, setPredictedData] = useState([]);
  const [predictedLoading, setPredictedLoading] = useState(false);
  const [predictorExtraRange, setPredictorExtraRange] = useState(0);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);
  const [allCollegeNames, setAllCollegeNames] = useState([]);
  const [collegesByStream, setCollegesByStream] = useState({ MEDICAL: [], DENTAL: [], AYUSH: [] });


  // Fetch dropdown stats and college names
  useEffect(() => {
    setInitialLoading(true);
    fetch(`/api/stats?dataset=${dataSource}`)
      .then(r => r.json())
      .then(d => {
        setDropdownStats(d);
        if (d.colleges) {
          const cleanName = (name) => {
            if (!name) return '';
            let cleaned = name.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
            // Remove notes from KEA data like "(Note : Admission...)"
            cleaned = cleaned.replace(/\s*\(Note\s*:.*?\)/gi, '');
            cleaned = cleaned.replace(/^\d+\s*[-\s]+/g, '');
            cleaned = cleaned.replace(/^[\s\-,.]+/, '');
            cleaned = cleaned.replace(/^\([A-Za-z\s\-\.]+\)\s*(Quot\s*a\s*)?/i, '');
            const qps = [
              /^All India Quota Govt(?:ernment)?\s+Aided\s+/i,
              /^All India Quota Govt(?:ernment)?\s+/i,
              /^All India Quota\s+/i,
              /^Open Seat Quota\s+/i,
              /^Management\s*\/?\s*Paid?\s*Seats Quota\s+/i,
              /^Managemen\s*t\s*\/?\s*Paid\s*Seats\s*Quota\s+/i,
              /^Non-?\s*Resident Indian[^)]*\)?\s*/i,
              /^NonResident Indian\s*/i,
              /^Self Finance\s+/i,
              /^Muslim Minority Quota[^)]*\)?\s*/i,
              /^Deemed\s*\/?\s*Paid Seats Quota\s+/i,
              /^Linguistic Minority\s+/i,
              /^Jain Minority Quota\s+/i,
              /^Delhi University Quota\s+/i,
              /^IP University Quota\s+/i,
              /^Foreign Country Quota\s+/i,
            ];
            for (const p of qps) cleaned = cleaned.replace(p, '');
            cleaned = cleaned.replace(/^[\s\-,.]+/, '').replace(/\s+/g, ' ').trim();

            if (cleaned.includes(',')) {
              const parts = cleaned.split(',');
              const uniqueParts = [];
              for (const p of parts) {
                const trimmed = p.trim();
                if (trimmed && !/^\d+$/.test(trimmed)) {
                  const lower = trimmed.toLowerCase();
                  if (!uniqueParts.some(up => up.toLowerCase() === lower)) {
                    uniqueParts.push(trimmed);
                  }
                }
              }
              if (uniqueParts.length > 0) cleaned = uniqueParts.slice(0, 2).join(', ');
            }

            return cleaned;
          };
          const filterGarbage = (name) => {
            if (!name || name.length < 5) return false;
            if (name.length > 160) return false;
            if (/^\d+\s*[-–]/.test(name)) return false;
            if (/^[^a-zA-Z(]/.test(name)) return false;
            if (/^(Maharashtra|Rushikonda|Wardha|Visakhapatnam)/i.test(name)) return false;
            if (/NonResident Indian/i.test(name)) return false;
            if (/Non-Resident Indian/i.test(name)) return false;
            if (/Open Seat Quota/i.test(name)) return false;
            if (/^- - -/.test(name)) return false;
            if (/^All India\s/i.test(name) && name.length < 30) return false;
            if (/abbreviat/i.test(name)) return false;
            if (/counselling seats allotment/i.test(name)) return false;
            return true;
          };
          const buildList = (raw) => Array.from(new Set(raw.map(cleanName).filter(filterGarbage))).sort();
          setAllCollegeNames(buildList(d.colleges));
          if (d.collegesByStream) {
            setCollegesByStream({
              MEDICAL: buildList(d.collegesByStream.MEDICAL || []),
              DENTAL: buildList(d.collegesByStream.DENTAL || []),
              AYUSH: buildList(d.collegesByStream.AYUSH || []),
            });
          }
        }
        setInitialLoading(false);
      })
      .catch(() => {
        setDataError(true);
        setInitialLoading(false);
      });
  }, [dataSource]);
  const [showEdgeHint, setShowEdgeHint] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowEdgeHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    const onAppInstalled = () => {
      setInstallPromptEvent(null);
      setIsAppInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);
  
  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
    }
    setInstallPromptEvent(null);
  };

  const TOUR_KEY = 'namma_tour_seen';
  const tourSteps = [
    { title: <span><Target className="lucide-icon" size={24} /> Quick Predict</span>, body: 'Enter your NEET rank right on this page to jump straight into the Smart College Predictor.' },
    { title: '🎚️ Quick Filters', body: 'Search by name, filter by stream, category, round, and year — all update the table live.' },
    { title: <span><Star className="lucide-icon" size={16} /> Save Colleges</span>, body: 'Tap the star on any row or predictor card to bookmark it. Saved colleges show up in the sidebar — save 2+ to unlock the Compare button.' },
    { title: <span><School className="lucide-icon" size={18} /> College Details</span>, body: 'Tap any college name to see every category, round, and year cutoff for that college, plus a private notes box just for you.' },
    { title: <span><User className="lucide-icon" size={18} /> Save Rank Profiles</span>, body: 'Checking ranks for a sibling or friend too? Save each search as a named profile in the sidebar for one-click reloading.' },
    { title: '☰ Sidebar', body: 'Use the edge handle (top-left) to open the sidebar anytime for live stats, filters, and your saved lists.' },
  ];
  const [tourOpen, setTourOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) {
        setTourOpen(true);
      }
    } catch { }
  }, []);

  const closeTour = () => {
    setTourOpen(false);
    setTourStep(0);
    try { localStorage.setItem(TOUR_KEY, 'true'); } catch { }
  };
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('namma_dark_mode');
      if (saved !== null) return saved === 'true';
    } catch { }
    return false;
  });

  useEffect(() => {
    try { localStorage.setItem('namma_dark_mode', String(darkMode)); } catch { }
  }, [darkMode]);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 881px)').matches;
  });
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1200 : window.innerWidth
  );
  const userToggledRef = useRef(false);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setViewportWidth(w);
      if (!userToggledRef.current) {
        setSidebarOpen(w >= 881);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Prevent background scroll when sidebar is open on mobile
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 880px)').matches;
    if (sidebarOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Utility to normalize college names (remove newlines, extra spaces)
  const cleanCollegeName = (name) => {
    if (!name) return '';
    let cleaned = name.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Remove notes from KEA data like "(Note : Admission...)"
    cleaned = cleaned.replace(/\s*\(Note\s*:.*?\)/gi, '');

    // Remove common garbage prefixes from PDF parsing artifacts
    cleaned = cleaned.replace(/Did not opt for Upgradati\s*on\.?\s*\d+\s*[-\s]*/gi, '');
    cleaned = cleaned.replace(/Did not opt for Upgradation\.?\s*\d+\s*[-\s]*/gi, '');
    cleaned = cleaned.replace(/Did not fill up fresh choices\.?\s*\d+\s*[-\s]*/gi, '');
    cleaned = cleaned.replace(/Not Reported\.?\s*\d+\s*[-\s]*/gi, '');
    cleaned = cleaned.replace(/Not Allotted\.?\s*/gi, '');
    cleaned = cleaned.replace(/Seat Surrendered\.?\s*/gi, '');
    cleaned = cleaned.replace(/Reported\.?\s*/gi, '');
    cleaned = cleaned.replace(/No Upgradation\.?\s*/gi, '');
    cleaned = cleaned.replace(/Upgraded\.?\s*/gi, '');

    // Remove leading number sequences like "1004147 - - - - "
    cleaned = cleaned.replace(/^\d+\s*[-\s]+/g, '');

    // Remove leading dashes and spaces
    cleaned = cleaned.replace(/^[\s\-,.]+/, '');

    // Remove garbled bracket prefixes like "(G ovt Aided)", "(Govt Aided)", "(A MU)Quota"
    cleaned = cleaned.replace(/^\([A-Za-z\s\-\.]+\)\s*(Quot\s*a\s*)?/i, '');
    cleaned = cleaned.replace(/^\([A-Za-z\s\-\.]+\)\s*Self\s+finance[^)]*\s*/i, '');

    const quotaPatterns = [
      /^All India Quota Govt(?:ernment)?\s+Aided\s+/i,
      /^All India Quota Govt(?:ernment)?\s+/i,
      /^All India Quota\s+/i,
      /^Central Universites\s*\/?s*National Institutions\s+/i,
      /^Deemed\s*\/?\s*Paid Seats Quota\s+/i,
      /^Open Seat Quota\s+/i,
      /^Delhi University Quota\s+/i,
      /^IP University Quota\s+/i,
      /^Employee\s*s?\s*State Insurance Scheme[^)]*\)?\s*/i,
      /^Aligarh Muslim University \(AMU\) Quota\s+/i,
      /^B\.?Sc Nursing All India\s+/i,
      /^Muslim Quota\s+/i,
      /^Muslim Minority Quota[^)]*\)?\s*/i,
      /^Management\s*\/?\s*Paid?\s*Seats Quota\s+/i,
      /^Linguistic Minority\s+/i,
      /^Jain Minority Quota\s+/i,
      /^Self Finance\s+/i,
      /^Non-?\s*Resident Indian[^)]*\)?\s*/i,
      /^NonResident Indian\s*/i,
      /^Jamia Internal Quota\s+/i,
      /^Internal\s*-?\s*Puducherry\s+UT\s+Domicile\s+/i,
      /^Foreign Country Quota\s+/i,
      /^Delhi NCR[^)]*Quota\s+/i,
      /^Muslim\s+\w+\s+Quota\s+/i,
      /^Managemen\s*t\s*\/?\s*Paid\s*Seats\s*Quota\s+/i,
      /^Manageme\s*nt\s*\/?\s*Paid\s*Seats\s*Quota\s+/i,
    ];
    for (const p of quotaPatterns) {
      cleaned = cleaned.replace(p, '');
    }

    // Remove remaining leading dashes/spaces/commas/dots
    cleaned = cleaned.replace(/^[\s\-,.]+/, '');

    // Collapse extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      const uniqueParts = [];
      for (const p of parts) {
        const trimmed = p.trim();
        if (trimmed && !/^\d+$/.test(trimmed)) {
          const lower = trimmed.toLowerCase();
          if (!uniqueParts.some(up => up.toLowerCase() === lower)) {
            uniqueParts.push(trimmed);
          }
        }
      }
      if (uniqueParts.length > 0) cleaned = uniqueParts.slice(0, 2).join(', ');
    }

    return cleaned;
  };

  // Returns true if a college name is garbage/invalid and should be hidden from autocomplete
  const isGarbageCollegeName = (name) => {
    if (!name || name.length < 5) return true;
    if (name.length > 160) return true;
    if (/abbreviat/i.test(name)) return true;
    if (/allotted category/i.test(name)) return true;
    if (/counselling seats allotment/i.test(name)) return true;
    if (/neet-ug counselling/i.test(name)) return true;
    if (/\bsno\b.*\brank\b/i.test(name)) return true;
    if (/^[\d\s.\-]+$/.test(name)) return true; // pure numbers/dashes
    if (/^\d+\s*[-–]+/.test(name)) return true;  // starts with number then dashes like "1040567 - - -"
    if (/^[^a-zA-Z(]/.test(name)) return true;   // doesn't start with a letter or bracket
    if (/^(Maharashtra|Rushikonda|Wardha|Visakhapatnam)/i.test(name)) return true; // address fragments
    if (/^\d{6,}/.test(name)) return true; // starts with long number
    if (/NonResident Indian/i.test(name)) return true; // quota leaked in
    if (/Non-Resident Indian/i.test(name)) return true;
    if (/Open Seat Quota/i.test(name)) return true;
    if (/^All India\s/i.test(name) && name.length < 30) return true;
    if (/^- - -/i.test(name)) return true;
    return false;
  };

  // Auto-complete list of all college names (cleaned)
  

  const sidebarWidthPx = viewportWidth <= 420 ? Math.min(viewportWidth * 0.88, 300) : 290;

  const [searchQuery, setSearchQuery] = useState('');
  // committedSearchQuery is what actually gets sent to the API - only updates on selection or Enter
  const [committedSearchQuery, setCommittedSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(committedSearchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [committedSearchQuery]);

  const handleHomeSearch = (val) => {
    let foundStream = null;
    if (collegesByStream.MEDICAL && collegesByStream.MEDICAL.includes(val)) foundStream = 'MEDICAL';
    else if (collegesByStream.DENTAL && collegesByStream.DENTAL.includes(val)) foundStream = 'DENTAL';
    else if (collegesByStream.AYUSH && collegesByStream.AYUSH.includes(val)) foundStream = 'AYUSH';

    if (foundStream) {
      setStreamFilter(foundStream);
    }
    setSearchQuery(val);
    setCommittedSearchQuery(val);
    navigateTo('explore');
  };

  const [streamFilter, setStreamFilter] = useState(() => lsGet(LS_EXPLORE, {}).streamFilter ?? 'MEDICAL');
  const [categoryFilter, setCategoryFilter] = useState(() => lsGet(LS_EXPLORE, {}).categoryFilter ?? 'GM');
  const [quotaFilter, setQuotaFilter] = useState(() => lsGet(LS_EXPLORE, {}).quotaFilter ?? 'ALL');
  const [maxBudget, setMaxBudget] = useState(() => lsGet(LS_EXPLORE, {}).maxBudget ?? 1500000);
  // Default to 'R1'; if localStorage had the old 'ALL', fall back to 'R1'
  const [roundFilter, setRoundFilter] = useState(() => lsGet(LS_EXPLORE, {}).roundFilter ?? 'ALL');
  const [yearFilter, setYearFilter] = useState(() => lsGet(LS_EXPLORE, {}).yearFilter ?? '2025');

  const [sortConfig, setSortConfig] = useState(() => lsGet(LS_EXPLORE, {}).sortConfig ?? { key: 'rank', direction: 'asc' });

  // Persist explore filter settings whenever they change
  useEffect(() => {
    lsSet(LS_EXPLORE, { streamFilter, categoryFilter, quotaFilter, maxBudget, roundFilter, yearFilter, sortConfig });
  }, [streamFilter, categoryFilter, quotaFilter, maxBudget, roundFilter, yearFilter, sortConfig]);

  // Persist dataSource
  useEffect(() => { lsSet(LS_DATASRC, dataSource); }, [dataSource]);

  // Reset pagination page to 1 whenever any filter changes
  useEffect(() => {
    setExplorePage(1);
  }, [dataSource, debouncedSearchQuery, streamFilter, categoryFilter, maxBudget, roundFilter, yearFilter, sortConfig, quotaFilter]);

  // Fetch Explore Tab Data
  useEffect(() => {
    if (activeTab !== 'explore') return;
    setExploreLoading(true);
    
    const params = new URLSearchParams({
      dataset: dataSource,
      page: 1, // Always fetch the first page, we don't paginate anymore
      limit: 5000, // fetch enough rows so all colleges appear after client-side grouping
      sort: sortConfig.key,
      order: sortConfig.direction,
    });
    
    if (debouncedSearchQuery.trim().length >= 2) params.set('search', debouncedSearchQuery.trim());
    if (streamFilter !== 'ALL') params.set('stream', streamFilter);
    if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
    if (roundFilter !== 'ALL') params.set('round', roundFilter);
    if (yearFilter !== 'ALL') params.set('year', yearFilter);
    if (dataSource === 'AIQ' && quotaFilter !== 'ALL') params.set('quota', quotaFilter);
    if (maxBudget < 15000000) params.set('maxBudget', maxBudget);

    fetch(`/api/allotments?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
         if (d.data.length === 0 && debouncedSearchQuery.trim().length >= 2) {
           if (typeof window !== 'undefined' && window.gtag) {
             window.gtag('event', 'search_no_results', {
               search_term: debouncedSearchQuery.trim(),
               stream: streamFilter,
               category: categoryFilter,
               round: roundFilter,
               dataset: dataSource
             });
           }
         }
         setApiData(prev => explorePage === 1 ? d.data : [...prev, ...d.data]);
         setApiTotal(d.total);
         setExploreLoading(false);
      }).catch(err => {
         console.error(err);
         setDataError(true);
         setExploreLoading(false);
      });
  }, [activeTab, dataSource, debouncedSearchQuery, streamFilter, categoryFilter, maxBudget, roundFilter, yearFilter, sortConfig, quotaFilter, explorePage]);
  
  const filteredDashboardData = apiData; // alias for the rest of the file
  
  // Explore table: one row per college+course combo, showing the highest rank
  // cutoff across all rounds (worst-case = last seat = most informative).
  // Grouping by collegeCode+course prevents the same college appearing twice
  // for MBBS-GOVT vs MBBS-MGMT, and prevents round-to-round flicker.
  const exploreColleges = useMemo(() => {
    if (!filteredDashboardData.length) return [];
    const map = new Map();
    filteredDashboardData.forEach(item => {
      // Key = collegeCode + course so MBBS-GOVT and MBBS-MGMT are separate rows,
      // but R1/R2/R3 of the same course are collapsed to the worst (highest) rank.
      const key = `${item.collegeCode}||${item.course || ''}`;
      if (!map.has(key) || item.rank > map.get(key).rank) {
        map.set(key, item);
      }
    });
    const rows = Array.from(map.values());
    // Sort according to current sortConfig
    rows.sort((a, b) => {
      let av = a[sortConfig.key], bv = b[sortConfig.key];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
      if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [filteredDashboardData, sortConfig]);



  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const [userRank, setUserRank] = useState(() => lsGet(LS_PREDICTOR, {}).userRank ?? '');
  const [predictorCategory, setPredictorCategory] = useState(() => lsGet(LS_PREDICTOR, {}).predictorCategory ?? 'GM');
  const [predictorQuota, setPredictorQuota] = useState(() => lsGet(LS_PREDICTOR, {}).predictorQuota ?? 'ALL');
  const [predictorStream, setPredictorStream] = useState(() => lsGet(LS_PREDICTOR, {}).predictorStream ?? 'MEDICAL');
  // Default to 'R1'; if localStorage had the old 'ALL', fall back to 'R1'
  const [predictorRound, setPredictorRound] = useState(() => lsGet(LS_PREDICTOR, {}).predictorRound ?? 'ALL');
  const [predictorYear, setPredictorYear] = useState(() => lsGet(LS_PREDICTOR, {}).predictorYear ?? '2025');
  const [rankRange, setRankRange] = useState(() => lsGet(LS_PREDICTOR, {}).rankRange ?? 0);

  // Persist predictor inputs whenever they change
  useEffect(() => {
    lsSet(LS_PREDICTOR, { userRank, predictorCategory, predictorQuota, predictorStream, predictorRound, predictorYear, rankRange });
  }, [userRank, predictorCategory, predictorQuota, predictorStream, predictorRound, predictorYear, rankRange]);

  useEffect(() => {
    if (dataSource === 'AIQ') {
      setCategoryFilter('Open');
      setPredictorCategory('Open');
      setRoundFilter('ALL');
      setPredictorRound('ALL');
      setQuotaFilter('ALL');
      setPredictorQuota('ALL');
    } else {
      setCategoryFilter('GM');
      setPredictorCategory('GM');
      setRoundFilter('ALL');
      setPredictorRound('ALL');
      setQuotaFilter('ALL');
      setPredictorQuota('ALL');
    }
  }, [dataSource]);

  const yearDefaultSetRef = useRef(false);

  const [debouncedUserRank, setDebouncedUserRank] = useState(userRank);
  const [debouncedRankRange, setDebouncedRankRange] = useState(rankRange);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUserRank(userRank), 250);
    return () => clearTimeout(timer);
  }, [userRank]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedRankRange(rankRange), 250);
    return () => clearTimeout(timer);
  }, [rankRange]);

  useEffect(() => {
    if (!initialLoading && dropdownStats.years.length > 0 && !yearDefaultSetRef.current) {
      const maxYear = Math.max(...dropdownStats.years.map(y => parseInt(y, 10)));
      setYearFilter(maxYear.toString());
      setPredictorYear('ALL');
      yearDefaultSetRef.current = true;
    }
  }, [initialLoading, dropdownStats]);

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
    } catch { }
  }, [savedColleges]);

  const isSaved = useCallback((item) => savedColleges.some((s) => s.id === makeId(item)), [savedColleges]);

  const toggleSave = useCallback((item) => {
    const id = makeId(item);
    setSavedColleges((prev) =>
      prev.some((s) => s.id === id)
        ? prev.filter((s) => s.id !== id)
        : [...prev, { id, ...item }]
    );
  }, []);

  const removeSaved = (id) => setSavedColleges((prev) => prev.filter((s) => s.id !== id));

  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const [selectedCollege, setSelectedCollege] = useState(null); 
  const [selectedCollegeRecords, setSelectedCollegeRecords] = useState([]);
  const [loadingCollegeDetails, setLoadingCollegeDetails] = useState(false);

  useEffect(() => {
    if (selectedCollege) {
      setLoadingCollegeDetails(true);
      fetch(`/api/allotments?dataset=${dataSource}&collegeCode=${selectedCollege.collegeCode}&stream=${selectedCollege.stream}&limit=5000`)
        .then(r => r.json())
        .then(d => {
          setSelectedCollegeRecords(d.data || []);
          setLoadingCollegeDetails(false);
        })
        .catch(e => {
          console.error(e);
          setLoadingCollegeDetails(false);
        });
    } else {
      setSelectedCollegeRecords([]);
    }
  }, [selectedCollege, dataSource]);

  const NOTES_KEY = 'namma_college_notes';
  const [collegeNotes, setCollegeNotes] = useState(() => {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(collegeNotes)); } catch { }
  }, [collegeNotes]);

  const [profiles, setProfiles] = useState(() => {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileRank, setNewProfileRank] = useState('');
  const [newProfileCategory, setNewProfileCategory] = useState('GM');

  useEffect(() => {
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch { }
  }, [profiles]);

  const saveCurrentAsProfile = () => {
    if (!newProfileName.trim() || !newProfileRank) return;
    const profile = {
      id: Date.now().toString(),
      name: newProfileName.trim(),
      rank: newProfileRank,
      category: newProfileCategory,
      stream: predictorStream,
      round: predictorRound,
      year: predictorYear,
    };
    setProfiles((prev) => [...prev, profile]);
    setNewProfileName('');
    setNewProfileRank('');
    setNewProfileCategory('GM');
  };

  const loadProfile = (p) => {
    setUserRank(p.rank);
    setPredictorCategory(p.category);
    setPredictorStream(p.stream);
    setPredictorRound(p.round);
    setPredictorYear(p.year);
    navigateTo('predictor');
  };

  const deleteProfile = (id) => setProfiles((prev) => prev.filter((p) => p.id !== id));

  const [optionEntries, setOptionEntries] = useState(() => {
    try {
      const raw = localStorage.getItem(OPTIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(optionEntries)); } catch { }
  }, [optionEntries]);

  const isInOptionList = useCallback((item) => optionEntries.some((o) => o.id === makeOptionId(item)), [optionEntries]);

  const addToOptionList = useCallback((item) => {
    const id = makeOptionId(item);
    setOptionEntries((prev) => {
      if (prev.some((o) => o.id === id)) {
        return prev.filter((o) => o.id !== id);
      }
      const next = [...prev, { id, ...item }];
      return next.sort((a, b) => a.rank - b.rank);
    });
  }, []);

  const removeFromOptionList = (id) => setOptionEntries((prev) => prev.filter((o) => o.id !== id));

  const clearOptionList = () => {
    if (window.confirm('Clear your entire option entry list? This cannot be undone.')) {
      setOptionEntries([]);
    }
  };

  const shareOptionListOnWhatsApp = () => {
    const lines = optionEntries.map((o, i) =>
      `Option ${i + 1}: ${o.collegeName} (${o.collegeCode}) — ${o.courseDetails}, ${o.category} [${o.round} ${o.year}]`
    );
    const text = `📝 *NammaUGNEET* — My Option Entry Preference List\n\n${lines.join('\n')}\n\nBuild your own list: https://namma-ugneet-portal.vercel.app/`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const downloadOptionListPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - margin * 2;

    const drawHeader = () => {
      // Dark header bar
      doc.setFillColor(26, 43, 74);
      doc.rect(0, 0, pageW, 28, 'F');
      // Accent strip
      doc.setFillColor(212, 160, 70);
      doc.rect(0, 28, pageW, 2, 'F');
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('NammaUGNEET', margin, 12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Option Entry Preference List', margin, 20);
      // Right side label
      doc.setFontSize(8);
      doc.text('namma-ugneet-portal.vercel.app', pageW - margin, 18, { align: 'right' });
    };

    const drawFooter = (pageNum, totalPages) => {
      doc.setFillColor(245, 244, 240);
      doc.rect(0, pageH - 10, pageW, 10, 'F');
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('For planning only — submit official options on the KEA portal.', margin, pageH - 3.5);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageW - margin, pageH - 3.5, { align: 'right' });
    };

    // Calculate total pages first
    const rowH = 13;
    const tableStart = 44;
    const usableH = pageH - 10 - tableStart;
    const rowsPerPage = Math.floor(usableH / rowH);
    const totalPages = Math.max(1, Math.ceil(optionEntries.length / rowsPerPage));

    drawHeader();

    // Sub-header info bar
    doc.setFillColor(240, 238, 232);
    doc.rect(0, 30, pageW, 12, 'F');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`Generated: ${date}  |  Total Colleges: ${optionEntries.length}  |  This list is NOT submitted anywhere automatically.`, margin, 37.5);

    // Table header
    const colX = [margin, margin + 8, margin + 100, margin + 120, margin + 144];
    doc.setFillColor(26, 43, 74);
    doc.rect(margin - 2, 42, contentW + 4, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('#', colX[0], 47.2);
    doc.text('COLLEGE NAME', colX[1], 47.2);
    doc.text('CATEGORY', colX[2], 47.2);
    doc.text('CUTOFF', colX[3], 47.2);
    doc.text('ROUND / YEAR', colX[4], 47.2);

    let y = tableStart;
    let currentPage = 1;
    drawFooter(currentPage, totalPages);

    optionEntries.forEach((o, i) => {
      if (y + rowH > pageH - 12) {
        doc.addPage();
        currentPage++;
        drawHeader();
        y = tableStart - 10;
        // Redraw table header on new page
        doc.setFillColor(26, 43, 74);
        doc.rect(margin - 2, y - 2, contentW + 4, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('#', colX[0], y + 3);
        doc.text('COLLEGE NAME', colX[1], y + 3);
        doc.text('CATEGORY', colX[2], y + 3);
        doc.text('CUTOFF', colX[3], y + 3);
        doc.text('ROUND / YEAR', colX[4], y + 3);
        y += rowH - 3;
        drawFooter(currentPage, totalPages);
      }

      // Alternating row background
      if (i % 2 === 0) {
        doc.setFillColor(252, 251, 248);
      } else {
        doc.setFillColor(244, 242, 236);
      }
      doc.rect(margin - 2, y - 1, contentW + 4, rowH, 'F');

      // Row number
      doc.setTextColor(180, 140, 60);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(String(i + 1), colX[0], y + 5);

      // College name (bold)
      doc.setTextColor(26, 43, 74);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      const nameLines = doc.splitTextToSize(`${o.collegeName} (${o.collegeCode})`, 88);
      doc.text(nameLines[0], colX[1], y + 4);

      // Course details (small)
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(o.courseDetails || '', colX[1], y + 9.5);

      // Category
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);
      doc.text(formatCategory(o.category), colX[2], y + 5);

      // Cutoff rank
      doc.setTextColor(180, 60, 60);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(o.rank.toLocaleString('en-IN'), colX[3], y + 5);

      // Round + Year
      doc.setTextColor(60, 100, 60);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${o.round} / ${o.year}`, colX[4], y + 5);

      y += rowH;
    });

    doc.save('nammaugneet-option-entry-list.pdf');
  };

  const dynamicCategories = dropdownStats.categories;
  const dynamicQuotas = dropdownStats.quotas;
  // Filter out stray/vacancy rounds on the frontend as belt-and-suspenders
  const dynamicRounds = (dropdownStats.rounds || []).filter(r => !/stray|vacancy/i.test(r));
  const dynamicYears = dropdownStats.years;

  // --- AUTO-COMPLETE LISTS: filtered by active stream to avoid showing irrelevant colleges ---
  const exploreStreamCollegeNames = useMemo(() => {
    if (!streamFilter || streamFilter === 'ALL') return allCollegeNames;
    // Use per-stream list from API if available
    const streamList = collegesByStream[streamFilter];
    if (streamList && streamList.length > 5) return streamList;
    // Fallback: filter from current page data
    const nameSet = new Set(
      filteredDashboardData
        .map(item => cleanCollegeName(item.collegeName))
        .filter(n => !isGarbageCollegeName(n))
    );
    if (nameSet.size > 5) return Array.from(nameSet).sort();
    return allCollegeNames;
  }, [allCollegeNames, collegesByStream, streamFilter, filteredDashboardData]);

  const predictorStreamCollegeNames = useMemo(() => {
    if (!predictorStream || predictorStream === 'ALL') return allCollegeNames;
    // Use per-stream list from API if available
    const streamList = collegesByStream[predictorStream];
    if (streamList && streamList.length > 5) return streamList;
    // Fallback: filter from predictor API results
    const nameSet = new Set(apiData
      .filter(item => item.stream === predictorStream)
      .map(item => cleanCollegeName(item.collegeName))
      .filter(n => !isGarbageCollegeName(n)));
    if (nameSet.size > 5) return Array.from(nameSet).sort();
    return allCollegeNames;
  }, [allCollegeNames, collegesByStream, predictorStream, apiData]);

  // Reset extra range when any core predictor filter changes
  useEffect(() => {
    setPredictorExtraRange(0);
  }, [dataSource, debouncedUserRank, debouncedRankRange, predictorCategory, predictorStream, predictorRound, predictorYear, predictorQuota]);

  // Fetch Predictor Data
  useEffect(() => {
    if (activeTab !== 'predictor') return;
    if (!hasSearchedOnce) {
      setPredictedData([]);
      return;
    }
    if (!debouncedUserRank || isNaN(debouncedUserRank)) {
      setPredictedData([]);
      return;
    }
    
    setPredictedLoading(true);
    const rankNum = parseInt(debouncedUserRank, 10);
    const rangeVal = parseInt(debouncedRankRange, 10) || 0;
    const effectiveMaxRange = rangeVal + predictorExtraRange;
    
    const params = new URLSearchParams({
      dataset: dataSource,
      limit: 5000,
    });
    
    if (rangeVal > 0 || predictorExtraRange > 0) {
      // Range mode: show colleges within the effective range
      params.set('minRank', Math.max(1, rankNum - rangeVal));
      params.set('maxRank', rankNum + effectiveMaxRange);
    } else {
      // Default mode (rankRange=0, no extra): show all colleges where cutoff >= user's rank
      params.set('minRank', rankNum);
    }
    
    if (predictorCategory !== 'ALL') params.set('category', predictorCategory);
    if (predictorStream !== 'ALL') params.set('stream', predictorStream);
    if (predictorRound !== 'ALL') params.set('round', predictorRound);
    if (predictorYear !== 'ALL') params.set('year', predictorYear);
    if (dataSource === 'AIQ' && predictorQuota !== 'ALL') params.set('quota', predictorQuota);

    setPredictedLoading(true);
    fetch(`/api/allotments?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
         // The predictor needs to group by collegeCode
         const map = new Map();
         (d.data || []).forEach(item => {
           if (!map.has(item.collegeCode)) map.set(item.collegeCode, []);
           map.get(item.collegeCode).push(item);
         });
         
         const results = Array.from(map.entries()).map(([code, history]) => {
           const closest = history.reduce((prev, curr) => Math.abs(curr.rank - rankNum) < Math.abs(prev.rank - rankNum) ? curr : prev);
           const diff = closest.rank - rankNum;
           return {
             ...closest,
             matchHistory: history,
             rankDiff: diff,
           };
         });
         
         // Sort: range mode by closest rank diff, default mode by rank ascending
         if (rangeVal > 0 || predictorExtraRange > 0) {
           results.sort((a, b) => Math.abs(a.rankDiff) - Math.abs(b.rankDiff));
         } else {
           results.sort((a, b) => a.rank - b.rank);
         }
         setPredictedData(results);
         setPredictedLoading(false);
      }).catch(() => setPredictedLoading(false));
  }, [activeTab, dataSource, debouncedUserRank, debouncedRankRange, predictorCategory, predictorStream, predictorRound, predictorYear, predictorQuota, predictorExtraRange, hasSearchedOnce]);

  const predictedColleges = predictedData; // alias
  

  const [categoryCompareOpen, setCategoryCompareOpen] = useState(false);
  const [categoryComparison, setCategoryComparison] = useState([]);
  useEffect(() => {
    if (!categoryCompareOpen || !debouncedUserRank || isNaN(debouncedUserRank)) {
      setCategoryComparison([]);
      return;
    }
    const targetRank = parseInt(debouncedUserRank, 10);
    // Fetch category comparison from API for each category
    Promise.all(dynamicCategories.map(cat => {
      const params = new URLSearchParams({
        dataset: dataSource, category: cat, minRank: targetRank, limit: 1, sort: 'rank', order: 'asc',
      });
      if (predictorStream !== 'ALL') params.set('stream', predictorStream);
      if (predictorRound !== 'ALL') params.set('round', predictorRound);
      if (predictorYear !== 'ALL') params.set('year', predictorYear);
      return fetch(`/api/allotments?${params}`).then(r => r.json()).then(d => ({
        category: cat, count: d.total, best: d.data[0] || null,
      }));
    })).then(results => setCategoryComparison(results.sort((a, b) => b.count - a.count)));
  }, [categoryCompareOpen, debouncedUserRank, predictorStream, predictorRound, predictorYear, dynamicCategories, dataSource]);

  const [desiredCollegeName, setDesiredCollegeName] = useState('');

  const [desiredCollegeCheck, setDesiredCollegeCheck] = useState(null);
  useEffect(() => {
    const query = desiredCollegeName.trim();
    if (!query) { setDesiredCollegeCheck(null); return; }
    const params = new URLSearchParams({
      dataset: dataSource, search: query, limit: 50, sort: 'rank', order: 'desc',
    });
    if (predictorStream !== 'ALL') params.set('stream', predictorStream);
    if (predictorCategory !== 'ALL') params.set('category', predictorCategory);
    if (predictorRound !== 'ALL') params.set('round', predictorRound);
    if (predictorYear !== 'ALL') params.set('year', predictorYear);
    fetch(`/api/allotments?${params}`).then(r => r.json()).then(d => {
      if (!d.data || d.data.length === 0) { setDesiredCollegeCheck({ status: 'notfound' }); return; }
      if (!debouncedUserRank || isNaN(debouncedUserRank)) { setDesiredCollegeCheck({ status: 'need_rank' }); return; }
      const targetRank = parseInt(debouncedUserRank, 10);
      const easiest = d.data[0]; // already sorted desc by rank
      if (easiest.rank >= targetRank) {
        setDesiredCollegeCheck({ status: 'attainable', record: easiest });
      } else {
        setDesiredCollegeCheck({ status: 'not_attainable', record: easiest });
      }
    }).catch(() => setDesiredCollegeCheck({ status: 'notfound' }));
  }, [desiredCollegeName, dataSource, predictorStream, predictorCategory, predictorRound, predictorYear, debouncedUserRank]);

  const showFees = dataSource === 'KEA';

  const avgFeesShown = useMemo(() => {
    const list = activeTab === 'predictor' ? predictedColleges : filteredDashboardData;
    const withFees = list.filter((item) => item.fees !== null && item.fees !== undefined);
    if (withFees.length === 0) return null; 
    const total = withFees.reduce((sum, item) => sum + item.fees, 0);
    return Math.round(total / withFees.length);
  }, [filteredDashboardData, predictedColleges, activeTab]);

  const trendIndex = useMemo(() => {
    const map = {};
    apiData.forEach((item) => {
      const key = `${item.stream}|${item.category}|${item.collegeCode}`;
      if (!map[key]) map[key] = [];
      map[key].push({ round: item.round, year: item.year, rank: item.rank });
    });
    return map;
  }, [apiData]);

  const getTrends = useCallback((item) => {
    const key = `${item.stream}|${item.category}|${item.collegeCode}`;
    const entries = trendIndex[key] || [];
    const roundsThisYear = entries.filter((e) => e.year === item.year);
    const otherYearSameRound = entries.filter((e) => e.round === item.round && e.year !== item.year);
    return { roundsThisYear, otherYearSameRound };
  }, [trendIndex]);

  const collegeCodeIndex = useMemo(() => {
    const map = {};
    apiData.forEach((item) => {
      const key = `${item.stream}|${item.collegeCode}`;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [apiData]);

  const getCollegeRecords = (stream, collegeCode) => collegeCodeIndex[`${stream}|${collegeCode}`] || [];

  const shareOnWhatsApp = (text) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const sharePredictedResultsOnWhatsApp = () => {
    const lines = predictedColleges.slice(0, 15).map((item, i) =>
      `${i + 1}. ${item.collegeName} (${item.collegeCode}) — ${item.courseDetails}, ${formatCategory(item.category)}${showFees ? `, ${formatFees(item.fees)}` : ''}, Cutoff ${item.rank.toLocaleString('en-IN')} [${item.round} ${item.year}]`
    );
    const header = `🎯 *NammaUGNEET* — Predicted colleges for Rank ${userRank} (${predictorCategory}, ${predictorStream}):\n\n`;
    const footer = `\n\nCheck your own rank: https://namma-ugneet-portal.vercel.app/`;
    shareOnWhatsApp(header + lines.join('\n') + footer);
  };

  const downloadPredictedResultsPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - margin * 2;

    const drawHeader = () => {
      doc.setFillColor(26, 43, 74);
      doc.rect(0, 0, pageW, 28, 'F');
      doc.setFillColor(212, 160, 70);
      doc.rect(0, 28, pageW, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('NammaUGNEET', margin, 12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Predicted Eligible Colleges Report', margin, 20);
      doc.setFontSize(8);
      doc.text('namma-ugneet-portal.vercel.app', pageW - margin, 18, { align: 'right' });
    };

    const drawFooter = (pageNum, totalPages) => {
      doc.setFillColor(245, 244, 240);
      doc.rect(0, pageH - 10, pageW, 10, 'F');
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Estimates only — verify with official KEA / MCC allotment data before making decisions.', margin, pageH - 3.5);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageW - margin, pageH - 3.5, { align: 'right' });
    };

    const rowH = 13;
    const tableStart = 50;
    const usableH = pageH - 10 - tableStart;
    const rowsPerPage = Math.floor(usableH / rowH);
    const colleges = predictedColleges.slice(0, 60);
    const totalPages = Math.max(1, Math.ceil(colleges.length / rowsPerPage));

    drawHeader();

    // Sub-header info bar
    doc.setFillColor(240, 238, 232);
    doc.rect(0, 30, pageW, 16, 'F');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('SEARCH PARAMETERS', margin, 37);
    doc.setFont('helvetica', 'normal');
    const params = `Rank: ${userRank}  |  Category: ${predictorCategory}  |  Stream: ${predictorStream}  |  Round: ${predictorRound}  |  Year: ${predictorYear}`;
    doc.text(params, margin, 43);
    const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`Generated: ${date}  |  Colleges shown: ${colleges.length}`, pageW - margin, 43, { align: 'right' });

    // Table header
    const colX = [margin, margin + 8, margin + 100, margin + 122, margin + 142, margin + 167];
    doc.setFillColor(26, 43, 74);
    doc.rect(margin - 2, tableStart - 6, contentW + 4, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('#', colX[0], tableStart - 1.2);
    doc.text('COLLEGE NAME', colX[1], tableStart - 1.2);
    doc.text('CATEGORY', colX[2], tableStart - 1.2);
    doc.text('CUTOFF', colX[3], tableStart - 1.2);
    doc.text('FEES', colX[4], tableStart - 1.2);
    doc.text('ROUND / YEAR', colX[5], tableStart - 1.2);

    let y = tableStart;
    let currentPage = 1;
    drawFooter(currentPage, totalPages);

    colleges.forEach((item, i) => {
      if (y + rowH > pageH - 12) {
        doc.addPage();
        currentPage++;
        drawHeader();
        y = tableStart - 10;
        doc.setFillColor(26, 43, 74);
        doc.rect(margin - 2, y - 6, contentW + 4, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('#', colX[0], y - 1.2);
        doc.text('COLLEGE NAME', colX[1], y - 1.2);
        doc.text('CATEGORY', colX[2], y - 1.2);
        doc.text('CUTOFF', colX[3], y - 1.2);
        doc.text('FEES', colX[4], y - 1.2);
        doc.text('ROUND / YEAR', colX[5], y - 1.2);
        drawFooter(currentPage, totalPages);
      }

      if (i % 2 === 0) {
        doc.setFillColor(252, 251, 248);
      } else {
        doc.setFillColor(244, 242, 236);
      }
      doc.rect(margin - 2, y - 1, contentW + 4, rowH, 'F');

      // Row number
      doc.setTextColor(180, 140, 60);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(String(i + 1), colX[0], y + 5);

      // College name
      doc.setTextColor(26, 43, 74);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      const nameLines = doc.splitTextToSize(`${item.collegeName} (${item.collegeCode})`, 88);
      doc.text(nameLines[0], colX[1], y + 4);

      // Course
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(item.courseDetails || '', colX[1], y + 9.5);

      // Category
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);
      doc.text(formatCategory(item.category), colX[2], y + 5);

      // Cutoff
      doc.setTextColor(180, 60, 60);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(item.rank.toLocaleString('en-IN'), colX[3], y + 5);

      // Fees
      doc.setTextColor(30, 120, 60);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(showFees && item.fees ? `Rs. ${item.fees.toLocaleString('en-IN')}` : '—', colX[4], y + 5);

      // Round + Year
      doc.setTextColor(60, 80, 130);
      doc.setFontSize(8);
      doc.text(`${item.round} / ${item.year}`, colX[5], y + 5);

      y += rowH;
    });

    doc.save('nammaugneet-predicted-colleges.pdf');
  };


  // ── HIDDEN ADMIN PANEL ────────────────────────────────────────────────────
  if (activeTab === ADMIN_HASH) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #0a0f1e 100%)',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        color: '#e2e8f0',
        padding: '2rem',
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

        <div style={{ zIndex: 1, textAlign: 'center', marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src={logo} 
            alt="NammaUGNEET" 
            style={{ 
              width: 80, 
              height: 80, 
              marginBottom: '1rem', 
              borderRadius: '50%',
              objectFit: 'contain',
              backgroundColor: '#ffffff',
              boxShadow: '0 0 20px rgba(99,102,241,0.4)',
              border: '2px solid rgba(255,255,255,0.1)',
              display: 'block'
            }} 
          />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#e2e8f0' }}>Admin Panel</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.35rem' }}>Developer-only view — do not share this URL.</p>
        </div>

        <div style={{
          zIndex: 1,
          background: 'rgba(15,23,42,0.85)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '20px',
          padding: '2.5rem',
          textAlign: 'center',
          width: '100%',
          maxWidth: 600,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>All-Time Visits</p>
              {adminLoading ? (
                <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#818cf8', margin: '0.5rem 0' }}>…</p>
              ) : adminVisitCount.total !== null ? (
                <p style={{ fontSize: '3rem', fontWeight: 800, color: '#818cf8', lineHeight: 1, margin: '0.5rem 0', textShadow: '0 0 20px rgba(129,140,248,0.4)' }}>
                  {adminVisitCount.total.toLocaleString('en-IN')}
                </p>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '1rem 0', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                  Live deployment required
                </p>
              )}
            </div>
            
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Today's Visits</p>
              {adminLoading ? (
                <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#38bdf8', margin: '0.5rem 0' }}>…</p>
              ) : adminVisitCount.today !== null ? (
                <p style={{ fontSize: '3rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1, margin: '0.5rem 0', textShadow: '0 0 20px rgba(56,189,248,0.4)' }}>
                  {adminVisitCount.today.toLocaleString('en-IN')}
                </p>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '1rem 0', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                  Live deployment required
                </p>
              )}
            </div>
          </div>
          <p style={{ color: '#475569', fontSize: '0.75rem', margin: '1.5rem 0 0 0' }}>Counted once per device per day</p>
        </div>

        <div style={{
          zIndex: 1,
          background: 'rgba(15,23,42,0.85)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '16px',
          padding: '2rem',
          width: '100%',
          maxWidth: 600,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        }}>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '1.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>LocalStorage snapshot</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Predictor saved:</span> <strong style={{ color: '#818cf8' }}>{localStorage.getItem('namma_predictor_state') ? <Check className="lucide-icon" size={16} /> : '–'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Explore saved:</span> <strong style={{ color: '#818cf8' }}>{localStorage.getItem('namma_explore_state') ? <Check className="lucide-icon" size={16} /> : '–'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Saved colleges:</span> <strong style={{ color: '#818cf8' }}>{JSON.parse(localStorage.getItem('namma_saved_colleges') || '[]').length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Profiles saved:</span> <strong style={{ color: '#818cf8' }}>{JSON.parse(localStorage.getItem('namma_saved_profiles') || '[]').length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Option entries:</span> <strong style={{ color: '#818cf8' }}>{JSON.parse(localStorage.getItem('namma_option_entries') || '[]').length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>Last ping date:</span> <strong style={{ color: '#818cf8' }}>{localStorage.getItem('namma_last_ping_day') || '–'}</strong>
            </div>
          </div>
        </div>

        <button
          onClick={() => { window.location.hash = 'home'; }}
          style={{
            zIndex: 1,
            marginTop: '2.5rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.6)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(99,102,241,0.4)'; }}
        >← Return to App</button>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className={`loading-screen${darkMode ? " dark" : ""}`}>
        <img src={logo} alt="Namma-UGNEET" className="loading-logo" />
        <p>Loading initial data…</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className={`loading-screen${darkMode ? " dark" : ""}`}>
        <img src={logo} alt="Namma-UGNEET" className="loading-logo" />
        <p>Could not connect to the database. If running locally, use <code>vercel dev</code> instead of <code>npm run dev</code>.</p>
      </div>
    );
  }

  return (
    <div className={`app-shell${darkMode ? " dark" : ""}`}>

      {/* CATEGORY GLOSSARY MODAL */}
      {glossaryOpen && (
        <div className="tour-backdrop" onClick={() => setGlossaryOpen(false)}>
          <div className="glossary-card" onClick={(e) => e.stopPropagation()}>
            <div className="glossary-header">
              <h3>📖 {dataSource === 'AIQ' ? 'AIQ Guide' : 'Category Guide'}</h3>
              <button className="modal-close-btn" onClick={() => setGlossaryOpen(false)} aria-label="Close"><X className="lucide-icon" size={16} /></button>
            </div>
            {dataSource === 'AIQ' && dynamicQuotas.length > 0 && (
              <>
                <p className="glossary-intro">What AIQ seat quota types mean:</p>
                <div className="glossary-list">
                  {dynamicQuotas.map((q) => (
                    <div key={q} className="glossary-row">
                      <span className="glossary-code">{q}</span>
                      <span className="glossary-meaning">{getQuotaMeaning(q)}</span>
                    </div>
                  ))}
                </div>
                <hr style={{ margin: '12px 0', opacity: 0.2 }} />
              </>
            )}
            <p className="glossary-intro">{dataSource === 'AIQ' ? 'What AIQ category codes mean:' : 'What KEA reservation/quota category codes mean:'}</p>
            <div className="glossary-list">
              {dynamicCategories.map((cat) => (
                <div key={cat} className="glossary-row">
                  <span className="glossary-code">{cat}</span>
                  <span className="glossary-meaning">{getCategoryMeaning(cat)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* COMPARE COLLEGES MODAL */}
      {compareOpen && (
        <div className="tour-backdrop" onClick={() => setCompareOpen(false)}>
          <div className="compare-card" onClick={(e) => e.stopPropagation()}>
            <div className="glossary-header">
              <h3>⚖️ Compare Saved Colleges</h3>
              <button className="modal-close-btn" onClick={() => setCompareOpen(false)} aria-label="Close"><X className="lucide-icon" size={16} /></button>
            </div>
            <div className="compare-table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>College</th>
                    <th>Category</th>
                    <th>Round</th>
                    <th>Year</th>
                    {showFees && <th>Fees</th>}
                    <th>Cutoff</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...savedColleges].sort((a, b) => a.rank - b.rank).map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong className="code-cell">{s.collegeCode}</strong>
                        <div className="compare-college-name">{s.collegeName}</div>
                      </td>
                      <td>{s.category}</td>
                      <td>{s.round}</td>
                      <td>{s.year}</td>
                      {showFees && <td className="fees-cell">{formatFees(s.fees)}</td>}
                      <td><span className="rank-pill">{s.rank.toLocaleString('en-IN')}</span></td>
                      <td><button className="modal-close-btn" onClick={() => removeSaved(s.id)} aria-label="Remove"><X className="lucide-icon" size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* COLLEGE DETAIL MODAL */}
      {selectedCollege && (
        <div className="tour-backdrop" onClick={() => setSelectedCollege(null)}>
          <div className="college-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="glossary-header">
              <h3>{selectedCollege.collegeName}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedCollege(null)} aria-label="Close"><X className="lucide-icon" size={16} /></button>
            </div>
            <p className="glossary-intro">
              {dataSource === 'AIQ' ? 'Reference Code' : 'KEA Code'}: <strong>{selectedCollege.collegeCode}</strong>
              <a 
                href={`https://www.google.com/search?q=${encodeURIComponent(selectedCollege.collegeName + ' ' + (dataSource === 'AIQ' ? 'Medical College' : 'Karnataka'))}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ marginLeft: '15px', fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}
                onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.target.style.textDecoration = 'none'}
              >
                Search College Info ↗
              </a>
            </p>

            {(() => {
              if (loadingCollegeDetails) {
                return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>Loading details...</div>;
              }

              const records = selectedCollegeRecords;
              const courseTypes = Array.from(new Set(records.map((r) => r.courseDetails))).sort();

              const courseSummaries = courseTypes.map(course => {
                const courseRecords = records.filter(r => r.courseDetails === course);
                const fees = Array.from(new Set(courseRecords.map((r) => r.fees).filter((f) => f !== null && f !== undefined)));
                const minFee = fees.length ? Math.min(...fees) : null;
                const maxFee = fees.length ? Math.max(...fees) : null;
                
                // Estimate seats by finding the max allotments in any single year+round
                const byYearRound = {};
                courseRecords.forEach(r => {
                  if (!r.year || !r.round) return;
                  const key = `${r.year}_${r.round}`;
                  byYearRound[key] = (byYearRound[key] || 0) + 1;
                });
                const counts = Object.values(byYearRound);
                const seats = counts.length ? Math.max(...counts) : courseRecords.length;

                return { course, minFee, maxFee, seats };
              });

              return (
                <>
                  {courseSummaries.length === 0 ? (
                    <div className="college-stat-row">
                      <div><span className="stat-label">Courses Offered</span><br /><strong>—</strong></div>
                      {showFees && <div><span className="stat-label">Fee Range</span><br /><strong>Not available</strong></div>}
                      <div><span className="stat-label">Seats (Est.)</span><br /><strong>0</strong></div>
                    </div>
                  ) : (
                    courseSummaries.map((summary, idx) => (
                      <div className="college-stat-row" key={idx} style={{ marginBottom: idx < courseSummaries.length - 1 ? '10px' : '0' }}>
                        <div>
                          <span className="stat-label">Course / Seat Type</span><br />
                          <strong>{summary.course}</strong>
                        </div>
                        {showFees && (
                          <div>
                            <span className="stat-label">Fee Range</span><br />
                            <strong>{summary.minFee === null ? 'Not available' : summary.minFee === summary.maxFee ? `₹${summary.minFee.toLocaleString('en-IN')}` : `₹${summary.minFee.toLocaleString('en-IN')} – ₹${summary.maxFee.toLocaleString('en-IN')}`}</strong>
                          </div>
                        )}
                        <div>
                          <span className="stat-label">Seats (Est.)</span><br />
                          <strong>{summary.seats}</strong>
                        </div>
                      </div>
                    ))
                  )}

                  <h4 className="college-subheading">Cutoffs across categories, rounds &amp; years</h4>
                  <div className="compare-table-wrap" style={{ maxHeight: '260px' }}>
                    <table className="compare-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Round</th>
                          <th>Year</th>
                          <th>Cutoff Rank</th>
                          {showFees && <th>Fees</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {records
                          .slice()
                          .sort((a, b) => a.year.localeCompare(b.year) || a.round.localeCompare(b.round) || a.rank - b.rank)
                          .map((r, i) => (
                            <tr key={i}>
                              <td>{formatCategory(r.category)}</td>
                              <td><span className="pill">{r.round}</span></td>
                              <td><span className="pill">{r.year}</span></td>
                              <td><span className="rank-pill">{r.rank.toLocaleString('en-IN')}</span></td>
                              {showFees && <td className="fees-cell">{formatFees(r.fees)}</td>}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="college-subheading"><PenTool className="lucide-icon" size={24} /> My Notes</h4>
                  <p className="glossary-intro" style={{ marginBottom: '8px' }}>
                    Personal notes only — saved on this device, not shared with anyone.
                  </p>
                  <textarea
                    className="notes-textarea"
                    placeholder="e.g. Ask about hostel availability, check placement record..."
                    value={collegeNotes[selectedCollege.collegeCode] || ''}
                    onChange={(e) =>
                      setCollegeNotes((prev) => ({ ...prev, [selectedCollege.collegeCode]: e.target.value }))
                    }
                  />
                </>
              );
            })()}
          </div>
        </div>
      )}

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

      {/* SUPPORT MODAL */}
      {supportOpen && (
        <div className="tour-backdrop" onClick={() => setSupportOpen(false)}>
          <div className="tour-card" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '380px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Coffee className="lucide-icon" size={24} /> Buy Us a Coffee</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              If NammaUGNEET helped you find your dream college, consider supporting our work! Your tip helps keep the servers running and the site ad-free.
            </p>
            
            <a
              href="upi://pay?pa=eshwarhs170@oksbi&pn=Eshwar%20HS&tn=NammaUGNEET%20Support&cu=INR"
              title="Tap to pay via GPay / PhonePe / Paytm"
              style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}
            >
              <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; }}
              >
                <img src="/upi-qr.png" alt="Tap to pay via UPI" style={{ width: '200px', height: '200px', display: 'block', margin: '0 auto' }} />
                <div style={{ marginTop: '0.75rem', color: '#10b981', fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.5px', textAlign: 'center' }}>
                  eshwarhs170@oksbi
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', textAlign: 'center' }}>Tap QR or ID to open payment app</div>
              </div>
            </a>

            <div style={{ marginBottom: '1.5rem' }}>
              <a
                href="upi://pay?pa=eshwarhs170@oksbi&pn=Eshwar%20HS&tn=NammaUGNEET%20Support&cu=INR"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: '700', fontSize: '0.95rem', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
              >
                    <Wallet className="lucide-icon" size={18} /> Pay via GPay / PhonePe / UPI
                  </a>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '1.5rem' }}>
              Scan the QR code <strong>or</strong> tap any link above to open your UPI app directly.
            </p>

            <div className="tour-actions" style={{ justifyContent: 'center' }}>
              <button 
                className="tour-next" 
                style={{ width: '100%', padding: '12px', fontSize: '1rem' }} 
                onClick={() => setSupportOpen(false)}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOP ROW — Absolute positioning to scroll smoothly away */}
      <div className="top-fab-row">
        <button className="tour-fab" onClick={() => { setTourStep(0); setTourOpen(true); }}>
          <Lightbulb className="lucide-icon" size={16} /> Guide
        </button>
        {installPromptEvent && !isAppInstalled && (
          <button className="install-fab" onClick={handleInstallClick}>
            <Download className="lucide-icon" size={16} /> Install App
          </button>
        )}
      </div>

      {/* FLOATING COMPARE BUTTON */}
      {savedColleges.length >= 2 && (
        <button className="compare-fab" onClick={() => setCompareOpen(true)}>
          <BarChart3 className="lucide-icon" size={16} /> Compare ({savedColleges.length})
        </button>
      )}

      {/* BACKDROP */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => { userToggledRef.current = true; setSidebarOpen(false); }} />}

      {/* EDGE HANDLE */}
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
            <div className="brand-name">NammaUGNEET</div>
          </div>
          <div className="sidebar-top-actions">
            <button
              className="dark-toggle-btn"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="lucide-icon" size={18} /> : <Moon className="lucide-icon" size={18} />}
            </button>
            <button className="sidebar-close" onClick={() => { userToggledRef.current = true; setSidebarOpen(false); }} aria-label="Close sidebar"><X className="lucide-icon" size={16} /></button>
          </div>
        </div>

        <div className="data-source-toggle" role="group" aria-label="Choose data source">
          <button
            className={dataSource === 'KEA' ? 'active' : ''}
            onClick={() => setDataSource('KEA')}
            title="KEA — Karnataka state counselling"
          >
            <Landmark className="lucide-icon" size={16} /> KEA
          </button>
          <button
            className={dataSource === 'AIQ' ? 'active' : ''}
            onClick={() => setDataSource('AIQ')}
            title="AIQ — All India Quota counselling"
          >
            <Globe className="lucide-icon" size={16} /> AIQ
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={activeTab === 'home' ? 'active' : ''}
            onClick={() => {
              navigateTo('home');
              if (window.matchMedia('(max-width: 880px)').matches) setSidebarOpen(false);
            }}
          >
            <Home className="lucide-icon" size={18} /> Home
          </button>
          <button
            className={activeTab === 'explore' ? 'active' : ''}
            onClick={() => {
              navigateTo('explore');
              if (window.matchMedia('(max-width: 880px)').matches) setSidebarOpen(false);
            }}
          >
            <Search className="lucide-icon" size={18} /> Explore Cutoffs &amp; Fees
          </button>
          <button
            className={`predictor${activeTab === 'predictor' ? ' active' : ''}`}
            onClick={() => {
              navigateTo('predictor');
              if (window.matchMedia('(max-width: 880px)').matches) setSidebarOpen(false);
            }}
          >
            <Target className="lucide-icon" size={24} /> Smart College Predictor
          </button>
          <button
            className={activeTab === 'options' ? 'active' : ''}
            onClick={() => {
              navigateTo('options');
              if (window.matchMedia('(max-width: 880px)').matches) setSidebarOpen(false);
            }}
          >
            <PenTool className="lucide-icon" size={24} /> Option Entry List {optionEntries.length > 0 && `(${optionEntries.length})`}
          </button>
          <button
            className={activeTab === 'contact' ? 'active' : ''}
            onClick={() => {
              navigateTo('contact');
              if (window.matchMedia('(max-width: 880px)').matches) setSidebarOpen(false);
            }}
          >
            <Mail className="lucide-icon" size={18} /> Contact &amp; About
          </button>
          <button
            className="support-nav-btn"
            style={{ marginTop: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: '600' }}
            onClick={() => {
              setSupportOpen(true);
              if (window.matchMedia('(max-width: 880px)').matches) setSidebarOpen(false);
            }}
          >
            <Coffee className="lucide-icon" size={24} /> Support Us
          </button>
        </nav>

        <div className="sidebar-section">
          <h4>Quick Stats</h4>
          <div className="stat-row"><span>Total Records</span><span>{(dropdownStats.totalRecords || 0).toLocaleString('en-IN')}</span></div>
          <div className="stat-row">
            <span>{activeTab === 'predictor' ? 'Predicted Matches' : 'Matching Filters'}</span>
            <span>{(activeTab === 'predictor' ? predictedColleges.length : apiTotal).toLocaleString('en-IN')}</span>
          </div>
          {showFees && <div className="stat-row"><span>Avg Fees (shown)</span><span>{formatFees(avgFeesShown)}</span></div>}
          <div className="stat-row"><span>Saved</span><span>{savedColleges.length}</span></div>
        </div>

        {activeTab === 'explore' && (
          <div className="sidebar-section">
            <h4>Filters</h4>

            <div className="field">
              <label>Search Institution</label>
              <CollegeAutocomplete
                id="explore-sidebar-search"
                value={searchQuery}
                onChange={setSearchQuery}
                onCommit={(val) => { setCommittedSearchQuery(val); }}
                suggestions={exploreStreamCollegeNames}
                placeholder="Name or code..."
              />
            </div>

            <div className="field">
              <label>Course Stream</label>
              <select aria-label="Course Stream" value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
                <option value="MEDICAL"><Circle className="lucide-icon" size={16} fill="#10b981" color="#10b981" /> MBBS (Medical)</option>
                <option value="DENTAL"><Circle className="lucide-icon" size={16} fill="#3b82f6" color="#3b82f6" /> BDS (Dental)</option>
                <option value="AYUSH"><Circle className="lucide-icon" size={16} fill="#d97706" color="#d97706" /> AYUSH Streams</option>
              </select>
            </div>

            {dataSource === 'AIQ' && (
              <div className="field">
                <label>AIQ Seat Quota <button type="button" className="glossary-btn" onClick={() => setGlossaryOpen(true)} aria-label="What do these mean?">ⓘ</button></label>
                <select aria-label="AIQ Seat Quota" value={quotaFilter} onChange={(e) => setQuotaFilter(e.target.value)}>
                  <option value="ALL">All Quotas</option>
                  {dynamicQuotas.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>{dataSource === 'KEA' ? 'KEA Quota Category' : 'AIQ Seat Category'} <button type="button" className="glossary-btn" onClick={() => setGlossaryOpen(true)} aria-label="What do these mean?">ⓘ</button></label>
              <select aria-label="Quota Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {dynamicCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Counselling Round</label>
              <select aria-label="Counselling Round" value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)}>
                <option value="ALL"><Star className="lucide-icon" size={18} /> All Rounds (Best Cutoff)</option>
                {dynamicRounds.filter(r => r !== 'FINAL' && !r.toLowerCase().includes('all rounds')).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Allotment Year</label>
              <select aria-label="Allotment Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                {dynamicYears.filter(y => y === '2025' || y === '2024').map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {showFees && (
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
            )}
          </div>
        )}

        <div className="sidebar-section">
          <h4><User className="lucide-icon" size={18} /> Saved Profiles</h4>
          <div className="profile-save-row" style={{ flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              placeholder="Name (e.g. Me, Cousin)"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                placeholder="Rank"
                value={newProfileRank}
                onChange={(e) => setNewProfileRank(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                value={newProfileCategory}
                onChange={(e) => setNewProfileCategory(e.target.value)}
                className="profile-save-select"
              >
                {dynamicCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <button onClick={saveCurrentAsProfile} disabled={!newProfileName.trim() || !newProfileRank} title="Save profile with this rank and category">Save Profile</button>
          </div>
          {profiles.length === 0 ? (
            <p className="empty-hint">Enter a name, rank, and category to save a profile for quick reloading later.</p>
          ) : (
            <ul className="profile-list">
              {profiles.map((p) => (
                <li key={p.id}>
                  <button className="profile-load-btn" onClick={() => loadProfile(p)}>
                    <strong>{p.name}</strong>
                    <span>Rank {p.rank} · {p.category} · {p.stream}</span>
                  </button>
                  <button className="modal-close-btn" onClick={() => deleteProfile(p.id)} aria-label="Delete profile">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sidebar-section saved-section">
          <h4><Star className="lucide-icon" size={18} /> Saved Colleges ({savedColleges.length})</h4>
          {savedColleges.length === 0 ? (
            <p className="empty-hint">Tap the <Star className="lucide-icon" size={16} /> on any college to save it here.</p>
          ) : (
            <ul className="saved-list">
              {savedColleges.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>{s.collegeCode}</strong>
                    <span>{s.year} · {s.round} · {s.category}{showFees ? ` · ${formatFees(s.fees)}` : ''}</span>
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
          <span className="dash-eyebrow">KEA Counselling · Live Dataset</span>
          <div className="dash-header-row">
            <img src={logo} alt="Namma-UGNEET" className="header-logo" />
            <h1 className="dash-title">
              {{
                home: 'Welcome to NammaUGNEET',
                explore: 'Explore Cutoffs & Fees',
                predictor: 'Smart College Predictor',
                options: 'My Option Entry List',
                contact: 'Contact & About',
                'legal-about': 'About Us',
                'legal-contact': 'Contact Us',
                'legal-disclaimer': 'Disclaimer',
                'legal-terms': 'Terms & Conditions',
                'legal-privacy': 'Privacy Policy',
              }[activeTab]}
            </h1>
          </div>
          <p className="dash-subtitle">
            {{
              home: 'Your independent guide to Karnataka NEET UG counselling — predict, plan, and prioritize.',
              explore: 'Cutoff ranks, fees and seat allotments across Medical, Dental & AYUSH streams.',
              predictor: 'Enter your rank to see which colleges you realistically qualify for.',
              options: 'Rank your preferred colleges in order, just like the real KEA option entry form.',
              contact: 'Who built this, where the data comes from, and how to reach out.',
              'legal-about': 'Who NammaUGNEET is built for, and why.',
              'legal-contact': 'Reach out with feedback, errors, or suggestions.',
              'legal-disclaimer': 'Please read this before making any decisions.',
              'legal-terms': 'The terms you agree to by using this site.',
              'legal-privacy': 'How your data is (and isn\'t) handled.',
            }[activeTab]}
          </p>
        </header>

        <div className="dash-panel">

          {/* --- FEATURE 0: HOME --- */}
          {activeTab === 'home' && (
            <div className="home-view">
              <div className="home-datasource-section">
                <h3 className="home-section-heading"><BarChart3 className="lucide-icon" size={18} /> Choose Your Data Source</h3>
                <div className="home-datasource-grid">
                  <button
                    className={`home-datasource-card${dataSource === 'KEA' ? ' active' : ''}`}
                    onClick={() => setDataSource('KEA')}
                  >
                    <strong><Landmark className="lucide-icon" size={24} /> KEA (Karnataka)</strong>
                    <p>State counselling — cutoffs, fees &amp; seat allotments across Karnataka's Medical, Dental &amp; AYUSH colleges.</p>
                    {dataSource === 'KEA' && <span className="home-datasource-badge"><Check className="lucide-icon" size={16} /> Active</span>}
                  </button>
                  <button
                    className={`home-datasource-card${dataSource === 'AIQ' ? ' active' : ''}`}
                    onClick={() => setDataSource('AIQ')}
                  >
                    <strong><Globe className="lucide-icon" size={24} /> AIQ (All India)</strong>
                    <p>All India Quota counselling — cutoffs across MBBS &amp; BDS colleges nationwide, final round.</p>
                    {dataSource === 'AIQ' && <span className="home-datasource-badge"><Check className="lucide-icon" size={16} /> Active</span>}
                  </button>
                </div>
              </div>

              <div className="home-hero">
                <div className="home-hero-text">
                  <h2>Predict. Plan. Prioritize.</h2>
                  <p>Your guide to {dataSource === 'AIQ' ? 'All India Quota' : 'Karnataka'} NEET UG counselling — {dataSource === 'AIQ' ? 'MBBS, BDS & AYUSH' : 'Medical, Dental & AYUSH'}, {dynamicYears.join('–')}.</p>
                </div>
                <div className="home-hero-actions">
                  <button className="home-cta primary" onClick={() => navigateTo('predictor')}><Target className="lucide-icon" size={24} /> Predict</button>
                  <button className="home-cta" onClick={() => navigateTo('explore')}><Search className="lucide-icon" size={18} /> Explore</button>
                </div>
              </div>

              <div className="home-search-section">
                <label className="home-search-label" htmlFor="home-search-input"><Search className="lucide-icon" size={18} /> Search a college by name or code</label>
                <div className="home-search-row">
                  <CollegeAutocomplete
                    id="home-search-input"
                    value={searchQuery}
                    onChange={(val) => { setSearchQuery(val); }}
                    onCommit={handleHomeSearch}
                    suggestions={allCollegeNames}
                    placeholder="e.g. Bangalore Medical College, M001MG"
                  />
                  <button onClick={() => { handleHomeSearch(searchQuery); }}>Search</button>
                </div>
              </div>

              <h3 className="home-section-heading">What you can do here</h3>
              <div className="home-feature-grid">
                <button className="home-feature-card" onClick={() => navigateTo('explore')}>
                  <strong><Search className="lucide-icon" size={18} /> Explore Cutoffs &amp; Fees</strong>
                  <p>Search and filter every seat allotment by stream, category, round, year, and budget.</p>
                </button>
                <button className="home-feature-card" onClick={() => navigateTo('predictor')}>
                  <strong><Target className="lucide-icon" size={18} /> Smart Predictor</strong>
                  <p>Enter your rank to see which colleges you realistically qualify for, with round &amp; year trends.</p>
                </button>
                <button className="home-feature-card" onClick={() => navigateTo('options')}>
                  <strong><PenTool className="lucide-icon" size={18} /> Option Entry Generator</strong>
                  <p>Build and reorder your college preference list, just like the real KEA option entry form.</p>
                </button>
                <button className="home-feature-card" onClick={() => { navigateTo('explore'); }}>
                  <strong><Star className="lucide-icon" size={18} /> Save &amp; Compare</strong>
                  <p>Bookmark colleges as you browse, then compare them side-by-side once you've shortlisted a few.</p>
                </button>
              </div>

              <div className="home-disclaimer">
                <AlertTriangle className="lucide-icon" size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  This is an independent, unofficial tool. Always cross-verify with the official{' '}
                  <a href="https://kea.kar.nic.in" target="_blank" rel="noopener noreferrer">KEA website</a> before making decisions.
                  See the <button className="inline-link-btn" onClick={() => navigateTo('contact')}>Contact &amp; About</button> page for details.
                </div>
              </div>

              <p className="home-closing-quote">
                "Every rank has a path forward. We built this so you can see yours clearly — and choose it with confidence." 🌟
              </p>

              <footer className="home-footer">
                <div className="home-footer-socials">
                  <a
                    className="home-footer-icon-btn"
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=nammaugneet@gmail.com&su=NammaUGNEET%20Feedback"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Email"
                  >
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="4" width="20" height="16" rx="2.5" fill="#fff" stroke="#e0e0e0" strokeWidth="1"/>
                      <path d="M3 6.5 12 13l9-6.5" fill="none" stroke="#EA4335" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 6.5v11a1 1 0 0 0 1 1h2V9.2z" fill="#FBBC05"/>
                      <path d="M21 6.5v11a1 1 0 0 1-1 1h-2V9.2z" fill="#34A853"/>
                      <path d="M3 6.5 12 13l9-6.5" fill="none" stroke="#4285F4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                  <a
                    className="home-footer-icon-btn"
                    href="https://instagram.com/namma_ugneet"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="igGradFooter" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#FFDD55" />
                          <stop offset="50%" stopColor="#E1306C" />
                          <stop offset="100%" stopColor="#5851DB" />
                        </linearGradient>
                      </defs>
                      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#igGradFooter)" />
                      <rect x="6.5" y="6.5" width="11" height="11" rx="4" fill="none" stroke="#fff" strokeWidth="1.6" />
                      <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.6" />
                      <circle cx="17" cy="7" r="1.1" fill="#fff" />
                    </svg>
                  </a>
                </div>


                <div className="home-footer-legal-links">
                  <button onClick={() => navigateTo('legal-about')}>About Us</button>
                  <button onClick={() => navigateTo('legal-contact')}>Contact Us</button>
                  <button onClick={() => navigateTo('legal-disclaimer')}>Disclaimer</button>
                  <button onClick={() => navigateTo('legal-terms')}>Terms &amp; Conditions</button>
                  <button onClick={() => navigateTo('legal-privacy')}>Privacy Policy</button>
                </div>

                <p className="home-footer-copyright">
                  © {new Date().getFullYear()} NammaUGNEET — an independent, student-built initiative. Not affiliated with KEA.
                </p>
              </footer>
            </div>
          )}

          {/* --- FEATURE 1: EXPLORE --- */}
          {activeTab === 'explore' && (
            <div>
              <div className="predictor-teaser">
                <div className="predictor-teaser-text">
                  <h3><Target className="lucide-icon" size={24} /> Not sure where you stand?</h3>
                  <p>Enter your NEET rank and jump straight to the Smart College Predictor.</p>
                </div>
                <div className="predictor-teaser-action">
                  <input
                    type="number"
                    placeholder="Enter rank"
                    value={userRank}
                    onChange={(e) => setUserRank(e.target.value)}
                  />
                  <select
                    className="teaser-stream-select"
                    value={streamFilter}
                    onChange={(e) => setStreamFilter(e.target.value)}
                  >
                    <option value="MEDICAL">MBBS (Medical)</option>
                    <option value="DENTAL">BDS (Dental)</option>
                    <option value="AYUSH">AYUSH</option>
                  </select>
                  <button
                    onClick={() => {
                      setPredictorStream(streamFilter);
                      navigateTo('predictor');
                    }}
                  >
                    Predict My Colleges →
                  </button>
                </div>
              </div>

              {!sidebarOpen && (
                <div className="filter-card inline-filters">
                  <h3>Quick Filters</h3>
                  <div className="filter-grid">
                    <div className="field">
                      <label>Search Institution</label>
                      <CollegeAutocomplete
                        id="explore-inline-search"
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onCommit={(val) => { setCommittedSearchQuery(val); }}
                        suggestions={exploreStreamCollegeNames}
                        placeholder="Enter name or code..."
                      />
                    </div>
                    <div className="field">
                      <label>Course Stream</label>
                      <select aria-label="Course Stream" value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
                        <option value="MEDICAL"><Circle className="lucide-icon" size={16} fill="#10b981" color="#10b981" /> MBBS (Medical)</option>
                        <option value="DENTAL"><Circle className="lucide-icon" size={16} fill="#3b82f6" color="#3b82f6" /> BDS (Dental)</option>
                        <option value="AYUSH"><Circle className="lucide-icon" size={16} fill="#d97706" color="#d97706" /> AYUSH Streams</option>
                      </select>
                    </div>
                    {dataSource === 'AIQ' && (
                      <div className="field">
                        <label>AIQ Seat Quota <button type="button" className="glossary-btn" onClick={() => setGlossaryOpen(true)} aria-label="What do these mean?">ⓘ</button></label>
                        <select aria-label="AIQ Seat Quota" value={quotaFilter} onChange={(e) => setQuotaFilter(e.target.value)}>
                          <option value="ALL">All Quotas</option>
                          {dynamicQuotas.map((q) => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="field">
                      <label>{dataSource === 'KEA' ? 'KEA Quota Category' : 'AIQ Seat Category'} <button type="button" className="glossary-btn" onClick={() => setGlossaryOpen(true)} aria-label="What do these mean?">ⓘ</button></label>
                      <select aria-label="Quota Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        {dynamicCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Counselling Round</label>
                      <select aria-label="Counselling Round" value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)}>
                        <option value="ALL"><Star className="lucide-icon" size={18} /> All Rounds (Best Cutoff)</option>
                        {dynamicRounds.filter(r => r !== 'FINAL' && !r.toLowerCase().includes('all rounds')).map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Allotment Year</label>
                      <select aria-label="Allotment Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                        {dynamicYears.filter(y => y === '2025' || y === '2024').map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    {showFees && (
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
                    )}
                  </div>
                </div>
              )}

              <p className="results-summary">
                <School className="lucide-icon" size={18} /> Found <strong>{exploreColleges.length}</strong> college{exploreColleges.length !== 1 ? 's' : ''} with cutoff data
                {roundFilter === 'ALL' ? ' · showing best last cutoff across all rounds' : ` for ${roundFilter}`}
                {categoryFilter !== 'ALL' ? ` · ${categoryFilter}` : ''}.
              </p>

              <div className="table-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th></th>
                      <th></th>
                      <th>{dataSource === 'AIQ' ? 'Reference Code' : 'KEA Code'}</th>
                      <th
                        className="sortable-th"
                        onClick={() => handleSort('collegeName')}
                      >
                        College Name{sortConfig.key === 'collegeName' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                      <th>Course</th>
                      <th>Category</th>
                      {showFees && (
                        <th
                          className="sortable-th"
                          onClick={() => handleSort('fees')}
                        >
                          Annual Fees{sortConfig.key === 'fees' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                        </th>
                      )}
                      <th
                        className="sortable-th"
                        onClick={() => handleSort('rank')}
                        title="Last cutoff = highest rank number admitted (last student to get a seat)"
                      >
                        Last Cutoff ↕{sortConfig.key === 'rank' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                      <th>Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exploreLoading ? (
                      <tr className="empty-row">
                        <td colSpan={showFees ? 9 : 8} style={{ padding: '60px 0' }}>
                          <RefreshCw className="lucide-icon predict-spinner" size={28} style={{ display: 'block', margin: '0 auto 12px', color: 'var(--brand-deep)' }} />
                          Fetching latest data...
                        </td>
                      </tr>
                    ) : exploreColleges.length === 0 ? (
                      <tr className="empty-row">
                        <td colSpan={showFees ? 9 : 8}>No colleges found for these filters. Try a different round or category.</td>
                      </tr>
                    ) : (
                      exploreColleges.map((item, i) => (
                        <tr key={i}>
                          <td>
                            <button
                              className={`star-btn${isSaved(item) ? ' saved' : ''}`}
                              onClick={() => toggleSave(item)}
                              aria-label="Save college"
                            >
                              {isSaved(item) ? <Star className="lucide-icon" size={16} fill="currentColor" /> : <Star className="lucide-icon" size={16} />}
                            </button>
                          </td>
                          <td>
                            <button
                              className={`add-option-btn${isInOptionList(item) ? ' added' : ''}`}
                              onClick={() => addToOptionList(item)}
                              aria-label="Add to option entry list"
                              title="Add to Option Entry List"
                            >
                              {isInOptionList(item) ? <Check className="lucide-icon" size={16} /> : '+'}
                            </button>
                          </td>
                          <td className="code-cell">{item.collegeCode}</td>
                          <td style={{ maxWidth: '380px' }}>
                            <button
                              className="college-name-link"
                              onClick={() => setSelectedCollege({ collegeCode: item.collegeCode, stream: item.stream, collegeName: item.collegeName })}
                            >
                              {item.collegeName}
                            </button>
                          </td>
                          <td><span className="pill">{item.courseDetails}</span></td>
                          <td>
                            {formatCategory(item.category)}
                            {item.quota && <span className="pill quota-pill">{item.quota}</span>}
                          </td>
                          {showFees && <td className="fees-cell">{formatFees(item.fees)}</td>}
                          <td><span className="rank-pill">{item.rank.toLocaleString('en-IN')}</span></td>
                          <td><span className="pill">{item.year}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="show-more-wrap" style={{ marginTop: '16px', textAlign: 'center' }}>
                <p className="truncate-note">
                  Loaded {filteredDashboardData.length.toLocaleString('en-IN')} of {apiTotal.toLocaleString('en-IN')} records — showing {exploreColleges.length} unique colleges.
                </p>
              </div>
            </div>
          )}

          {/* --- FEATURE 2: PREDICTOR --- */}
          {activeTab === 'predictor' && (
            <div>
              <button className="back-home-btn" onClick={() => navigateTo('explore')}>
                ← Back to Explore
              </button>

              <div className="ticket-hero">
                <h3><Target className="lucide-icon" size={24} /> Target Seat Predictor Matrix</h3>
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
                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span>Search Margin (±)</span>
                      <span style={{ color: 'var(--slate)', fontWeight: 400, fontSize: '0.75rem' }}>
                        Type or drag
                      </span>
                    </label>
                    <div className="range-control-wrap">
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        step="1000"
                        value={rankRange}
                        onChange={(e) => setRankRange(Number(e.target.value))}
                        className="range-slider"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        step="100"
                        value={rankRange}
                        onChange={(e) => setRankRange(Math.max(0, Number(e.target.value) || 0))}
                        className="range-number-input"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Stream Target</label>
                    <select aria-label="Stream Target" value={predictorStream} onChange={(e) => setPredictorStream(e.target.value)}>
                      <option value="MEDICAL">MBBS (Medical)</option>
                      <option value="DENTAL">BDS (Dental)</option>
                      <option value="AYUSH">AYUSH Courses</option>
                    </select>
                  </div>

                  {dataSource === 'AIQ' && (
                    <div className="field">
                      <label>AIQ Seat Quota <button type="button" className="glossary-btn" onClick={() => setGlossaryOpen(true)} aria-label="What do these mean?">ⓘ</button></label>
                      <select aria-label="AIQ Seat Quota" value={predictorQuota} onChange={(e) => setPredictorQuota(e.target.value)}>
                        <option value="ALL">All Quotas</option>
                        {dynamicQuotas.map((q) => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="field">
                    <label>{dataSource === 'KEA' ? 'Reservation Category' : 'AIQ Seat Category'} <button type="button" className="glossary-btn" onClick={() => setGlossaryOpen(true)} aria-label="What do these mean?">ⓘ</button></label>
                    <select aria-label="Reservation Category" value={predictorCategory} onChange={(e) => setPredictorCategory(e.target.value)}>
                      {dynamicCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Counselling Round</label>
                    <select aria-label="Counselling Round" value={predictorRound} onChange={(e) => setPredictorRound(e.target.value)}>
                      <option value="ALL"><Star className="lucide-icon" size={18} /> All Rounds (Best Cutoff)</option>
                      {dynamicRounds.filter(r => r !== 'FINAL' && !r.toLowerCase().includes('all rounds')).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Allotment Year</label>
                    <select aria-label="Allotment Year" value={predictorYear} onChange={(e) => setPredictorYear(e.target.value)}>
                      {dynamicYears.filter(y => y === '2025' || y === '2024').map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Search className="lucide-icon" size={18} /> Search a Specific College</label>
                    <CollegeAutocomplete
                      id="predictor-college-search"
                      value={desiredCollegeName}
                      onChange={setDesiredCollegeName}
                      suggestions={predictorStreamCollegeNames}
                      placeholder="Start typing a college name..."
                    />
                  </div>
                  
                  {/* Search Button (remains visible but disabled after first click) */}
                  <div className="field">
                    <label>&nbsp;</label>
                    <button 
                      type="button" 
                      className="home-cta primary" 
                      style={{ 
                        width: '100%', 
                        height: '41px',
                        opacity: hasSearchedOnce ? 0.6 : 1,
                        cursor: hasSearchedOnce ? 'default' : 'pointer'
                      }} 
                      onClick={() => !hasSearchedOnce && setHasSearchedOnce(true)}
                      disabled={hasSearchedOnce || !userRank}
                    >
                      <Search className="lucide-icon" size={18} /> Search Matches
                    </button>
                  </div>
                </div>
              </div>

              {hasSearchedOnce && (
                <>
                  {/* Quick Stats for Predictor */}
                  <div className="dash-panel" style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '16px', color: 'var(--brand-deep)', fontSize: '1.1rem' }}>Quick Stats</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                      <div className="stat-row" style={{ flexDirection: 'column', alignItems: 'flex-start', flex: '1 1 min-content' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Predicted Matches</span>
                        <strong style={{ fontSize: '1.25rem' }}>{predictedColleges.length.toLocaleString('en-IN')}</strong>
                      </div>
                      {showFees && (
                        <div className="stat-row" style={{ flexDirection: 'column', alignItems: 'flex-start', flex: '1 1 min-content' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Avg Fees (shown)</span>
                          <strong style={{ fontSize: '1.25rem' }}>{formatFees(avgFeesShown)}</strong>
                        </div>
                      )}
                      <div className="stat-row" style={{ flexDirection: 'column', alignItems: 'flex-start', flex: '1 1 min-content' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Saved</span>
                        <strong style={{ fontSize: '1.25rem' }}>{savedColleges.length}</strong>
                      </div>
                    </div>
                  </div>

                  {desiredCollegeCheck && (
                <div className={`desired-college-box ${desiredCollegeCheck.status}`}>
                  {desiredCollegeCheck.status === 'need_rank' && (
                    <p><Info className="lucide-icon" size={18} /> Enter your NEET rank above to check if <strong>{desiredCollegeName}</strong> is within your reach.</p>
                  )}
                  {desiredCollegeCheck.status === 'notfound' && (
                    <p><Search className="lucide-icon" size={18} /> No college matching "<strong>{desiredCollegeName}</strong>" found in the {predictorStream} stream. Check the spelling or try a shorter search term.</p>
                  )}
                  {desiredCollegeCheck.status === 'notfound_for_filters' && (
                    <p><Search className="lucide-icon" size={18} /> <strong>{desiredCollegeName}</strong> exists in our data, but not under <strong>{predictorCategory}</strong> category for the selected round/year. Try a different round (R1, R2, or R3) or "All Years", or a different category.</p>
                  )}
                  {desiredCollegeCheck.status === 'not_attainable' && (
                    <div>
                      <p>
                        <Frown className="lucide-icon" size={24} /> Sorry, <strong>{desiredCollegeCheck.record.collegeName}</strong> was not available for Rank {userRank} under these filters.
                        Its closest cutoff was <strong>{desiredCollegeCheck.record.rank.toLocaleString('en-IN')}</strong> ({desiredCollegeCheck.record.round} {desiredCollegeCheck.record.year}, {desiredCollegeCheck.record.category}) — you'd need a rank at or better than that.
                      </p>
                      {(() => {
                        const alternatives = predictedColleges
                          .filter((item) => item.collegeCode !== desiredCollegeCheck.record.collegeCode)
                          .slice(0, 3);
                        if (alternatives.length === 0) return null;
                        return (
                          <div className="similar-colleges-box">
                            <p className="similar-colleges-heading"><Lightbulb className="lucide-icon" size={18} /> You might be attainable for these instead:</p>
                            <ul className="similar-colleges-list">
                              {alternatives.map((alt, i) => (
                                <li key={i}>
                                  <button
                                    className="college-name-link"
                                    onClick={() => setSelectedCollege({ collegeCode: alt.collegeCode, stream: alt.stream, collegeName: alt.collegeName })}
                                  >
                                    {alt.collegeName}
                                  </button>
                                  <span className="similar-colleges-meta">
                                    {alt.collegeCode} · Cutoff {alt.rank.toLocaleString('en-IN')}{showFees ? ` · ${formatFees(alt.fees)}` : ''} · {alt.round} {alt.year}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {desiredCollegeCheck.status === 'attainable' && (() => {
                    const item = desiredCollegeCheck.record;
                    return (
                      <div className="result-card searched-result">
                        <div className="result-top">
                          <span className="result-code"><Check className="lucide-icon" size={16} /> YOUR SEARCH · CODE: {item.collegeCode}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button
                              className={`star-btn${isSaved(item) ? ' saved' : ''}`}
                              onClick={() => toggleSave(item)}
                              aria-label="Save college"
                            >
                              {isSaved(item) ? <Star className="lucide-icon" size={16} fill="currentColor" /> : <Star className="lucide-icon" size={16} />}
                            </button>
                            <button
                              className={`add-option-btn${isInOptionList(item) ? ' added' : ''}`}
                              onClick={() => addToOptionList(item)}
                              title="Add to Option Entry List"
                            >
                              {isInOptionList(item) ? <><Check className="lucide-icon" size={16} /> Added</> : '+ Add'}
                            </button>
                          </div>
                        </div>
                        <h4
                          className="result-name college-name-link"
                          onClick={() => setSelectedCollege({ collegeCode: item.collegeCode, stream: item.stream, collegeName: item.collegeName })}
                        >
                          {item.collegeName}
                        </h4>
                        <p className="result-meta">Course: <strong>{item.courseDetails}</strong></p>
                        <p className="result-meta">Round: <strong>{item.round}</strong> · Year: <strong>{item.year}</strong></p>
                        {showFees && <p className="result-meta">Annual Cost: <strong>{formatFees(item.fees)}</strong></p>}
                        <div className="result-footer">
                          <span>Cutoff Rank</span>
                          <span className="val">{item.rank.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {userRank && !isNaN(userRank) && (
                <div className="category-compare-section">
                  <button
                    className="category-compare-toggle"
                    onClick={() => setCategoryCompareOpen((prev) => !prev)}
                  >
                    <RefreshCw className="lucide-icon" size={16} /> {categoryCompareOpen ? 'Hide' : 'Compare'} Across My Eligible Categories
                  </button>
                  {categoryCompareOpen && (
                    <div className="category-compare-table-wrap">
                      <p className="glossary-intro" style={{ margin: '10px 0' }}>
                        Same rank ({userRank}), same stream/round/year — here's how many colleges you'd be eligible for under each category:
                      </p>
                      <table className="compare-table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Eligible Colleges</th>
                            <th>Best Match</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryComparison.map((row) => (
                            <tr key={row.category} className={row.category === predictorCategory ? 'current-category-row' : ''}>
                              <td>
                                <strong className="code-cell">{row.category}</strong>
                                {row.category === predictorCategory && <span className="pill" style={{ marginLeft: '6px' }}>Current</span>}
                              </td>
                              <td><span className="rank-pill">{row.count}</span></td>
                              <td>
                                {row.best ? (
                                  <span>{row.best.collegeName} <span className="compare-college-name">({row.best.rank.toLocaleString('en-IN')})</span></span>
                                ) : (
                                  <span className="compare-college-name">None</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="predicted-heading-row">
                  <h3 className="predicted-heading"><Lightbulb className="lucide-icon" size={18} /> Predicted Eligible Target Opportunities</h3>
                  {predictedColleges.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="whatsapp-share-btn" onClick={sharePredictedResultsOnWhatsApp}>
                        <MessageCircle className="lucide-icon" size={18} /> Share on WhatsApp
                      </button>
                      <button className="pdf-download-btn" onClick={downloadPredictedResultsPDF}>
                        <FileText className="lucide-icon" size={18} /> Download PDF
                      </button>
                    </div>
                  )}
                </div>
                <p className="predicted-sub">
                  {(rankRange > 0 || predictorExtraRange > 0) && userRank && !isNaN(userRank) ? (
                    <>Colleges where <strong>{predictorYear === 'ALL' ? "any year's" : predictorYear}</strong> <strong>{predictorRound === 'ALL' ? "any round's" : predictorRound}</strong> closing cutoff falls within ranks <strong>{Math.max(1, parseInt(userRank, 10) - rankRange).toLocaleString('en-IN')}</strong> to <strong>{(parseInt(userRank, 10) + rankRange + predictorExtraRange).toLocaleString('en-IN')}</strong>{predictorExtraRange > 0 ? ` (expanded +${predictorExtraRange.toLocaleString('en-IN')})` : ` (±${rankRange.toLocaleString('en-IN')} of Rank ${userRank})`}:</>
                  ) : (
                    <>Colleges where <strong>{predictorYear === 'ALL' ? "any year's" : predictorYear}</strong> <strong>{predictorRound === 'ALL' ? "any round's" : predictorRound}</strong> closing cutoff scores matched higher than or equal to Rank <strong>{userRank || '0'}</strong>:</>
                  )}
                </p>

{predictedLoading ? (
                  <div className="predicted-grid" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px', gap: '16px' }}>
                    <div className="predict-spinner" />
                    <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Fetching colleges…</p>
                  </div>
                ) : (
                <PredictedGrid
                  predictedColleges={predictedColleges}
                  userRank={debouncedUserRank}
                  isSaved={isSaved}
                  toggleSave={toggleSave}
                  isInOptionList={isInOptionList}
                  addToOptionList={addToOptionList}
                  getTrends={getTrends}
                  onSelectCollege={setSelectedCollege}
                  showFees={dataSource === 'KEA'}
                />
                )}

                {/* Show More button to extend predictor search range */}
                {predictedColleges.length > 0 && userRank && !isNaN(userRank) && (
                  <div className="show-more-wrap" style={{ marginTop: '16px' }}>
                    <p className="truncate-note">
                      Currently showing {predictedColleges.length.toLocaleString('en-IN')} colleges with cutoffs up to rank {((parseInt(userRank, 10) || 0) + (parseInt(rankRange, 10) || 0) + predictorExtraRange).toLocaleString('en-IN')}.
                    </p>
                    <button
                      className="show-more-btn"
                      disabled={predictedLoading}
                      onClick={() => setPredictorExtraRange((prev) => prev + 10000)}
                    >
                      {predictedLoading ? 'Loading...' : `Show More (+10,000 Ranks → up to ${((parseInt(userRank, 10) || 0) + (parseInt(rankRange, 10) || 0) + predictorExtraRange + 10000).toLocaleString('en-IN')})`}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

          {/* --- FEATURE 3: OPTION ENTRY GENERATOR --- */}
          {activeTab === 'options' && (
            <div>
              <div className="option-intro">
                <h3><PenTool className="lucide-icon" size={24} /> Build Your Option Entry List</h3>
                <p>
                  During real KEA counselling, you rank your preferred colleges in order — this is your practice space.
                  Add colleges from the <button className="inline-link-btn" onClick={() => navigateTo('explore')}>Explore</button> or{' '}
                  <button className="inline-link-btn" onClick={() => navigateTo('predictor')}>Predictor</button> tabs using the
                  "+ Add" button, then reorder them here by priority.
                </p>
              </div>

              {optionEntries.length === 0 ? (
                <div className="option-empty-state">
                  <h4><PenTool className="lucide-icon" size={24} /> Your preference list starts here</h4>
                  <p>
                    Think of this as a practice run for KEA's real "Option Entry" step — where you'll rank
                    every college you'd accept, in order of preference, before the actual counselling round.
                  </p>
                  <p className="option-empty-steps">
                    Browse colleges on <strong>Explore</strong> or check your matches on <strong>Predictor</strong>,
                    then tap the <span className="pill">+ Add</span> button on any college — it'll show up right here, ready to reorder.
                  </p>
                  <div className="option-empty-actions">
                    <button className="home-cta primary" onClick={() => navigateTo('explore')}><Search className="lucide-icon" size={18} /> Go to Explore</button>
                    <button className="home-cta" onClick={() => navigateTo('predictor')}><Target className="lucide-icon" size={24} /> Go to Predictor</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="option-toolbar">
                    <span>{optionEntries.length} college{optionEntries.length !== 1 ? 's' : ''} in your list</span>
                    <div className="option-toolbar-actions">
                      <button className="whatsapp-share-btn" onClick={shareOptionListOnWhatsApp}>
                        <MessageCircle className="lucide-icon" size={18} /> Share on WhatsApp
                      </button>
                      <button className="pdf-download-btn" onClick={downloadOptionListPDF}>
                        <FileText className="lucide-icon" size={18} /> Download PDF
                      </button>
                      <button className="clear-options-btn" onClick={clearOptionList}>🗑 Clear All</button>
                    </div>
                  </div>

                  <ul className="option-entry-list">
                    {optionEntries.map((o, i) => (
                      <li key={o.id} className="option-entry-row">
                        <span className="option-number">{i + 1}</span>
                        <div className="option-entry-info">
                          <button
                            className="college-name-link"
                            onClick={() => setSelectedCollege({ collegeCode: o.collegeCode, stream: o.stream, collegeName: o.collegeName })}
                          >
                            {o.collegeName}
                          </button>
                          <span className="option-entry-meta">
                            {o.collegeCode} · {o.courseDetails} · {formatCategory(o.category)} · {o.round} {o.year}{showFees ? ` · ${formatFees(o.fees)}` : ''} · Cutoff {o.rank.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="option-entry-actions">
                          <button onClick={() => removeFromOptionList(o.id)} className="remove-option-btn" aria-label="Remove"><X className="lucide-icon" size={16} /></button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <p className="option-disclaimer">
                    <AlertTriangle className="lucide-icon" size={18} /> This list is for your own planning only. It is not submitted anywhere — you must still enter your
                    official options on the KEA counselling portal.
                  </p>
                </>
              )}
            </div>
          )}

          {/* --- FEATURE 4: CONTACT & ABOUT --- */}
          {activeTab === 'contact' && (
            <div className="contact-view">
              
              <div className="contact-section" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2rem', borderRadius: '16px', textAlign: 'center', marginBottom: '2rem' }}>
                <h3 style={{ color: '#10b981', fontSize: '1.6rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Coffee className="lucide-icon" size={24} /> Buy Us a Coffee</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
                  NammaUGNEET is an independent, student-built tool provided completely free of charge and free of ads. 
                  If this tool helped you predict your college or saved you hours of PDF scrolling, consider supporting our work! Your tip helps keep the servers running.
                </p>
                <a
                  href="upi://pay?pa=eshwarhs170@oksbi&pn=Eshwar%20HS&tn=NammaUGNEET%20Support&cu=INR"
                  title="Tap to pay via GPay / PhonePe / Paytm"
                  style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}
                >
                  <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; }}
                  >
                    <img src="/upi-qr.png" alt="Tap to pay via UPI" style={{ width: '200px', height: '200px', display: 'block', margin: '0 auto' }} />
                    <div style={{ marginTop: '0.75rem', color: '#10b981', fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.5px', textAlign: 'center' }}>
                      eshwarhs170@oksbi
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', textAlign: 'center' }}>Tap QR or ID to open payment app</div>
                  </div>
                </a>
                <div style={{ marginBottom: '0.5rem' }}>
                  <a
                    href="upi://pay?pa=eshwarhs170@oksbi&pn=Eshwar%20HS&tn=NammaUGNEET%20Support&cu=INR"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: '700', fontSize: '0.95rem', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
                  >
                    💳 Pay via GPay / PhonePe / UPI
                  </a>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginTop: '1rem' }}>
                  Scan the QR code <strong>or</strong> tap any link above to open your UPI app directly.
                </p>
              </div>

              <div className="contact-section">
                <h3>{LEGAL_CONTENT.about.title}</h3>
                {LEGAL_CONTENT.about.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              
              <div className="contact-section">
                <h3>{LEGAL_CONTENT.disclaimer.title}</h3>
                {LEGAL_CONTENT.disclaimer.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              
              <div className="contact-section">
                <h3>{LEGAL_CONTENT.terms.title}</h3>
                {LEGAL_CONTENT.terms.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              <div className="contact-section">
                <h3>{LEGAL_CONTENT.privacy.title}</h3>
                {LEGAL_CONTENT.privacy.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              <div className="contact-section">
                <h3>{LEGAL_CONTENT.contact.title}</h3>
                <p>Found an error in the data, or have a feature suggestion? Reach out:</p>
                <div className="contact-links">
                  <a
                    className="contact-link-btn"
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=nammaugneet@gmail.com&su=NammaUGNEET%20Feedback"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="contact-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="4" width="20" height="16" rx="2.5" fill="#fff" stroke="#e0e0e0" strokeWidth="1"/>
                      <path d="M3 6.5 12 13l9-6.5" fill="none" stroke="#EA4335" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 6.5v11a1 1 0 0 0 1 1h2V9.2z" fill="#FBBC05"/>
                      <path d="M21 6.5v11a1 1 0 0 1-1 1h-2V9.2z" fill="#34A853"/>
                      <path d="M3 6.5 12 13l9-6.5" fill="none" stroke="#4285F4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>nammaugneet@gmail.com</span>
                  </a>
                  <a
                    className="contact-link-btn"
                    href="https://instagram.com/namma_ugneet"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="contact-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#FFDD55" />
                          <stop offset="50%" stopColor="#E1306C" />
                          <stop offset="100%" stopColor="#5851DB" />
                        </linearGradient>
                      </defs>
                      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#igGrad)" />
                      <rect x="6.5" y="6.5" width="11" height="11" rx="4" fill="none" stroke="#fff" strokeWidth="1.6" />
                      <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.6" />
                      <circle cx="17" cy="7" r="1.1" fill="#fff" />
                    </svg>
                    <span>namma_ugneet</span>
                  </a>
                </div>
              </div>

            </div>
          )}

          {/* --- FOOTER PAGES: About Us, Contact Us, Disclaimer, Terms & Conditions, Privacy Policy --- */}
          {activeTab.startsWith('legal-') && (() => {
            const topicKey = activeTab.replace('legal-', '');
            const content = LEGAL_CONTENT[topicKey];
            if (!content) return null;
            return (
              <div className="contact-view legal-page-view">
                <button className="back-home-btn" onClick={() => navigateTo('home')}>
                  ← Back to Home
                </button>
                <div className="contact-section">
                  <h3>{content.title}</h3>
                  {content.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}

                  {topicKey === 'contact' && (
                    <div className="contact-links">
                      <a
                        className="contact-link-btn"
                        href="https://mail.google.com/mail/?view=cm&fs=1&to=nammaugneet@gmail.com&su=NammaUGNEET%20Feedback"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <svg className="contact-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <rect x="2" y="4" width="20" height="16" rx="2.5" fill="#fff" stroke="#e0e0e0" strokeWidth="1"/>
                          <path d="M3 6.5 12 13l9-6.5" fill="none" stroke="#EA4335" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M3 6.5v11a1 1 0 0 0 1 1h2V9.2z" fill="#FBBC05"/>
                          <path d="M21 6.5v11a1 1 0 0 1-1 1h-2V9.2z" fill="#34A853"/>
                          <path d="M3 6.5 12 13l9-6.5" fill="none" stroke="#4285F4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>nammaugneet@gmail.com</span>
                      </a>
                      <a
                        className="contact-link-btn"
                        href="https://instagram.com/namma_ugneet"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <svg className="contact-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="igGradLegal" x1="0%" y1="100%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#FFDD55" />
                              <stop offset="50%" stopColor="#E1306C" />
                              <stop offset="100%" stopColor="#5851DB" />
                            </linearGradient>
                          </defs>
                          <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#igGradLegal)" />
                          <rect x="6.5" y="6.5" width="11" height="11" rx="4" fill="none" stroke="#fff" strokeWidth="1.6" />
                          <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.6" />
                          <circle cx="17" cy="7" r="1.1" fill="#fff" />
                        </svg>
                        <span>namma_ugneet</span>
                      </a>
                    </div>
                  )}
                </div>

                <p className="legal-page-updated">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</p>
              </div>
            );
          })()}

        </div>
      </main>
    </div>
  );
}