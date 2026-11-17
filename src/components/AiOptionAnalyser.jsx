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
    return ['GM', '1G', '2A', '2B', '3A', '3B', 'SCG', 'STG'];
  }, [dynamicCategories]);

  // Questionnaire states
  const [rankInput, setRankInput] = useState(initialRank || '');
  const [category, setCategory] = useState(initialCategory || 'GM');
  const [stream, setStream] = useState(initialStream || 'MEDICAL');
  const [collegeType, setCollegeType] = useState('GOVT_PVT_GOVT_FEE'); // GOVT_ONLY | GOVT_PVT_GOVT_FEE | ALL_QUOTAS
  const [maxBudget, setMaxBudget] = useState(160000);
  const [regionPriority, setRegionPriority] = useState('ALL'); // ALL | BLR | MLR | NORTH | MYS
  const [optionsCount, setOptionsCount] = useState(25); // 15 | 25 | 40 | 60

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

  // Adjust budget automatically when collegeType changes
  const handleCollegeTypeChange = (type) => {
    setCollegeType(type);
    if (type === 'GOVT_ONLY') {
      setMaxBudget(75000);
    } else if (type === 'GOVT_PVT_GOVT_FEE') {
      setMaxBudget(160000);
    } else if (type === 'ALL_QUOTAS') {
      setMaxBudget(1500000);
    }
  };

  // Generate strategy list
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
      const params = new URLSearchParams({
        dataset: dataSource,
        stream: stream,
        limit: 3000,
        sort: 'rank',
        order: 'asc'
      });

      if (category !== 'ALL') {
        params.set('category', category);
      }

      if (maxBudget < 1500000) {
        params.set('maxBudget', maxBudget);
      }

      const res = await fetch(`/api/allotments?${params.toString()}`);
      const data = await res.json();
      const rawRecords = data.data || [];

      // Group by unique college code and select best/most representative cutoff
      const collegeMap = new Map();
      rawRecords.forEach((item) => {
        const code = item.collegeCode;
        if (!code) return;

        // Strict college type filter
        if (collegeType === 'GOVT_ONLY') {
          const isGovtFee = item.fees && item.fees <= 75000;
          const isGovtCourse = item.courseDetails && item.courseDetails.includes('GOVT');
          if (!isGovtFee && !isGovtCourse) return;
        } else if (collegeType === 'GOVT_PVT_GOVT_FEE') {
          if (item.fees && item.fees > 165000) return;
        }

        if (!collegeMap.has(code)) {
          collegeMap.set(code, item);
        } else {
          // If college already seen, pick the entry with best/lowest rank
          const existing = collegeMap.get(code);
          if (item.rank < existing.rank) {
            collegeMap.set(code, item);
          }
        }
      });

      const uniqueColleges = Array.from(collegeMap.values());

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

      // Assign Tier based on golden KEA Counselling Strategy:
      // Tier 1: Dream / High Ambition (Cutoff rank tighter than student rank)
      // Tier 2: Target Matches (Cutoff within reachable range: rank - 3000 to rank + 6000)
      // Tier 3: Safe / Guaranteed Backup (Cutoff rank comfortably above +6000 ranks)
      const classified = uniqueColleges.map((c) => {
        const margin = c.rank - parsedRank;
        let tier = 'DREAM';
        let tierLabel = 'Dream / Reach';
        let tierDesc = 'High ambition choice — always place top premier colleges at the top with zero penalty.';

        if (margin >= -2500 && margin <= 6000) {
          tier = 'TARGET';
          tierLabel = 'Target Match';
          tierDesc = 'High probability zone — your rank falls right into historical allotment windows.';
        } else if (margin > 6000) {
          tier = 'SAFE';
          tierLabel = 'Safe Backup';
          tierDesc = 'Solid safety net — ensures you secure a seat without risk of exiting counselling empty-handed.';
        }

        return {
          ...c,
          margin,
          tier,
          tierLabel,
          tierDesc,
          inPreferredRegion: regionPriority === 'ALL' ? true : matchesRegion(c.collegeName, regionPriority)
        };
      });

      // Sort with smart KEA Counselling hierarchy:
      // Always rank by true cutoff prestige (lower cutoff rank = higher demand = higher priority)
      // If student has a region preference, prioritize matching region within comparable cutoff bands
      classified.sort((a, b) => {
        if (regionPriority !== 'ALL') {
          // If one is in preferred region and ranks are within 4000 of each other, prioritize preferred region
          if (a.inPreferredRegion !== b.inPreferredRegion) {
            const rankGap = Math.abs(a.rank - b.rank);
            if (rankGap < 4000) {
              return a.inPreferredRegion ? -1 : 1;
            }
          }
        }
        return a.rank - b.rank;
      });

      // Slice to user's desired options count
      const finalList = classified.slice(0, optionsCount).map((item, index) => ({
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
              onChange={(e) => setStream(e.target.value)}
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
              <option value="GOVT_ONLY">Government Colleges Only (Fee ≤ ₹75,000/yr)</option>
              <option value="GOVT_PVT_GOVT_FEE">Govt + Private Colleges with Govt Quota (Fee ≤ ₹1.6 Lakh/yr)</option>
              <option value="ALL_QUOTAS">All Colleges (Govt + Private Quota up to ₹15 Lakh/yr)</option>
            </select>
          </div>

          {/* Question 5: Regional Priority */}
          <div className="ai-field">
            <label>
              <MapPin size={14} className="lucide-icon" /> 5. Preferred Location Focus
            </label>
            <select
              value={regionPriority}
              onChange={(e) => setRegionPriority(e.target.value)}
              className="ai-select"
            >
              <option value="ALL">All Karnataka (Strict Statewide Cutoff Order)</option>
              <option value="BLR">Bengaluru First (Bangalore colleges prioritized)</option>
              <option value="MLR">Coastal / Mangaluru Region First</option>
              <option value="MYS">Mysuru & Southern Karnataka First</option>
              <option value="NORTH">North Karnataka / Belagavi / Hubballi First</option>
            </select>
          </div>

          {/* Question 6: Output list length */}
          <div className="ai-field">
            <label>
              <SlidersHorizontal size={14} className="lucide-icon" /> Options Count to Generate
            </label>
            <select
              value={optionsCount}
              onChange={(e) => setOptionsCount(parseInt(e.target.value, 10))}
              className="ai-select"
            >
              <option value={15}>Top 15 Options</option>
              <option value={25}>Top 25 Options (Recommended)</option>
              <option value={40}>Top 40 Options (Extra Safety)</option>
              <option value={60}>Top 60 Options (Comprehensive)</option>
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
