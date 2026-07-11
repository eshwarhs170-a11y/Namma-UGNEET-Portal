import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import logo from '../assets/namma-ugneet-logo.png';
import './Dashboard.css';

const SAVED_KEY = 'namma_saved_colleges';
const PROFILES_KEY = 'namma_saved_profiles';
const makeId = (item) => `${item.year}-${item.stream}-${item.round}-${item.serialNo}-${item.category}`;

const LEGAL_CONTENT = {
  about: {
    title: 'ℹ️ About Us',
    paragraphs: [
      'NammaUGNEET is an independent, student-built tool created to help Karnataka NEET UG aspirants (and now All India Quota candidates too) explore past counselling cutoffs and estimate realistic college options.',
      'It is not affiliated with, endorsed by, or connected to the Karnataka Examinations Authority (KEA), the Medical Counselling Committee (MCC), or any government body.',
      'The goal is simple: give students and parents a clearer, faster way to understand cutoff trends during a genuinely stressful and confusing time — counselling season.',
    ],
  },
  disclaimer: {
    title: '⚠️ Disclaimer',
    paragraphs: [
      'This tool provides estimates based on historical counselling data. Actual cutoffs change every year based on the number of applicants, seat availability, and policy changes — predictions here are not guarantees of admission.',
      'All cutoff, fee, and allotment data is manually compiled from official KEA and AIQ seat allotment PDFs. Every effort is made to extract this data accurately, but small errors are possible during parsing.',
      'Always cross-verify important decisions against the original allotment PDF or the official KEA website (kea.kar.nic.in) / MCC website before making any counselling decisions.',
      'Use this as a planning aid alongside official notifications, not as a replacement for them.',
    ],
  },
  terms: {
    title: '📜 Terms & Conditions',
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
    title: '🔒 Privacy Policy',
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
    title: '✉️ Contact Us',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`stamp ${stampClass}`}>{badgeText}</span>
                <button
                  className={`star-btn${isSaved(item) ? ' saved' : ''}`}
                  onClick={() => toggleSave(item)}
                  aria-label="Save college"
                >
                  {isSaved(item) ? '★' : '☆'}
                </button>
                <button
                  className={`add-option-btn${isInOptionList(item) ? ' added' : ''}`}
                  onClick={() => addToOptionList(item)}
                  title="Add to Option Entry List"
                >
                  {isInOptionList(item) ? '✓ Added' : '+ Add'}
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

    const onPopState = (e) => {
      const tab = (e.state && e.state.tab) || window.location.hash.replace('#', '') || 'home';
      setActiveTab(tab);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const [dataSource, setDataSource] = useState('KEA');
  const [medicalData, setMedicalData] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);

  useEffect(() => {
    setDataLoading(true);
    setDataError(false);
    const dataFile = dataSource === 'AIQ' ? '/data/aiq_compiled_allotments.json' : '/data/compiled_allotments.json';
    fetch(dataFile)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch dataset');
        return res.json();
      })
      .then((data) => {
        setMedicalData(data);
        setDataLoading(false);
      })
      .catch(() => {
        setDataError(true);
        setDataLoading(false);
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
    { title: '🎯 Quick Predict', body: 'Enter your NEET rank right on this page to jump straight into the Smart College Predictor.' },
    { title: '🎚️ Quick Filters', body: 'Search by name, filter by stream, category, round, and year — all update the table live.' },
    { title: '☆ Save Colleges', body: 'Tap the star on any row or predictor card to bookmark it. Saved colleges show up in the sidebar — save 2+ to unlock the Compare button.' },
    { title: '🏫 College Details', body: 'Tap any college name to see every category, round, and year cutoff for that college, plus a private notes box just for you.' },
    { title: '👤 Save Rank Profiles', body: 'Checking ranks for a sibling or friend too? Save each search as a named profile in the sidebar for one-click reloading.' },
    { title: '☰ Sidebar', body: 'Use the edge handle (top-left) to open the sidebar anytime for live stats, filters, and your saved lists.' },
  ];
  const [tourOpen, setTourOpen] = useState(false);
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

  // Utility to normalize college names (remove newlines, extra spaces)
  const cleanCollegeName = (name) =>
    name.replace(/\r?\n/g, ' ') // replace line breaks with space
      .replace(/\s+/g, ' ') // collapse multiple whitespace
      .trim();

  // Auto-complete list of all college names (cleaned)
  const allCollegeNames = useMemo(() => {
    const names = new Set(
      medicalData.map((item) => cleanCollegeName(item.collegeName))
    );
    return Array.from(names).sort();
  }, [medicalData]);

  const sidebarWidthPx = viewportWidth <= 420 ? Math.min(viewportWidth * 0.88, 300) : 290;

  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState('MEDICAL');
  const [categoryFilter, setCategoryFilter] = useState('GM');
  const [quotaFilter, setQuotaFilter] = useState('ALL');
  const [maxBudget, setMaxBudget] = useState(1500000);
  const [roundFilter, setRoundFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });

  const filteredDashboardData = useMemo(() => {
    return medicalData
      .filter((item) => {
        const cleanedName = cleanCollegeName(item.collegeName).toLowerCase();
        const cleanedQuery = searchQuery.replace(/\s+/g, ' ').toLowerCase().trim();
        const matchSearch =
          cleanedName.includes(cleanedQuery) ||
          item.collegeCode.toLowerCase().includes(cleanedQuery);
        const matchStream = item.stream === streamFilter;
        const matchCategory = item.category === categoryFilter;
        const matchBudget = item.fees === null || item.fees === undefined || item.fees <= maxBudget;
        const matchRound = roundFilter === 'ALL' || item.round === roundFilter;
        const matchYear = yearFilter === 'ALL' || item.year === yearFilter;
        const matchQuota = dataSource !== 'AIQ' || quotaFilter === 'ALL' || item.quota === quotaFilter;
        return (
          matchSearch &&
          matchStream &&
          matchCategory &&
          matchBudget &&
          matchRound &&
          matchYear &&
          matchQuota
        );
      })
      .sort((a, b) => {
        let av = a[sortConfig.key];
        let bv = b[sortConfig.key];
        if (typeof av === 'string') {
          av = av.toLowerCase();
          bv = bv.toLowerCase();
        }
        if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
        if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [medicalData, searchQuery, streamFilter, categoryFilter, maxBudget, roundFilter, yearFilter, sortConfig, dataSource, quotaFilter]);

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const [userRank, setUserRank] = useState('');
  const [predictorCategory, setPredictorCategory] = useState('GM');
  const [predictorQuota, setPredictorQuota] = useState('ALL');
  const [predictorStream, setPredictorStream] = useState('MEDICAL');
  const [predictorRound, setPredictorRound] = useState('ALL');
  const [predictorYear, setPredictorYear] = useState('ALL');
  const [rankRange, setRankRange] = useState(0);

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
    if (!dataLoading && medicalData.length > 0 && !yearDefaultSetRef.current) {
      yearDefaultSetRef.current = true;
      const years = Array.from(new Set(medicalData.map((item) => item.year).filter(Boolean))).sort();
      if (years.length > 0) setPredictorYear(years.slice(-1)[0]);
    }
  }, [dataLoading, medicalData]);

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

  useEffect(() => {
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch { }
  }, [profiles]);

  const saveCurrentAsProfile = () => {
    if (!newProfileName.trim() || !userRank) return;
    const profile = {
      id: Date.now().toString(),
      name: newProfileName.trim(),
      rank: userRank,
      category: predictorCategory,
      stream: predictorStream,
      round: predictorRound,
      year: predictorYear,
    };
    setProfiles((prev) => [...prev, profile]);
    setNewProfileName('');
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
    setOptionEntries((prev) =>
      prev.some((o) => o.id === id)
        ? prev.filter((o) => o.id !== id)
        : [...prev, { id, ...item }]
    );
  }, []);

  const removeFromOptionList = (id) => setOptionEntries((prev) => prev.filter((o) => o.id !== id));

  const moveOption = (index, direction) => {
    setOptionEntries((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const clearOptionList = () => {
    if (window.confirm('Clear your entire option entry list? This cannot be undone.')) {
      setOptionEntries([]);
    }
  };

  const shareOptionListOnWhatsApp = () => {
    const lines = optionEntries.map((o, i) =>
      `Option ${i + 1}: ${o.collegeName} (${o.collegeCode}) — ${o.courseDetails}, ${o.category} [${o.round} ${o.year}]`
    );
    const text = `📝 NammaUGNEET — My Option Entry Preference List\n\n${lines.join('\n')}\n\nBuild your own list: https://namma-ugneet-portal.vercel.app/`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const downloadOptionListPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('NammaUGNEET — My Option Entry Preference List', 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('For your own planning only — submit your official options on the KEA portal.', 14, 25);
    doc.setTextColor(0);

    let y = 36;
    optionEntries.forEach((o, i) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`${i + 1}. ${o.collegeName} (${o.collegeCode})`, 14, y);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(
        `${o.courseDetails}  |  Category: ${formatCategory(o.category)}${showFees ? `  |  Fees: ${formatFees(o.fees)}` : ''}  |  Cutoff: ${o.rank.toLocaleString('en-IN')}  |  ${o.round} ${o.year}`,
        14,
        y + 6
      );
      y += 14;
    });

    doc.save('nammaugneet-option-entry-list.pdf');
  };

  const dynamicCategories = useMemo(() => {
    const categoriesSet = new Set(medicalData.map((item) => item.category));
    return Array.from(categoriesSet).sort();
  }, [medicalData]);

  const dynamicQuotas = useMemo(() => {
    const quotasSet = new Set(medicalData.map((item) => item.quota).filter(Boolean));
    return Array.from(quotasSet).sort();
  }, [medicalData]);

  const dynamicRounds = useMemo(() => {
    const roundsSet = new Set(medicalData.map((item) => item.round));
    return Array.from(roundsSet).sort();
  }, [medicalData]);

  const dynamicYears = useMemo(() => {
    const yearsSet = new Set(medicalData.map((item) => item.year).filter(Boolean));
    return Array.from(yearsSet).sort();
  }, [medicalData]);

  // --- AUTO-COMPLETE LISTS ---
  const exploreStreamCollegeNames = useMemo(() => {
    const names = new Set(
      medicalData.filter((item) => item.stream === streamFilter).map((item) => cleanCollegeName(item.collegeName))
    );
    return Array.from(names).sort();
  }, [medicalData, streamFilter]);

  const predictorStreamCollegeNames = useMemo(() => {
    const names = new Set(
      medicalData.filter((item) => item.stream === predictorStream).map((item) => cleanCollegeName(item.collegeName))
    );
    return Array.from(names).sort();
  }, [medicalData, predictorStream]);

  const predictedColleges = useMemo(() => {
    if (!debouncedUserRank || isNaN(debouncedUserRank)) return [];
    const targetRank = parseInt(debouncedUserRank, 10);
    const rangeVal = parseInt(debouncedRankRange, 10) || 0;

    return medicalData
      .filter((item) => {
        const matchStream = item.stream === predictorStream;
        const matchCategory = item.category === predictorCategory;
        const matchRound = predictorRound === 'ALL' || item.round === predictorRound;
        const matchYear = predictorYear === 'ALL' || item.year === predictorYear;
        const matchRankScope = rangeVal > 0
          ? item.rank >= Math.max(1, targetRank - rangeVal) && item.rank <= targetRank + rangeVal
          : item.rank >= targetRank;
        const matchQuota = dataSource !== 'AIQ' || predictorQuota === 'ALL' || item.quota === predictorQuota;

        return matchStream && matchCategory && matchRound && matchYear && matchRankScope && matchQuota;
      })
      .sort((a, b) => a.rank - b.rank);
  }, [medicalData, debouncedUserRank, debouncedRankRange, predictorCategory, predictorStream, predictorRound, predictorYear, dataSource, predictorQuota]);

  const [categoryCompareOpen, setCategoryCompareOpen] = useState(false);
  const categoryComparison = useMemo(() => {
    if (!categoryCompareOpen) return [];
    if (!debouncedUserRank || isNaN(debouncedUserRank)) return [];
    const targetRank = parseInt(debouncedUserRank, 10);

    return dynamicCategories
      .map((cat) => {
        const matches = medicalData
          .filter((item) => {
            const matchStream = item.stream === predictorStream;
            const matchCategory = item.category === cat;
            const matchRound = predictorRound === 'ALL' || item.round === predictorRound;
            const matchYear = predictorYear === 'ALL' || item.year === predictorYear;
            const matchRankScope = item.rank >= targetRank;
            return matchStream && matchCategory && matchRound && matchYear && matchRankScope;
          })
          .sort((a, b) => a.rank - b.rank);
        return { category: cat, count: matches.length, best: matches[0] || null };
      })
      .sort((a, b) => b.count - a.count);
  }, [categoryCompareOpen, medicalData, debouncedUserRank, predictorStream, predictorRound, predictorYear, dynamicCategories]);

  const [desiredCollegeName, setDesiredCollegeName] = useState('');

  const desiredCollegeCheck = useMemo(() => {
    const query = desiredCollegeName.trim().toLowerCase();
    if (!query) return null;

    const candidates = medicalData.filter(
      (item) => item.stream === predictorStream && item.collegeName.toLowerCase().includes(query)
    );
    if (candidates.length === 0) return { status: 'notfound' };

    const scoped = candidates.filter(
      (item) =>
        item.category === predictorCategory &&
        (predictorRound === 'ALL' || item.round === predictorRound) &&
        (predictorYear === 'ALL' || item.year === predictorYear)
    );
    if (scoped.length === 0) return { status: 'notfound_for_filters' };

    if (!debouncedUserRank || isNaN(debouncedUserRank)) return { status: 'need_rank' };
    const targetRank = parseInt(debouncedUserRank, 10);

    const easiest = [...scoped].sort((a, b) => b.rank - a.rank)[0];

    if (easiest.rank >= targetRank) {
      return { status: 'attainable', record: easiest };
    }
    return { status: 'not_attainable', record: easiest };
  }, [desiredCollegeName, medicalData, predictorStream, predictorCategory, predictorRound, predictorYear, debouncedUserRank]);

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
    medicalData.forEach((item) => {
      const key = `${item.stream}|${item.category}|${item.collegeCode}`;
      if (!map[key]) map[key] = [];
      map[key].push({ round: item.round, year: item.year, rank: item.rank });
    });
    return map;
  }, [medicalData]);

  const getTrends = useCallback((item) => {
    const key = `${item.stream}|${item.category}|${item.collegeCode}`;
    const entries = trendIndex[key] || [];
    const roundsThisYear = entries.filter((e) => e.year === item.year);
    const otherYearSameRound = entries.filter((e) => e.round === item.round && e.year !== item.year);
    return { roundsThisYear, otherYearSameRound };
  }, [trendIndex]);

  const collegeCodeIndex = useMemo(() => {
    const map = {};
    medicalData.forEach((item) => {
      const key = `${item.stream}|${item.collegeCode}`;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [medicalData]);

  const getCollegeRecords = (stream, collegeCode) => collegeCodeIndex[`${stream}|${collegeCode}`] || [];

  const shareOnWhatsApp = (text) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const sharePredictedResultsOnWhatsApp = () => {
    const lines = predictedColleges.slice(0, 15).map((item, i) =>
      `${i + 1}. ${item.collegeName} (${item.collegeCode}) — ${item.courseDetails}, ${formatCategory(item.category)}${showFees ? `, ${formatFees(item.fees)}` : ''}, Cutoff ${item.rank.toLocaleString('en-IN')} [${item.round} ${item.year}]`
    );
    const header = `🎯 NammaUGNEET — Predicted colleges for Rank ${userRank} (${predictorCategory}, ${predictorStream}):\n\n`;
    const footer = `\n\nCheck your own rank: https://namma-ugneet-portal.vercel.app/`;
    shareOnWhatsApp(header + lines.join('\n') + footer);
  };

  const downloadPredictedResultsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('NammaUGNEET — Predicted Colleges', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(
      `Rank: ${userRank}  |  Category: ${predictorCategory}  |  Stream: ${predictorStream}  |  Round: ${predictorRound}  |  Year: ${predictorYear}`,
      14,
      26
    );
    doc.setTextColor(0);

    let y = 38;
    predictedColleges.slice(0, 40).forEach((item, i) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`${i + 1}. ${item.collegeName} (${item.collegeCode})`, 14, y);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(
        `${item.courseDetails}  |  Category: ${formatCategory(item.category)}${showFees ? `  |  Fees: ${formatFees(item.fees)}` : ''}  |  Cutoff: ${item.rank.toLocaleString('en-IN')}  |  ${item.round} ${item.year}`,
        14,
        y + 6
      );
      y += 14;
    });

    doc.save('nammaugneet-predicted-colleges.pdf');
  };

  if (dataLoading) {
    return (
      <div className={`loading-screen${darkMode ? " dark" : ""}`}>
        <img src={logo} alt="Namma-UGNEET" className="loading-logo" />
        <p>Loading counselling data…</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className={`loading-screen${darkMode ? " dark" : ""}`}>
        <img src={logo} alt="Namma-UGNEET" className="loading-logo" />
        <p>Couldn't load the dataset. Make sure <code>compiled_allotments.json</code> exists in <code>public/data/</code>, then refresh.</p>
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
              <button className="modal-close-btn" onClick={() => setGlossaryOpen(false)} aria-label="Close">✕</button>
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
              <button className="modal-close-btn" onClick={() => setCompareOpen(false)} aria-label="Close">✕</button>
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
                  {savedColleges.map((s) => (
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
                      <td><button className="modal-close-btn" onClick={() => removeSaved(s.id)} aria-label="Remove">✕</button></td>
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
              <button className="modal-close-btn" onClick={() => setSelectedCollege(null)} aria-label="Close">✕</button>
            </div>
            <p className="glossary-intro">{dataSource === 'AIQ' ? 'Reference Code' : 'KEA Code'}: <strong>{selectedCollege.collegeCode}</strong></p>

            {(() => {
              const records = getCollegeRecords(selectedCollege.stream, selectedCollege.collegeCode);
              const courses = Array.from(new Set(records.map((r) => r.courseDetails))).sort();
              const fees = records.map((r) => r.fees).filter((f) => f !== null && f !== undefined);
              const minFee = fees.length ? Math.min(...fees) : null;
              const maxFee = fees.length ? Math.max(...fees) : null;

              return (
                <>
                  <div className="college-stat-row">
                    <div><span className="stat-label">Courses Offered</span><br /><strong>{courses.join(', ') || '—'}</strong></div>
                    {showFees && (
                      <div><span className="stat-label">Fee Range</span><br /><strong>{minFee === null ? 'Not available' : `₹${minFee.toLocaleString('en-IN')} – ₹${maxFee.toLocaleString('en-IN')}`}</strong></div>
                    )}
                    <div><span className="stat-label">Total Records</span><br /><strong>{records.length}</strong></div>
                  </div>

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

                  <h4 className="college-subheading">📝 My Notes</h4>
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

      {/* FLOATING TOP ROW — Absolute positioning to scroll smoothly away */}
      <div className="top-fab-row">
        <button className="tour-fab" onClick={() => { setTourStep(0); setTourOpen(true); }}>
          ✨ Guide
        </button>
        {installPromptEvent && !isAppInstalled && (
          <button className="install-fab" onClick={handleInstallClick}>
            ⬇️ Install App
          </button>
        )}
      </div>

      {/* FLOATING COMPARE BUTTON */}
      {savedColleges.length >= 2 && (
        <button className="compare-fab" onClick={() => setCompareOpen(true)}>
          ⚖️ Compare ({savedColleges.length})
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
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button className="sidebar-close" onClick={() => { userToggledRef.current = true; setSidebarOpen(false); }} aria-label="Close sidebar">✕</button>
          </div>
        </div>

        <div className="data-source-toggle" role="group" aria-label="Choose data source">
          <button
            className={dataSource === 'KEA' ? 'active' : ''}
            onClick={() => setDataSource('KEA')}
            title="KEA — Karnataka state counselling"
          >
            🏛️ KEA
          </button>
          <button
            className={dataSource === 'AIQ' ? 'active' : ''}
            onClick={() => setDataSource('AIQ')}
            title="AIQ — All India Quota counselling"
          >
            🌐 AIQ
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
            🏠 Home
          </button>
          <button
            className={activeTab === 'explore' ? 'active' : ''}
            onClick={() => {
              navigateTo('explore');
              if (window.matchMedia('(max-width: 880px)').matches) setSidebarOpen(false);
            }}
          >
            🔍 Explore Cutoffs &amp; Fees
          </button>
          <button
            className={`predictor${activeTab === 'predictor' ? ' active' : ''}`}
            onClick={() => {
              navigateTo('predictor');
              if (window.matchMedia('(max-width: 880px)').matches) setSidebarOpen(false);
            }}
          >
            🎯 Smart College Predictor
          </button>
          <button
            className={activeTab === 'options' ? 'active' : ''}
            onClick={() => {
              navigateTo('options');
              if (window.matchMedia('(max-width: 880px)').matches) setSidebarOpen(false);
            }}
          >
            📝 Option Entry List {optionEntries.length > 0 && `(${optionEntries.length})`}
          </button>
          <button
            className={activeTab === 'contact' ? 'active' : ''}
            onClick={() => {
              navigateTo('contact');
              if (window.matchMedia('(max-width: 880px)').matches) setSidebarOpen(false);
            }}
          >
            ✉️ Contact &amp; About
          </button>
        </nav>

        <div className="sidebar-section">
          <h4>Quick Stats</h4>
          <div className="stat-row"><span>Total Records</span><span>{medicalData.length.toLocaleString('en-IN')}</span></div>
          <div className="stat-row">
            <span>{activeTab === 'predictor' ? 'Predicted Matches' : 'Matching Filters'}</span>
            <span>{(activeTab === 'predictor' ? predictedColleges.length : filteredDashboardData.length).toLocaleString('en-IN')}</span>
          </div>
          {showFees && <div className="stat-row"><span>Avg Fees (shown)</span><span>{formatFees(avgFeesShown)}</span></div>}
          <div className="stat-row"><span>Saved</span><span>{savedColleges.length}</span></div>
        </div>

        {activeTab === 'explore' && (
          <div className="sidebar-section">
            <h4>Filters</h4>

            <div className="field">
              <label>Search Institution</label>
              <input
                type="text"
                list="explore-sidebar-options"
                placeholder="Name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <datalist id="explore-sidebar-options">
                {exploreStreamCollegeNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div className="field">
              <label>Course Stream</label>
              <select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
                <option value="MEDICAL">🟢 MBBS (Medical)</option>
                <option value="DENTAL">🔵 BDS (Dental)</option>
                <option value="AYUSH">🟤 AYUSH Streams</option>
              </select>
            </div>

            {dataSource === 'AIQ' && (
              <div className="field">
                <label>AIQ Seat Quota <button type="button" className="glossary-btn" onClick={() => setGlossaryOpen(true)} aria-label="What do these mean?">ⓘ</button></label>
                <select value={quotaFilter} onChange={(e) => setQuotaFilter(e.target.value)}>
                  <option value="ALL">All Quotas</option>
                  {dynamicQuotas.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>{dataSource === 'KEA' ? 'KEA Quota Category' : 'AIQ Seat Category'} <button type="button" className="glossary-btn" onClick={() => setGlossaryOpen(true)} aria-label="What do these mean?">ⓘ</button></label>
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
              <label>Allotment Year</label>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                <option value="ALL">All Years</option>
                {dynamicYears.map((y) => (
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
          <h4>👤 Saved Profiles</h4>
          <div className="profile-save-row">
            <input
              type="text"
              placeholder="Name (e.g. Me, Cousin)"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
            />
            <button onClick={saveCurrentAsProfile} disabled={!newProfileName.trim() || !userRank} title="Save current predictor rank/category/round as a profile">Save</button>
          </div>
          {profiles.length === 0 ? (
            <p className="empty-hint">Enter a rank on the Predictor tab, then save it here as a named profile for quick reloading later.</p>
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
          <h4>⭐ Saved Colleges ({savedColleges.length})</h4>
          {savedColleges.length === 0 ? (
            <p className="empty-hint">Tap the ☆ on any college to save it here.</p>
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
                <h3 className="home-section-heading">📊 Choose Your Data Source</h3>
                <div className="home-datasource-grid">
                  <button
                    className={`home-datasource-card${dataSource === 'KEA' ? ' active' : ''}`}
                    onClick={() => setDataSource('KEA')}
                  >
                    <span className="home-datasource-icon">🏛️</span>
                    <strong>KEA (Karnataka)</strong>
                    <p>State counselling — cutoffs, fees &amp; seat allotments across Karnataka's Medical, Dental &amp; AYUSH colleges.</p>
                    {dataSource === 'KEA' && <span className="home-datasource-badge">✓ Active</span>}
                  </button>
                  <button
                    className={`home-datasource-card${dataSource === 'AIQ' ? ' active' : ''}`}
                    onClick={() => setDataSource('AIQ')}
                  >
                    <span className="home-datasource-icon">🌐</span>
                    <strong>AIQ (All India)</strong>
                    <p>All India Quota counselling — cutoffs across MBBS &amp; BDS colleges nationwide, final round.</p>
                    {dataSource === 'AIQ' && <span className="home-datasource-badge">✓ Active</span>}
                  </button>
                </div>
              </div>

              <div className="home-hero">
                <div className="home-hero-text">
                  <h2>Predict. Plan. Prioritize.</h2>
                  <p>Your guide to {dataSource === 'AIQ' ? 'All India Quota' : 'Karnataka'} NEET UG counselling — {dataSource === 'AIQ' ? 'MBBS, BDS & AYUSH' : 'Medical, Dental & AYUSH'}, {dynamicYears.join('–')}.</p>
                </div>
                <div className="home-hero-actions">
                  <button className="home-cta primary" onClick={() => navigateTo('predictor')}>🎯 Predict</button>
                  <button className="home-cta" onClick={() => navigateTo('explore')}>🔍 Explore</button>
                </div>
              </div>

              <div className="home-search-section">
                <label className="home-search-label" htmlFor="home-search-input">🔍 Search a college by name or code</label>
                <div className="home-search-row">
                  <input
                    id="home-search-input"
                    type="text"
                    list="home-college-options"
                    placeholder="e.g. Bangalore Medical College, M001MG"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigateTo('explore'); }}
                  />
                  <datalist id="home-college-options">
                    {allCollegeNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <button onClick={() => navigateTo('explore')}>Search</button>
                </div>
              </div>

              <h3 className="home-section-heading">What you can do here</h3>
              <div className="home-feature-grid">
                <button className="home-feature-card" onClick={() => navigateTo('explore')}>
                  <span className="home-feature-icon">🔍</span>
                  <strong>Explore Cutoffs &amp; Fees</strong>
                  <p>Search and filter every seat allotment by stream, category, round, year, and budget.</p>
                </button>
                <button className="home-feature-card" onClick={() => navigateTo('predictor')}>
                  <span className="home-feature-icon">🎯</span>
                  <strong>Smart Predictor</strong>
                  <p>Enter your rank to see which colleges you realistically qualify for, with round &amp; year trends.</p>
                </button>
                <button className="home-feature-card" onClick={() => navigateTo('options')}>
                  <span className="home-feature-icon">📝</span>
                  <strong>Option Entry Generator</strong>
                  <p>Build and reorder your college preference list, just like the real KEA option entry form.</p>
                </button>
                <button className="home-feature-card" onClick={() => { navigateTo('explore'); }}>
                  <span className="home-feature-icon">☆</span>
                  <strong>Save &amp; Compare</strong>
                  <p>Bookmark colleges as you browse, then compare them side-by-side once you've shortlisted a few.</p>
                </button>
              </div>

              <div className="home-disclaimer">
                ⚠️ This is an independent, unofficial tool. Always cross-verify with the official{' '}
                <a href="https://kea.kar.nic.in" target="_blank" rel="noopener noreferrer">KEA website</a> before making decisions.
                See the <button className="inline-link-btn" onClick={() => navigateTo('contact')}>Contact &amp; About</button> page for details.
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
                      <input
                        type="text"
                        list="explore-college-options"
                        placeholder="Enter name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <datalist id="explore-college-options">
                        {exploreStreamCollegeNames.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>
                    <div className="field">
                      <label>Course Stream</label>
                      <select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
                        <option value="MEDICAL">🟢 MBBS (Medical)</option>
                        <option value="DENTAL">🔵 BDS (Dental)</option>
                        <option value="AYUSH">🟤 AYUSH Streams</option>
                      </select>
                    </div>
                    {dataSource === 'AIQ' && (
                      <div className="field">
                        <label>AIQ Seat Quota <button type="button" className="glossary-btn" onClick={() => setGlossaryOpen(true)} aria-label="What do these mean?">ⓘ</button></label>
                        <select value={quotaFilter} onChange={(e) => setQuotaFilter(e.target.value)}>
                          <option value="ALL">All Quotas</option>
                          {dynamicQuotas.map((q) => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="field">
                      <label>{dataSource === 'KEA' ? 'KEA Quota Category' : 'AIQ Seat Category'} <button type="button" className="glossary-btn" onClick={() => setGlossaryOpen(true)} aria-label="What do these mean?">ⓘ</button></label>
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
                      <label>Allotment Year</label>
                      <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                        <option value="ALL">All Years</option>
                        {dynamicYears.map((y) => (
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
                📊 Found <strong>{filteredDashboardData.length}</strong> matching college allotment paths.
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
                      >
                        Cutoff Rank{sortConfig.key === 'rank' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                      <th>Round</th>
                      <th>Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDashboardData.length === 0 ? (
                      <tr className="empty-row">
                        <td colSpan={showFees ? 10 : 9}>No allotment matching your criteria found. Adjust filters.</td>
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
                          <td>
                            <button
                              className={`add-option-btn${isInOptionList(item) ? ' added' : ''}`}
                              onClick={() => addToOptionList(item)}
                              aria-label="Add to option entry list"
                              title="Add to Option Entry List"
                            >
                              {isInOptionList(item) ? '✓' : '+'}
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
                          <td><span className="pill">{item.round}</span></td>
                          <td><span className="pill">{item.year}</span></td>
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
              <button className="back-home-btn" onClick={() => navigateTo('explore')}>
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
                        max="30000"
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
                    <select value={predictorStream} onChange={(e) => setPredictorStream(e.target.value)}>
                      <option value="MEDICAL">MBBS (Medical)</option>
                      <option value="DENTAL">BDS (Dental)</option>
                      <option value="AYUSH">AYUSH Courses</option>
                    </select>
                  </div>

                  {dataSource === 'AIQ' && (
                    <div className="field">
                      <label>AIQ Seat Quota <button type="button" className="glossary-btn" onClick={() => setGlossaryOpen(true)} aria-label="What do these mean?">ⓘ</button></label>
                      <select value={predictorQuota} onChange={(e) => setPredictorQuota(e.target.value)}>
                        <option value="ALL">All Quotas</option>
                        {dynamicQuotas.map((q) => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="field">
                    <label>{dataSource === 'KEA' ? 'Reservation Category' : 'AIQ Seat Category'} <button type="button" className="glossary-btn" onClick={() => setGlossaryOpen(true)} aria-label="What do these mean?">ⓘ</button></label>
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

                  <div className="field">
                    <label>Allotment Year</label>
                    <select value={predictorYear} onChange={(e) => setPredictorYear(e.target.value)}>
                      <option value="ALL">All Years</option>
                      {dynamicYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>🔍 Search a Specific College</label>
                    <input
                      type="text"
                      list="predictor-college-options"
                      placeholder="Start typing a college name..."
                      value={desiredCollegeName}
                      onChange={(e) => setDesiredCollegeName(e.target.value)}
                    />
                    <datalist id="predictor-college-options">
                      {predictorStreamCollegeNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                  
                  {/* Newly added visible Search Button */}
                  <div className="field">
                    <label>&nbsp;</label>
                    <button type="button" className="home-cta primary" style={{ width: '100%', height: '41px' }} onClick={() => {}}>
                      🔍 Search Matches
                    </button>
                  </div>
                </div>
              </div>

              {desiredCollegeCheck && (
                <div className={`desired-college-box ${desiredCollegeCheck.status}`}>
                  {desiredCollegeCheck.status === 'need_rank' && (
                    <p>ℹ️ Enter your NEET rank above to check if <strong>{desiredCollegeName}</strong> is within your reach.</p>
                  )}
                  {desiredCollegeCheck.status === 'notfound' && (
                    <p>🔍 No college matching "<strong>{desiredCollegeName}</strong>" found in the {predictorStream} stream. Check the spelling or try a shorter search term.</p>
                  )}
                  {desiredCollegeCheck.status === 'notfound_for_filters' && (
                    <p>🔍 <strong>{desiredCollegeName}</strong> exists in our data, but not under <strong>{predictorCategory}</strong> category for the selected round/year. Try "All Rounds" / "All Years", or a different category.</p>
                  )}
                  {desiredCollegeCheck.status === 'not_attainable' && (
                    <div>
                      <p>
                        😕 Sorry, <strong>{desiredCollegeCheck.record.collegeName}</strong> was not available for Rank {userRank} under these filters.
                        Its closest cutoff was <strong>{desiredCollegeCheck.record.rank.toLocaleString('en-IN')}</strong> ({desiredCollegeCheck.record.round} {desiredCollegeCheck.record.year}, {desiredCollegeCheck.record.category}) — you'd need a rank at or better than that.
                      </p>
                      {(() => {
                        const alternatives = predictedColleges
                          .filter((item) => item.collegeCode !== desiredCollegeCheck.record.collegeCode)
                          .slice(0, 3);
                        if (alternatives.length === 0) return null;
                        return (
                          <div className="similar-colleges-box">
                            <p className="similar-colleges-heading">💡 You might be attainable for these instead:</p>
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
                          <span className="result-code">✓ YOUR SEARCH · CODE: {item.collegeCode}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              className={`star-btn${isSaved(item) ? ' saved' : ''}`}
                              onClick={() => toggleSave(item)}
                              aria-label="Save college"
                            >
                              {isSaved(item) ? '★' : '☆'}
                            </button>
                            <button
                              className={`add-option-btn${isInOptionList(item) ? ' added' : ''}`}
                              onClick={() => addToOptionList(item)}
                              title="Add to Option Entry List"
                            >
                              {isInOptionList(item) ? '✓ Added' : '+ Add'}
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
                    🔄 {categoryCompareOpen ? 'Hide' : 'Compare'} Across My Eligible Categories
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
                  <h3 className="predicted-heading">💡 Predicted Eligible Target Opportunities</h3>
                  {predictedColleges.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="whatsapp-share-btn" onClick={sharePredictedResultsOnWhatsApp}>
                        💬 Share on WhatsApp
                      </button>
                      <button className="pdf-download-btn" onClick={downloadPredictedResultsPDF}>
                        📄 Download PDF
                      </button>
                    </div>
                  )}
                </div>
                <p className="predicted-sub">
                  {rankRange > 0 && userRank && !isNaN(userRank) ? (
                    <>Colleges where <strong>{predictorYear === 'ALL' ? "any year's" : predictorYear}</strong> <strong>{predictorRound === 'ALL' ? "any round's" : predictorRound}</strong> closing cutoff falls within ranks <strong>{Math.max(1, parseInt(userRank, 10) - rankRange).toLocaleString('en-IN')}</strong> to <strong>{(parseInt(userRank, 10) + rankRange).toLocaleString('en-IN')}</strong> (±{rankRange.toLocaleString('en-IN')} of Rank {userRank}):</>
                  ) : (
                    <>Colleges where <strong>{predictorYear === 'ALL' ? "any year's" : predictorYear}</strong> <strong>{predictorRound === 'ALL' ? "any round's" : predictorRound}</strong> closing cutoff scores matched higher than or equal to Rank <strong>{userRank || '0'}</strong>:</>
                  )}
                </p>

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
              </div>
            </div>
          )}

          {/* --- FEATURE 3: OPTION ENTRY GENERATOR --- */}
          {activeTab === 'options' && (
            <div>
              <div className="option-intro">
                <h3>📝 Build Your Option Entry List</h3>
                <p>
                  During real KEA counselling, you rank your preferred colleges in order — this is your practice space.
                  Add colleges from the <button className="inline-link-btn" onClick={() => navigateTo('explore')}>Explore</button> or{' '}
                  <button className="inline-link-btn" onClick={() => navigateTo('predictor')}>Predictor</button> tabs using the
                  "+ Add" button, then reorder them here by priority.
                </p>
              </div>

              {optionEntries.length === 0 ? (
                <div className="option-empty-state">
                  <span className="option-empty-icon">📝</span>
                  <h4>Your preference list starts here</h4>
                  <p>
                    Think of this as a practice run for KEA's real "Option Entry" step — where you'll rank
                    every college you'd accept, in order of preference, before the actual counselling round.
                  </p>
                  <p className="option-empty-steps">
                    Browse colleges on <strong>Explore</strong> or check your matches on <strong>Predictor</strong>,
                    then tap the <span className="pill">+ Add</span> button on any college — it'll show up right here, ready to reorder.
                  </p>
                  <div className="option-empty-actions">
                    <button className="home-cta primary" onClick={() => navigateTo('explore')}>🔍 Go to Explore</button>
                    <button className="home-cta" onClick={() => navigateTo('predictor')}>🎯 Go to Predictor</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="option-toolbar">
                    <span>{optionEntries.length} college{optionEntries.length !== 1 ? 's' : ''} in your list</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="whatsapp-share-btn" onClick={shareOptionListOnWhatsApp}>
                        💬 Share on WhatsApp
                      </button>
                      <button className="pdf-download-btn" onClick={downloadOptionListPDF}>
                        📄 Download PDF
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
                          <button onClick={() => moveOption(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                          <button onClick={() => moveOption(i, 1)} disabled={i === optionEntries.length - 1} aria-label="Move down">↓</button>
                          <button onClick={() => removeFromOptionList(o.id)} className="remove-option-btn" aria-label="Remove">✕</button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <p className="option-disclaimer">
                    ⚠️ This list is for your own planning only. It is not submitted anywhere — you must still enter your
                    official options on the KEA counselling portal.
                  </p>
                </>
              )}
            </div>
          )}

          {/* --- FEATURE 4: CONTACT & ABOUT --- */}
          {activeTab === 'contact' && (
            <div className="contact-view">
              
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