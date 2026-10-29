<div align="center">

<img src="https://raw.githubusercontent.com/eshwarhs170-a11y/Namma-UGNEET-Portal/main/public/readme-banner.png" alt="NammaUGNEET Banner" width="420" />

### **ನಮ್ಮ ಯುಜಿ-ನೀಟ್ — Namma UGNEET**
*The smart data companion for Karnataka & All India Quota NEET UG aspirants.*

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Serverless-000000?style=flat-square&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![KEA Data](https://img.shields.io/badge/KEA-2024–2026_All_Rounds-4f46e5?style=flat-square)
![AIQ Data](https://img.shields.io/badge/AIQ-2024–2026_All_Rounds-10b981?style=flat-square)

**[🌐 Live App →](https://nammaugneet.vercel.app)**

</div>

---

## 🎯 What is NammaUGNEET?

Hunting through KEA and MCC AIQ allotment PDFs during NEET UG counselling is messy — critical ranks, fee structures, and reservation categories are buried in hundreds of pages of unsearchable documents.

**NammaUGNEET** transforms all of that into a fast, searchable dashboard. Enter your rank and category → instantly see which colleges you're predicted to get, across both Karnataka State Quota (KEA) and All India Quota (MCC AIQ).

> Think of it as your personal counselling cutoff matrix — updated every round.

---

## 📊 Data Coverage

| Dataset | Years | Rounds | Streams |
|---|---|---|---|
| **KEA (Karnataka)** | 2024, 2025, 2026 | R1, R2, R3, Stray | MBBS, BDS, AYUSH |
| **AIQ (MCC)** | 2024, 2025, 2026 | R1, R2, R3, Stray | MBBS, BDS, AYUSH |

All data is parsed directly from official KEA and MCC allotment PDFs.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔀 **Dual Dataset Toggle** | Switch between KEA (Karnataka) and AIQ (All India Quota) data instantly |
| 🎯 **Smart College Predictor** | Enter rank + category → ranked list of colleges you can likely get |
| 📊 **Explore & Filter** | Filter by stream, category, round, year, and fees — all live |
| 🔍 **College Detail View** | Tap any college to see all its cutoffs across every round and year |
| 📈 **Trend Sparklines** | Inline rank trend graphs showing how a college's cutoff has moved |
| ⭐ **Save & Compare** | Bookmark colleges, save multiple rank profiles, compare saved colleges side-by-side |
| 📋 **Option Entry List** | Build and export your personal option entry order as a PDF |
| 🌙 **Dark Mode + PWA** | Install as an app on your phone, works offline |

---

## 🗂️ Project Structure

```
namma-ugneet/
├── api/                        ← Vercel serverless functions
│   ├── allotments.js           ← Query matching seats
│   ├── stats.js                ← Aggregated dropdown options
│   ├── visits.js / installs.js ← Visitor & install tracking
│   └── lib/db.js               ← MongoDB connection pooling
│
├── dataprocessing/             ← Local data pipeline (not deployed)
│   ├── compile.cjs             ← Parses KEA txt files → compiled_allotments.json
│   ├── aiq-mbbs-bds-compile.cjs   ← Parses AIQ MBBS/BDS txt files
│   ├── aiq-ayush-stray-compile.cjs ← Parses AIQ AYUSH txt files
│   ├── aiq-aggregate-cutoffs.cjs  ← Groups candidates → cutoff groups
│   ├── aiq-transform-for-app.cjs  ← Converts cutoffs → app JSON shape
│   ├── aiq-fill-categories.cjs    ← Builds rank→category lookup map
│   ├── extract-pdfs.cjs        ← Extracts raw PDF → txt
│   └── seed-mongodb.cjs        ← Uploads compiled JSON to MongoDB
│
├── public/
│   └── data/
│       ├── compiled_allotments.json     ← KEA data (~29 MB, app fallback)
│       └── aiq_compiled_allotments.json ← AIQ data (~9 MB, app fallback)
│
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx       ← Main UI: predictor, explore, college detail
│   │   ├── Dashboard.css       ← All styles + responsive breakpoints
│   │   └── CollegeTrendChart.jsx
│   ├── App.jsx
│   └── main.jsx
│
├── index.html
├── vite.config.js
└── vercel.json
```

> **Note:** Raw source `.txt` files (PDF extractions) and intermediate compiled JSONs are **gitignored** — they live only on the maintainer's machine. Only the final app-ready JSONs in `public/data/` are committed.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite 8 |
| **Styling** | Pure CSS (no Tailwind), dark mode, fully responsive |
| **API** | Vercel Serverless Functions |
| **Database** | MongoDB Atlas (for server-side queries) |
| **Data Pipeline** | Node.js — regex-based PDF text parsers |
| **Deployment** | Vercel (auto-deploy on push to `main`) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Install & Run

```bash
# 1. Clone
git clone https://github.com/eshwarhs170-a11y/Namma-UGNEET-Portal.git
cd namma-ugneet

# 2. Install dependencies
npm install

# 3. (Optional) Add your MongoDB URI for server-side features
echo 'MONGODB_URI=your_mongo_url' > .env.local

# 4. Start the dev server
npm run dev
```

App runs at **http://localhost:5173** 🎉

> The app works fully without MongoDB — it falls back to the local JSON files in `public/data/`.

### Adding New Counselling Data

When new round PDFs are released:

```bash
# 1. Extract PDF → txt  (uses pdftotext or similar)
node dataprocessing/extract-pdfs.cjs

# 2. For KEA data:
node dataprocessing/compile.cjs

# 3. For AIQ data (run in order):
node dataprocessing/aiq-mbbs-bds-compile.cjs
node dataprocessing/aiq-ayush-stray-compile.cjs
node dataprocessing/aiq-fill-categories.cjs
node dataprocessing/aiq-aggregate-cutoffs.cjs
node dataprocessing/aiq-transform-for-app.cjs

# 4. Commit only the updated public/data/*.json files
git add public/data/
git commit -m "Add Round X data"
git push
```

---

## 📜 License

MIT © 2026 NammaUGNEET

---

<div align="center">

*Built for students, by students — during the most stressful weeks of the year.*

**ಭವಿಷ್ಯದ ವೈದ್ಯರಿಗೆ 🩺**

</div>