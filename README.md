# Namma UGNEET Portal

Cutoff analysis and seat predictor for Karnataka (KEA) and All India Quota (MCC AIQ) NEET UG counselling.

Live Application: [nammaugneet.vercel.app](https://nammaugneet.vercel.app)

---

## Overview

During NEET UG counselling, navigating through allotment PDFs to check category cutoffs, fees, and previous trends is difficult. Namma UGNEET organizes this data into a fast, searchable interface.

Key capabilities:
- Predict potential college allotments based on NEET rank, category, and course preferences.
- Search cutoffs across Round 1, Round 2, Round 3, and Stray rounds for Karnataka State Quota (KEA) and All India Quota (MCC).
- Compare past cutoffs and view trend patterns across multiple years.
- Build, reorder, and export option entry preference lists as PDF.

---

## Data Coverage

| Quota | Years | Rounds | Courses |
|---|---|---|---|
| KEA (Karnataka State Quota) | 2024, 2025, 2026 | R1, R2, R3, Stray | MBBS, BDS, BAMS, BHMS, BUMS |
| MCC AIQ (All India Quota) | 2024, 2025, 2026 | R1, R2, R3, Stray | MBBS, BDS, BAMS, BHMS, BUMS, BSMS |

All cutoff data is derived from official KEA and MCC allotment publications.

---

## Features

- Dual Dataset Toggle: Switch between KEA (Karnataka state) and AIQ (All India Quota) data.
- College Predictor: Filter by rank, quota, and category to assess admission chances.
- Live Search and Filters: Filter by course, quota, category, round, year, and college fee.
- Cutoff Trends: Visual rank trends across 2024, 2025, and 2026 for colleges and categories.
- Option Entry Builder: Order choices and export a print-ready PDF list.
- Responsive and PWA: Works on desktop and mobile with offline support.
- Theme Support: Dark and light display modes.

---

## Project Structure

```
namma-ugneet/
|-- api/                             # Vercel serverless endpoints
|   |-- allotments.js                # Cutoff querying endpoint
|   |-- stats.js                     # Filter metadata and aggregations
|   |-- visits.js / installs.js      # Usage telemetry
|   `-- lib/db.js                    # MongoDB client connection
|
|-- public/
|   `-- data/                        # Production client datasets
|       |-- compiled_allotments.json     # KEA master dataset (~29 MB)
|       `-- aiq_compiled_allotments.json # AIQ master dataset (~9 MB)
|
|-- dataprocessing/                  # Local data parsing and compiling scripts
|   |-- compile.cjs                  # KEA parser script
|   |-- aiq-mbbs-bds-compile.cjs     # AIQ MBBS/BDS parser
|   |-- aiq-ayush-stray-compile.cjs  # AIQ AYUSH and Stray parser
|   |-- aiq-aggregate-cutoffs.cjs    # AIQ cutoff grouping script
|   |-- aiq-transform-for-app.cjs    # AIQ final schema formatter
|   `-- seed-mongodb.cjs             # MongoDB data loader
|
`-- src/
    |-- components/
    |   |-- Dashboard.jsx            # Core dashboard and predictor view
    |   |-- Dashboard.css            # Stylesheet and responsive layout rules
    |   `-- CollegeTrendChart.jsx    # Rank cutoff trend charts
    |-- App.jsx
    `-- main.jsx
```

Raw source PDF extractions and intermediate JSON files are excluded via `.gitignore` to maintain repository size limits. Only final datasets in `public/data/` are tracked in version control.

---

## Tech Stack

- Frontend: React 19, Vite 8
- Styling: Vanilla CSS
- Libraries: Recharts, jsPDF, jsPDF-AutoTable
- Backend: Vercel Serverless Functions, MongoDB Atlas
- Deployment: Vercel

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

## Data Pipeline

When new counselling round documents are released:

```bash
# KEA data:
node dataprocessing/compile.cjs

# AIQ data (in order):
node dataprocessing/aiq-mbbs-bds-compile.cjs
node dataprocessing/aiq-ayush-stray-compile.cjs
node dataprocessing/aiq-fill-categories.cjs
node dataprocessing/aiq-aggregate-cutoffs.cjs
node dataprocessing/aiq-transform-for-app.cjs
```

After generating updated data, stage and commit the output files:

```bash
git add public/data/
git commit -m "Update cutoff data"
git push
```

---

## License

Distributed under the MIT License. See `LICENSE` for details.