import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  Target,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Share2,
  FileText,
  Copy,
  Check,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Landmark,
  Wallet,
  MapPin,
  Layers,
  Info,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';

// Expanded category eligibility according to KEA & AIQ Counselling seat allotment rules
export function getEligibleCategories(userCategory, dataset = 'KEA') {
  const cat = (userCategory || (dataset === 'AIQ' ? 'GN' : 'GM')).trim();
  const catUpper = cat.toUpperCase();
  const eligible = new Set();

  if (dataset === 'AIQ') {
    // Open / General merit is available to all candidates in AIQ
    eligible.add('GN');
    eligible.add('Open');
    eligible.add('OPN');
    eligible.add(cat);
    eligible.add(catUpper);

    if (catUpper.includes('OBC') || catUpper.includes('BC')) {
      eligible.add('OBC');
      eligible.add('BC');
      eligible.add('OBC-NCL');
    }
    if (catUpper.includes('EWS') || catUpper.includes('EW')) {
      eligible.add('EWS');
      eligible.add('EW');
    }
    if (catUpper.includes('SC')) {
      eligible.add('SC');
    }
    if (catUpper.includes('ST')) {
      eligible.add('ST');
    }
    return eligible;
  }

  // KEA Category Expansion
  eligible.add('GM');
  eligible.add('GMP');
  eligible.add('OPN');
  eligible.add(cat);
  eligible.add(catUpper);

  if (catUpper === 'GM') return eligible;

  // Rural quota: eligible for GMR, parent category General, and parent base
  if (catUpper.endsWith('R')) {
    eligible.add('GMR');
    const base = catUpper.slice(0, -1);
    eligible.add(base + 'G');
    eligible.add(base);
  }

  // Kannada Medium quota
  if (catUpper.endsWith('K')) {
    eligible.add('GMK');
    const base = catUpper.slice(0, -1);
    eligible.add(base + 'G');
    eligible.add(base);
  }

  // Hyderabad-Karnataka / 371(J) quota
  if (catUpper.endsWith('H')) {
    eligible.add('GMH');
    eligible.add('GMPH');
    const base = catUpper.slice(0, -1);
    eligible.add(base);
    if (base.endsWith('R')) eligible.add('GMRH');
    if (base.endsWith('K')) eligible.add('GMKH');
  }

  // General quota of category
  if (catUpper.endsWith('G')) {
    const base = catUpper.slice(0, -1);
    eligible.add(base);
  }

  // Category families
  if (catUpper.startsWith('3B')) { eligible.add('3B'); eligible.add('3BG'); }
  if (catUpper.startsWith('3A')) { eligible.add('3A'); eligible.add('3AG'); }
  if (catUpper.startsWith('2B')) { eligible.add('2B'); eligible.add('2BG'); }
  if (catUpper.startsWith('2A')) { eligible.add('2A'); eligible.add('2AG'); }
  if (catUpper.startsWith('1'))  { eligible.add('1');  eligible.add('1G'); }
  if (catUpper.startsWith('SC')) { eligible.add('SC'); eligible.add('SCG'); }
  if (catUpper.startsWith('ST')) { eligible.add('ST'); eligible.add('STG'); }

  return eligible;
}

// Special reservation quotas to exclude from general calculation unless candidate specifically belongs to them
export const SPECIAL_QUOTAS = new Set(['PH', 'PHM', 'XD', 'SPO', 'NCC', 'DEF', 'JK', 'SP', 'DF']);

// Fee tier bracket helper: lower amount = lower tier number (1 is cheapest)
// "less amount give first": Govt (1) -> Govt in Pvt (2) -> Private (3) -> High/Management (4)
export function getFeeTier(fees, stream) {
  const f = Number(fees) || 0;
  if (stream === 'DENTAL') {
    if (f <= 65000) return 1; // Govt Dental (~₹50k)
    if (f <= 150000) return 2; // Govt Quota in Pvt Dental (~₹96k)
    if (f <= 600000) return 3; // Standard Private Dental (~₹4-5L)
    return 4; // High / Deemed / Management Dental
  }
  if (stream === 'AYUSH') {
    if (f <= 75000) return 1; // Govt AYUSH (~₹25k-₹65k)
    if (f <= 175000) return 2; // Govt Quota in Pvt AYUSH (~₹1.5L)
    if (f <= 400000) return 3; // Standard Private AYUSH (~₹3L)
    return 4; // High / Management AYUSH
  }
  // MEDICAL (MBBS)
  if (f <= 75000) return 1; // Govt Medical Colleges (BMC, MMC, etc. ~₹65k)
  if (f <= 175000) return 2; // Govt Quota in Private Colleges (~₹1.5L)
  if (f <= 1300000) return 3; // Standard Private Quota (~₹12L)
  return 4; // High Quotas / Deemed / NRI / Management (₹22L - ₹45L+)
}

// Stream-tailored fee brackets according to real KEA & AIQ fee structures
export const BUDGET_OPTIONS_BY_STREAM = {
  MEDICAL: [
    { value: 50000000, label: 'No Fee Limit (Any Budget / Up to ₹50L+)' },
    { value: 4550000, label: 'Up to ₹45 Lakh / yr (Institutional / NRI / MNG Quota)' },
    { value: 3800000, label: 'Up to ₹38 Lakh / yr (Deemed / High Quotas)' },
    { value: 2600000, label: 'Up to ₹26 Lakh / yr (Ramaiah / Sapthagiri / PES Private Quota)' },
    { value: 1650000, label: 'Up to ₹16.5 Lakh / yr (Higher Private Quota)' },
    { value: 1250000, label: 'Up to ₹12.5 Lakh / yr (Standard ₹12L Private MBBS)' },
    { value: 165000, label: 'Up to ₹1.65 Lakh / yr (Govt Quota in Private Colleges)' },
    { value: 75000, label: 'Up to ₹75,000 / yr (Government Colleges Only)' },
  ],
  DENTAL: [
    { value: 50000000, label: 'No Fee Limit (Any Budget / All Dental Quotas)' },
    { value: 1100000, label: 'Up to ₹11 Lakh / yr (Deemed / Management Dental)' },
    { value: 870000, label: 'Up to ₹8.7 Lakh / yr (Higher Private Dental Quota)' },
    { value: 500000, label: 'Up to ₹5 Lakh / yr (Standard Private Dental Quota)' },
    { value: 125000, label: 'Up to ₹1.25 Lakh / yr (Govt Quota in Private Dental)' },
    { value: 75000, label: 'Up to ₹75,000 / yr (Government Dental Colleges Only)' },
  ],
  AYUSH: [
    { value: 50000000, label: 'No Fee Limit (Any Budget / All AYUSH Quotas)' },
    { value: 650000, label: 'Up to ₹6.5 Lakh / yr (Higher Private / Deemed AYUSH)' },
    { value: 350000, label: 'Up to ₹3.5 Lakh / yr (Standard Private AYUSH Quota)' },
    { value: 150000, label: 'Up to ₹1.5 Lakh / yr (Govt Quota in Private AYUSH)' },
    { value: 65000, label: 'Up to ₹65,000 / yr (Government AYUSH Colleges Only)' },
  ],
};

export default function AiOptionAnalyser({
  dataSource,
  dynamicCategories,
  initialRank,
  initialCategory,
  initialStream,
  formatCategory,
  formatFees,
  showFees,
  onApplyToOptionList,
  existingOptionEntries,
  setSelectedCollege,
  navigateTo
}) {
  const safeFormatCategory = typeof formatCategory === 'function' ? formatCategory : (c) => c;
  const safeFormatFees = typeof formatFees === 'function' ? formatFees : (f) => f ? `₹${Number(f).toLocaleString('en-IN')}` : 'N/A';

  const categoriesList = useMemo(() => {
    if (Array.isArray(dynamicCategories) && dynamicCategories.length > 0) {
      return dynamicCategories;
    }
    return dataSource === 'AIQ'
      ? ['GN', 'Open', 'OBC', 'BC', 'EWS', 'EW', 'SC', 'ST']
      : ['GM', '1G', '2A', '2B', '3A', '3B', 'SCG', 'STG'];
  }, [dynamicCategories, dataSource]);

  // Questionnaire states
  const [rankInput, setRankInput] = useState(initialRank || '');
  const [category, setCategory] = useState(initialCategory || (dataSource === 'AIQ' ? 'GN' : 'GM'));
  const [stream, setStream] = useState(initialStream || 'MEDICAL');
  const [collegeType, setCollegeType] = useState('ALL_QUOTAS'); // GOVT_ONLY | GOVT_PVT_GOVT_FEE | ALL_QUOTAS
  const [maxBudget, setMaxBudget] = useState(50000000); // Default to no fee limit (all budgets)
  const [regionPriority, setRegionPriority] = useState('ALL'); // ALL | BLR | MLR | NORTH | MYS | AIQ_KA | AIQ_SOUTH
  const [optionsCount, setOptionsCount] = useState(80); // 25 | 40 | 60 | 80 | 100 | 999 (All)

  // Analysis result states
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generatedList, setGeneratedList] = useState([]);
  const [appliedNotification, setAppliedNotification] = useState(false);

  // Sync if initialRank prop changes and user hasn't typed
  useEffect(() => {
    if (initialRank && !rankInput) {
      setRankInput(initialRank);
    }
  }, [initialRank]);

  // Switch stream and reset budget to appropriate default
  const handleStreamChange = (newStream) => {
    setStream(newStream);
    setMaxBudget(50000000);
  };

  // Adjust budget automatically when collegeType changes
  const handleCollegeTypeChange = (type) => {
    setCollegeType(type);
    if (type === 'GOVT_ONLY') {
      setMaxBudget(75000);
    } else if (type === 'GOVT_PVT_GOVT_FEE') {
      setMaxBudget(165000);
    } else if (type === 'ALL_QUOTAS') {
      setMaxBudget(50000000);
    }
  };

  // Generate strategy list following official KEA & AIQ Counselling seat allotment guidelines
  const generateAiOptionEntry = async () => {
    const parsedRank = parseInt(rankInput, 10);
    if (!parsedRank || isNaN(parsedRank) || parsedRank <= 0) {
      alert('Please enter a valid NEET All India Rank to analyse options.');
      return;
    }

    setLoading(true);
    setHasGenerated(false);
    setAppliedNotification(false);

    try {
      const eligibleCategories = getEligibleCategories(category, dataSource);
      const catList = Array.from(eligibleCategories).join(',');
      const isUserSpecialQuota = SPECIAL_QUOTAS.has((category || '').toUpperCase());

      const baseParams = {
        dataset: dataSource,
        stream: stream,
      };

      if (category !== 'ALL') {
        baseParams.category = catList;
      }

      if (maxBudget < 50000000) {
        baseParams.maxBudget = maxBudget;
      }

      let rawRecords = [];

      try {
        if (parsedRank <= 50000) {
          const params = new URLSearchParams({
            ...baseParams,
            minRank: 1,
            maxRank: Math.max(100000, parsedRank + 40000),
            limit: 8000,
            sort: 'rank',
            order: 'asc'
          });
          const res = await fetch(`/api/allotments?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            rawRecords = data.data || [];
          }
        } else {
          // Parallel dual slice fetch for ranks > 50,000 (e.g. 173,789):
          // Slice 1: Premier Dream Colleges (BMC, MMC, ABVIMS, KIMS, etc. up to 50k)
          // Slice 2: Target & Safe Colleges around candidate rank (candidate - 60k onwards)
          const paramsDream = new URLSearchParams({
            ...baseParams,
            minRank: 1,
            maxRank: 50000,
            limit: 5000,
            sort: 'rank',
            order: 'asc'
          });

          const paramsTarget = new URLSearchParams({
            ...baseParams,
            minRank: Math.max(1, parsedRank - 60000),
            limit: 5000,
            sort: 'rank',
            order: 'asc'
          });

          const [resDream, resTarget] = await Promise.all([
            fetch(`/api/allotments?${paramsDream.toString()}`).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
            fetch(`/api/allotments?${paramsTarget.toString()}`).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
          ]);

          rawRecords = [...(resDream.data || []), ...(resTarget.data || [])];
        }
      } catch (fetchErr) {
        console.warn('API fetch error, trying static fallback:', fetchErr);
      }

      // Offline / Local fallback if API returned no data
      if (!rawRecords || rawRecords.length === 0) {
        try {
          const fallbackUrl = dataSource === 'AIQ'
            ? '/data/aiq_compiled_allotments.json'
            : '/data/compiled_allotments.json';
          const localRes = await fetch(fallbackUrl);
          if (localRes.ok) {
            const localData = await localRes.json();
            rawRecords = localData.filter(d =>
              d.stream === stream &&
              eligibleCategories.has(d.category) &&
              (!maxBudget || maxBudget >= 50000000 || !d.fees || d.fees <= maxBudget)
            );
          }
        } catch (fallbackErr) {
          console.warn('Static data fallback error:', fallbackErr);
        }
      }

      // Group by distinct KEA/AIQ Option (collegeCode + courseDetails)
      const optionsMap = new Map();

      rawRecords.forEach((item) => {
        if (!item.collegeCode || !item.rank) return;
        if (!eligibleCategories.has(item.category)) return;

        // Skip handicap/disability special quotas unless candidate explicitly selected that category
        if (!isUserSpecialQuota && SPECIAL_QUOTAS.has(item.category)) return;

        // Fee budget filter: strict user-chosen upper limit
        if (maxBudget < 50000000 && item.fees && item.fees > maxBudget) return;

        // Seat type filtering based on candidate's quota preference
        if (collegeType === 'GOVT_ONLY') {
          const isGovtFee = item.fees && item.fees <= 75000;
          const isGovtCourse = item.courseDetails && (item.courseDetails.includes('GOVT') || item.courseDetails.includes('Govt'));
          if (!isGovtFee && !isGovtCourse) return;
        } else if (collegeType === 'GOVT_PVT_GOVT_FEE') {
          if (item.fees && item.fees > 165000) return;
        }

        const optionKey = `${item.collegeCode}_${item.courseDetails || 'DEFAULT'}`;

        if (!optionsMap.has(optionKey)) {
          optionsMap.set(optionKey, {
            collegeCode: item.collegeCode,
            collegeName: item.collegeName,
            courseDetails: item.courseDetails,
            category: item.category,
            fees: item.fees || 0,
            stream: item.stream,
            round: item.round,
            year: item.year,
            allRanks: [item.rank]
          });
        } else {
          const existing = optionsMap.get(optionKey);
          existing.allRanks.push(item.rank);
          if (item.fees && (!existing.fees || existing.fees === 0)) {
            existing.fees = item.fees;
          }
        }
      });

      const uniqueOptions = Array.from(optionsMap.values());

      // Region weight helper
      const matchesRegion = (collegeName, reg) => {
        if (!collegeName) return false;
        const name = collegeName.toLowerCase();
        if (reg === 'BLR') return name.includes('bangalore') || name.includes('bengaluru');
        if (reg === 'MLR') return name.includes('mangalore') || name.includes('mangaluru') || name.includes('udupi') || name.includes('dakshina kannada');
        if (reg === 'MYS') return name.includes('mysore') || name.includes('mysuru') || name.includes('mandya') || name.includes('hassan');
        if (reg === 'NORTH') return name.includes('belgaum') || name.includes('belagavi') || name.includes('hubli') || name.includes('dharwad') || name.includes('gulbarga') || name.includes('kalaburagi');
        return true;
      };

      // Representative cutoff & Tier classification
      const classified = uniqueOptions.map((c) => {
        c.allRanks.sort((a, b) => a - b);
        // Cutoff is the 90th percentile of normal allotments (closing rank)
        const p90Index = Math.min(c.allRanks.length - 1, Math.floor(c.allRanks.length * 0.9));
        const cutoff = c.allRanks[p90Index];

        const margin = cutoff - parsedRank;
        let tier = 'DREAM';
        let tierLabel = 'Premier Ambition';
        let tierDesc = 'High ambition choice — in KEA, always place top colleges first with zero penalty as choices roll down.';

        if (cutoff >= parsedRank - 18000 && cutoff <= parsedRank + 30000) {
          tier = 'TARGET';
          tierLabel = 'Target Match';
          tierDesc = 'High probability match — historical allotments fall right within your rank window.';
        } else if (cutoff > parsedRank + 30000) {
          tier = 'SAFE';
          tierLabel = 'Safe Backup';
          tierDesc = 'Solid safety net — ensures you secure a seat without risk of exiting counselling empty-handed.';
        }

        return {
          ...c,
          rank: cutoff,
          margin,
          tier,
          tierLabel,
          tierDesc,
          inPreferredRegion: regionPriority === 'ALL' ? true : matchesRegion(c.collegeName, regionPriority)
        };
      });

      // Sort with strict counselling hierarchy:
      // "make sure u give the order as per rank, then amount, less amount give first"
      classified.sort((a, b) => {
        // Rule 1: Premier institutes benchmark (Bangalore Medical College M001MG is ALWAYS #1 for Medical)
        if (stream === 'MEDICAL') {
          if (a.collegeCode === 'M001MG') return -1;
          if (b.collegeCode === 'M001MG') return 1;
        } else if (stream === 'DENTAL') {
          if (a.collegeCode === 'D101DG') return -1;
          if (b.collegeCode === 'D101DG') return 1;
        }

        // Rule 2: Seat type fee tiers ("less amount give first")
        // Govt seats (Tier 1: ~₹65k) -> Govt in Pvt (Tier 2: ~₹1.5L) -> Private (Tier 3: ~₹12L) -> High/NRI (Tier 4: ~₹25L+)
        const feeTierA = getFeeTier(a.fees, stream);
        const feeTierB = getFeeTier(b.fees, stream);
        if (feeTierA !== feeTierB) {
          return feeTierA - feeTierB;
        }

        // Rule 3: Regional preference within close cutoff ranks (within 4,000 ranks)
        if (regionPriority !== 'ALL' && a.inPreferredRegion !== b.inPreferredRegion) {
          const rankGap = Math.abs(a.rank - b.rank);
          if (rankGap < 4000) {
            return a.inPreferredRegion ? -1 : 1;
          }
        }

        // Rule 4: Cutoff rank prestige (lower rank = higher demand = higher priority)
        const rankDiff = a.rank - b.rank;
        if (Math.abs(rankDiff) > 2500) {
          return rankDiff;
        }

        // Rule 5: "less amount give first" (cheaper fee comes first when cutoffs are close)
        const feeDiff = (a.fees || 0) - (b.fees || 0);
        if (feeDiff !== 0) {
          return feeDiff;
        }

        return rankDiff;
      });

      // Slice to user's desired options count (or all options if 999)
      const sliced = optionsCount >= 900 ? classified : classified.slice(0, optionsCount);
      const finalList = sliced.map((item, index) => ({
        ...item,
        priority: index + 1
      }));

      setGeneratedList(finalList);
      setHasGenerated(true);
    } catch (err) {
      console.error('Error generating AI option list:', err);
      alert('Could not fetch allotment data. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Copy/Apply AI list into main user option entry list
  const handleApplyToMainList = (mode = 'append') => {
    if (generatedList.length === 0) return;

    const formattedEntries = generatedList.map((item) => ({
      id: `${item.collegeCode}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      collegeCode: item.collegeCode,
      collegeName: item.collegeName,
      courseDetails: item.courseDetails || `${stream}-GOVT`,
      category: item.category || category,
      fees: item.fees || 0,
      round: item.round || 'R1',
      year: item.year || '2026',
      rank: item.rank,
      stream: stream
    }));

    if (mode === 'replace') {
      onApplyToOptionList(formattedEntries);
    } else {
      // Append only unique ones
      const existingCodes = new Set(existingOptionEntries.map((e) => e.collegeCode));
      const newItems = formattedEntries.filter((e) => !existingCodes.has(e.collegeCode));
      onApplyToOptionList([...existingOptionEntries, ...newItems]);
    }

    setAppliedNotification(true);
    setTimeout(() => setAppliedNotification(false), 3000);
  };

  // WhatsApp share
  const shareAiListOnWhatsApp = () => {
    if (generatedList.length === 0) return;
    const lines = generatedList.map(
      (item) => `P${item.priority}. ${item.collegeCode} - ${item.collegeName.split(',')[0]} [${item.tierLabel} | Cutoff: ${item.rank.toLocaleString('en-IN')}]`
    );

    const message = `*NammaUGNEET — AI Recommended Option Entry List*\nRank: ${parseInt(rankInput, 10).toLocaleString('en-IN')} | Category: ${category} | Stream: ${stream}\n\n${lines.join('\n')}\n\nGenerated with NammaUGNEET AI Analyser: https://namma-ugneet-portal.vercel.app/#options`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  // PDF Export
  const downloadAiListPDF = async () => {
    if (generatedList.length === 0) return;
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Header
    doc.setFillColor(27, 42, 74);
    doc.rect(0, 0, pageW, 26, 'F');
    doc.setFillColor(232, 163, 61);
    doc.rect(0, 26, pageW, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('NammaUGNEET — AI Option Entry Analyser', margin, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Candidate Rank: ${parseInt(rankInput, 10).toLocaleString('en-IN')} | Category: ${category} | Stream: ${stream}`, margin, 19);

    let y = 36;
    doc.setTextColor(27, 42, 74);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Prioritised College Preference List', margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(91, 100, 114);
    doc.text('Ordered by KEA golden counselling strategy (Premier Ambition -> Target Matches -> Safe Backups)', margin, y);
    y += 6;

    // Table Header
    doc.setFillColor(241, 236, 224);
    doc.rect(margin, y, pageW - margin * 2, 7, 'F');
    doc.setTextColor(27, 42, 74);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('PRIORITY', margin + 2, y + 5);
    doc.text('CODE', margin + 20, y + 5);
    doc.text('INSTITUTION NAME', margin + 38, y + 5);
    doc.text('CUTOFF', margin + 125, y + 5);
    doc.text('TIER', margin + 150, y + 5);
    y += 9;

    // Table rows
    generatedList.forEach((item) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(27, 42, 74);
      doc.text(`#${item.priority}`, margin + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.text(item.collegeCode || '', margin + 20, y);

      const name = doc.splitTextToSize(item.collegeName ? item.collegeName.split(',')[0] : '', 80);
      doc.text(name[0] || '', margin + 38, y);

      doc.text(item.rank ? item.rank.toLocaleString('en-IN') : '-', margin + 125, y);

      if (item.tier === 'DREAM') doc.setTextColor(109, 40, 217);
      else if (item.tier === 'TARGET') doc.setTextColor(180, 83, 9);
      else doc.setTextColor(21, 128, 61);

      doc.setFont('helvetica', 'bold');
      doc.text(item.tier, margin + 150, y);

      y += 6;
    });

    // Disclaimer footer
    if (y < 275) {
      y += 8;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(140, 140, 140);
      doc.text('Note: This list is generated algorithmically for practice and personal counselling guidance only.', margin, y);
    }

    doc.save(`NammaUGNEET-AI-Option-Entry-Rank-${rankInput}.pdf`);
  };

  // Tier counts
  const dreamCount = useMemo(() => generatedList.filter((c) => c.tier === 'DREAM').length, [generatedList]);
  const targetCount = useMemo(() => generatedList.filter((c) => c.tier === 'TARGET').length, [generatedList]);
  const safeCount = useMemo(() => generatedList.filter((c) => c.tier === 'SAFE').length, [generatedList]);

  return (
    <div className="ai-analyser-wrap">
      {/* Questionnaire Card */}
      <div className="ai-questionnaire-card">
        <div className="ai-card-header">
          <div className="ai-header-icon-wrap">
            <Sparkles className="lucide-icon" size={22} />
          </div>
          <div>
            <h3 className="ai-card-title">AI Option Entry Strategy Generator</h3>
            <p className="ai-card-subtitle">
              Answer 5 quick questions. The algorithm will structure your list following official KEA counselling rules: 
              <strong> Premier Ambition choices first</strong> (like BMCRI/MMCRI), followed by <strong>Target Matches</strong>, and <strong>Safe Backups</strong>.
            </p>
          </div>
        </div>

        <div className="ai-form-grid">
          {/* Question 1: NEET Rank */}
          <div className="ai-field">
            <label>
              <Target size={14} className="lucide-icon" /> 1. Your NEET All India Rank
            </label>
            <input
              type="number"
              placeholder="e.g. 15420"
              value={rankInput}
              onChange={(e) => setRankInput(e.target.value)}
              className="ai-input"
            />
          </div>

          {/* Question 2: Category */}
          <div className="ai-field">
            <label>
              <Layers size={14} className="lucide-icon" /> 2. Reservation / Quota Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="ai-select"
            >
              {categoriesList.map((c) => (
                <option key={c} value={c}>
                  {c} {c === 'GM' ? '(General Merit)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Question 3: Stream */}
          <div className="ai-field">
            <label>
              <Landmark size={14} className="lucide-icon" /> 3. Desired Course Stream
            </label>
            <select
              value={stream}
              onChange={(e) => handleStreamChange(e.target.value)}
              className="ai-select"
            >
              <option value="MEDICAL">MBBS (Medical)</option>
              <option value="DENTAL">BDS (Dental)</option>
              <option value="AYUSH">AYUSH Streams</option>
            </select>
          </div>

          {/* Question 4: Institution & Quota Type */}
          <div className="ai-field">
            <label>
              <ShieldCheck size={14} className="lucide-icon" /> 4. Seat / College Type Preference
            </label>
            <select
              value={collegeType}
              onChange={(e) => handleCollegeTypeChange(e.target.value)}
              className="ai-select"
            >
              <option value="ALL_QUOTAS">All Seats (Govt + Private + Institutional Quota)</option>
              <option value="GOVT_ONLY">Government Colleges Only (Fee ≤ ₹75,000/yr)</option>
              <option value="GOVT_PVT_GOVT_FEE">Govt + Private Colleges with Govt Quota (Fee ≤ ₹1.65 Lakh/yr)</option>
            </select>
          </div>

          {/* Question 5: Maximum Annual Fee / Budget Limit (Stream-Specific) */}
          <div className="ai-field">
            <label>
              <Wallet size={14} className="lucide-icon" /> 5. Max Annual Fee Budget Limit ({stream === 'MEDICAL' ? 'MBBS' : stream === 'DENTAL' ? 'BDS' : 'AYUSH'})
            </label>
            <select
              value={maxBudget}
              onChange={(e) => setMaxBudget(parseInt(e.target.value, 10))}
              className="ai-select"
            >
              {(BUDGET_OPTIONS_BY_STREAM[stream] || BUDGET_OPTIONS_BY_STREAM.MEDICAL).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Question 6: Regional Priority */}
          <div className="ai-field">
            <label>
              <MapPin size={14} className="lucide-icon" /> 6. Preferred Location Focus
            </label>
            <select
              value={regionPriority}
              onChange={(e) => setRegionPriority(e.target.value)}
              className="ai-select"
            >
              {dataSource === 'AIQ' ? (
                <>
                  <option value="ALL">All India (Strict Nationwide Cutoff Order)</option>
                  <option value="AIQ_KA">Karnataka Colleges First</option>
                  <option value="AIQ_SOUTH">South India (Karnataka, TN, Kerala, AP, TS) First</option>
                </>
              ) : (
                <>
                  <option value="ALL">All Karnataka (Strict Statewide Cutoff Order)</option>
                  <option value="BLR">Bengaluru First (Bangalore colleges prioritized)</option>
                  <option value="MLR">Coastal / Mangaluru Region First</option>
                  <option value="MYS">Mysuru & Southern Karnataka First</option>
                  <option value="NORTH">North Karnataka / Belagavi / Hubballi First</option>
                </>
              )}
            </select>
          </div>

          {/* Question 7: Output list length */}
          <div className="ai-field">
            <label>
              <SlidersHorizontal size={14} className="lucide-icon" /> 7. Options Count to Generate
            </label>
            <select
              value={optionsCount}
              onChange={(e) => setOptionsCount(parseInt(e.target.value, 10))}
              className="ai-select"
            >
              <option value={999}>All Eligible Options (Full Sequence — Recommended)</option>
              <option value={100}>Top 100 Options (Extended Comprehensive)</option>
              <option value={80}>Top 80 Options (Comprehensive)</option>
              <option value={60}>Top 60 Options (Standard)</option>
              <option value={40}>Top 40 Options (Target & Safety Focus)</option>
              <option value={25}>Top 25 Options (Core Premier Ambition)</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="ai-action-bar">
          <button
            type="button"
            className="ai-generate-btn"
            onClick={generateAiOptionEntry}
            disabled={loading}
          >
            {loading ? (
              <>
                <Wand2 className="lucide-icon ai-spin" size={18} />
                <span>Analysing Cutoffs & Ranking Options...</span>
              </>
            ) : (
              <>
                <Sparkles className="lucide-icon" size={18} />
                <span>Generate Smart Option Entry Order</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Results Area */}
      {hasGenerated && (
        <div className="ai-results-section">
          {/* Strategy Summary Bar */}
          <div className="ai-strategy-card">
            <div className="ai-strategy-top">
              <div>
                <span className="ai-badge-header">Strategy Breakdown</span>
                <h4 className="ai-strategy-title">
                  Recommended Sequence for NEET Rank {parseInt(rankInput, 10).toLocaleString('en-IN')} ({category})
                </h4>
              </div>
              <div className="ai-tier-pills">
                <span className="ai-tier-chip dream">
                  <TrendingUp size={13} className="lucide-icon" /> Dream: {dreamCount}
                </span>
                <span className="ai-tier-chip target">
                  <Target size={13} className="lucide-icon" /> Target: {targetCount}
                </span>
                <span className="ai-tier-chip safe">
                  <ShieldCheck size={13} className="lucide-icon" /> Safe: {safeCount}
                </span>
              </div>
            </div>

            <p className="ai-strategy-note">
              <Info size={15} className="lucide-icon" /> In KEA counselling, there is <strong>zero disadvantage</strong> to placing top institutes (like Bangalore Medical College) at the very top. Options are evaluated in sequential order — if an early choice is unavailable, you automatically roll over to the next option without losing eligibility.
            </p>

            {/* Action Buttons Toolbar */}
            <div className="ai-export-toolbar">
              <div className="ai-export-left">
                <button
                  type="button"
                  className="ai-btn-primary"
                  onClick={() => handleApplyToMainList('append')}
                  title="Copy these choices into your Custom Option Entry List"
                >
                  <Copy size={16} className="lucide-icon" />
                  <span>Import to My Option List</span>
                </button>
                <button
                  type="button"
                  className="ai-btn-secondary"
                  onClick={() => handleApplyToMainList('replace')}
                  title="Replace all existing options with this AI list"
                >
                  <RotateCcw size={16} className="lucide-icon" />
                  <span>Replace My List</span>
                </button>
              </div>

              <div className="ai-export-right">
                <button
                  type="button"
                  className="ai-share-btn"
                  onClick={shareAiListOnWhatsApp}
                  title="Share this list on WhatsApp"
                >
                  <Share2 size={16} className="lucide-icon" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  className="ai-pdf-btn"
                  onClick={downloadAiListPDF}
                  title="Download clean printable PDF"
                >
                  <FileText size={16} className="lucide-icon" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            {appliedNotification && (
              <div className="ai-toast-message">
                <CheckCircle2 size={16} className="lucide-icon" />
                Successfully synced choices into your Custom Option Entry List!
              </div>
            )}
          </div>

          {/* Generated Ordered List */}
          <div className="ai-ordered-list">
            {generatedList.map((item) => (
              <div key={item.priority} className={`ai-list-card tier-${item.tier.toLowerCase()}`}>
                <div className="ai-card-priority-badge">
                  <span>Priority</span>
                  <strong>#{item.priority}</strong>
                </div>

                <div className="ai-card-content">
                  <div className="ai-card-top-row">
                    <span className="ai-code-pill">CODE: {item.collegeCode}</span>
                    <span className={`ai-tier-stamp ${item.tier.toLowerCase()}`}>
                      {item.tierLabel}
                    </span>
                  </div>

                  <h5
                    className="ai-college-title"
                    onClick={() =>
                      setSelectedCollege({
                        collegeCode: item.collegeCode,
                        stream: item.stream,
                        collegeName: item.collegeName
                      })
                    }
                  >
                    {item.collegeName}
                  </h5>

                  <div className="ai-card-meta-row">
                    <span>{item.courseDetails || 'MBBS-GOVT'}</span>
                    <span>·</span>
                    <span>Quota: {safeFormatCategory(item.category)}</span>
                    {showFees && (
                      <>
                        <span>·</span>
                        <span className="ai-fee-highlight">Fee: {safeFormatFees(item.fees)}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="ai-cutoff-val">
                      Cutoff: <strong>{item.rank ? item.rank.toLocaleString('en-IN') : 'N/A'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
