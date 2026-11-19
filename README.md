# Namma UGNEET Portal

Cutoff analysis, seat predictor, and AI Option Entry strategy generator for Karnataka (KEA) and All India Quota (MCC AIQ) NEET UG counselling.

Live Application: [namma-ugneet-portal.vercel.app](https://namma-ugneet-portal.vercel.app)

---

## Overview

During NEET UG counselling, navigating through hundreds of pages of official allotment PDFs to determine eligible colleges, category cutoffs, fee structures, and historical trends is daunting. Namma UGNEET transforms this complex data into an intuitive, high-speed decision platform for students and parents.

Key capabilities:
- **AI Option Entry Strategy Generator**: Automatically builds an optimal KEA option entry preference list ordered by counselling rules (Premier Ambition -> Target Match -> Safe Backup).
- **College Predictor**: Evaluates admission probability based on NEET rank, quota category, round, and budget preferences.
- **Multi-Year Cutoff Search**: Instant searching across Round 1, Round 2, Round 3, and Stray vacancy rounds for Karnataka State Quota (KEA) and All India Quota (MCC).
- **Multi-Year Trend Analysis**: Visual sparklines and comparative cutoff patterns across 2024, 2025, and 2026.
- **Custom Option Entry Builder**: Drag-and-drop preference ordering with WhatsApp sharing and print-ready PDF export.

---

## ✦ AI Option Entry Strategy Generator

The AI Option Entry Analyser is built specifically according to official KEA counselling guidelines and sequential seat allocation logic:

1. **Zero Disadvantage Strategy**: In KEA counselling, choices are processed strictly from top to bottom. If a candidate doesn't qualify for option #1, they automatically roll over to option #2 without losing eligibility. Therefore, top premier institutes (e.g., Bangalore Medical College `M001MG`) are always placed at the very top of the list.
2. **Three-Tier Classification**:
   - **Premier Ambition (Dream)**: Cutoff rank is strictly higher than candidate rank — high-demand, prestigious aspirational institutions.
   - **Target Match (Target)**: Cutoff rank falls comfortably within the candidate's competitive range.
   - **Safe Backup (Safe)**: Cutoff rank provides a guaranteed cushion, preventing counselling exit without a seat.
3. **Comprehensive Quota & Reservation Cascading**: Handles category eligibility pathways (e.g., 3BR, 3BK, 3BG, GM) so candidates are matched against both their specific reservation quotas and general merit open seats.
4. **Stream-Specific Fee Budget Filter**: Dynamically configures fee brackets for MBBS (Govt ₹65k, Pvt-Govt ₹1.5L, Pvt ₹12L-₹26L, High/NRI), BDS, and AYUSH streams.
5. **Strict Priority Sorting**: Rank merit order first, with fee amount as an immediate tiebreaker (lower fee ranked higher if cutoffs match).
6. **Seamless List Management**: One-click append or replacement into your personal practice list, instant WhatsApp summary generation, and downloadable PDF report.

---

## Data Coverage

| Quota | Years | Rounds | Courses |
|---|---|---|---|
| KEA (Karnataka State Quota) | 2024, 2025, 2026 | R1, R2, R3, Stray | MBBS, BDS, BAMS, BHMS, BUMS |
| MCC AIQ (All India Quota) | 2024, 2025, 2026 | R1, R2, R3, Stray | MBBS, BDS, BAMS, BHMS, BUMS, BSMS |

All cutoff data is compiled directly from official KEA and MCC allotment publications.

---

## Features

- **Dual Dataset Toggle**: Instantly switch between KEA (Karnataka State Quota) and AIQ (MCC All India Quota) databases.
- **AI Option Entry Generator**: Multi-tier sequential choice ordering with exportable strategies.
- **College Predictor Matrix**: Dynamic rank margin sliders (±4,000, etc.) with real-time target matching.
- **Smart College Search**: Typeahead search prioritized by college name prefix and code matching.
- **Cutoff Trends**: Sparkline visualizations comparing cutoffs across rounds and years.
- **Option Entry Practice List**: Drag-to-reorder list builder with PDF and WhatsApp export.
- **Responsive & PWA**: Mobile-first design, fast loading, offline capability, and home-screen installable.
- **Theme Support**: Seamless Dark Mode and Light Mode support.

---

## Project Structure

```
namma-ugneet/
|-- api/                             # Vercel serverless functions
|   |-- allotments.js                # Allotment querying & multi-parameter filter endpoint
|   |-- stats.js                     # Filter metadata & college name aggregations
|   |-- visits.js / installs.js      # Anonymous visitor & install telemetry
|   `-- lib/db.js                    # MongoDB Atlas connection pooling
|
|-- public/
|   `-- data/                        # Static JSON fallbacks for offline / standalone mode
|       |-- compiled_allotments.json     # KEA dataset
|       `-- aiq_compiled_allotments.json # AIQ dataset
|
|-- dataprocessing/                  # Data ingestion & normalization scripts
|   |-- compile.cjs                  # KEA allotment parser
|   |-- aiq-mbbs-bds-compile.cjs     # AIQ MBBS/BDS parser
|   |-- aiq-ayush-stray-compile.cjs  # AIQ AYUSH & Stray parser
|   |-- aiq-transform-for-app.cjs    # AIQ schema standardizer
|   `-- seed-mongodb.cjs             # MongoDB Atlas seeder
|
`-- src/
    |-- components/
    |   |-- DashboardMongo.jsx       # Main dashboard, search & predictor engine
    |   |-- AiOptionAnalyser.jsx     # AI Option Entry Strategy Generator component
    |   |-- OptionEntryList.jsx      # Sortable custom option entry list
    |   `-- Dashboard.css            # Responsive layout & theme styles
    |-- visitorCounter.js            # Usage telemetry helper
    |-- ErrorBoundary.jsx            # Application error boundary
    |-- App.jsx                      # App root container
    `-- main.jsx                     # Application bootstrap & PWA registration
```

---

## Tech Stack

- **Frontend**: React 19, Vite 8
- **Styling**: Vanilla CSS, Tailwind CSS utilities
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable
- **Icons**: Lucide React
- **Document Generation**: jsPDF, jsPDF-AutoTable
- **Backend / Database**: Vercel Serverless Functions, MongoDB Atlas
- **Hosting**: Vercel

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation and Local Run

```bash
git clone https://github.com/eshwarhs170-a11y/Namma-UGNEET-Portal.git
cd namma-ugneet
npm install
npm run dev
```

The application runs locally at `http://localhost:5173`.

---

## License

Distributed under the MIT License. See `LICENSE` for details.