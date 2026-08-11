<div align="center">

```
 ███╗   ██╗ █████╗ ███╗   ███╗███╗   ███╗ █████╗ 
 ████╗  ██║██╔══██╗████╗ ████║████╗ ████║██╔══██╗
 ██╔██╗ ██║███████║██╔████╔██║██╔████╔██║███████║
 ██║╚██╗██║██╔══██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║
 ██║ ╚████║██║  ██║██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║
 ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝
 ██╗   ██╗ ██████╗ ███╗   ██╗███████╗███████╗████████╗
 ██║   ██║██╔════╝ ████╗  ██║██╔════╝██╔════╝╚══██╔══╝
 ██║   ██║██║  ███╗██╔██╗ ██║█████╗  █████╗     ██║   
 ██║   ██║██║   ██║██║╚██╗██║██╔══╝  ██╔══╝     ██║   
 ╚██████╔╝╚██████╔╝██║ ╚████║███████╗███████╗   ██║   
  ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚══════╝   ╚═╝   
```

### **ನಮ್ಮ ಯುಜಿ-ನೀಟ್ — Namma UGNEET**
*The ultimate AI-powered data companion for Karnataka medical aspirants.*

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-4EA94B?style=flat-square&logo=mongodb&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Serverless-000000?style=flat-square&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Data](https://img.shields.io/badge/Data-129K+_Records-FF6B35?style=flat-square)

</div>

---

## 🎯 What is NammaUGNEET?

Navigating through KEA (Karnataka) and AIQ (All India Quota) cutoff PDFs during NEET UG counseling is chaotic, fragmented, and frustrating. Critical ranks, fee structures, and reservation categories are often buried in unsearchable documents. 

**NammaUGNEET** was built to solve exactly this. It intercepts and transforms over **129,000+** fragmented data points into a lightning-fast, interactive search dashboard. Instantly discover your predicted MBBS, BDS, or AYUSH matches based on your rank, reservation category, and budget.

> Think of it as your personalized, crash-proof counseling matrix.

---

## ✨ Features at a Glance

### 🩺 For Medical Aspirants
| Feature | Description |
|---|---|
| 🛡️ **Dual Portals** | Toggle instantly between Karnataka State Quota (KEA) and MCC AIQ datasets. |
| 🎯 **Smart Predictor Matrix** | Accurately maps complex parameters (high-fee management vs standard govt seats). |
| 📊 **Advanced Filters** | Filter colleges by fees, round (R1, R2, R3, Stray), stream, and category. |
| 🔍 **Search by College** | Look up specific colleges to instantly see their historical cutoffs. |
| ⚡ **Real-time Stats** | See exactly how many matches you have before you even scroll. |

### 💻 For Developers / Maintainers
| Feature | Description |
|---|---|
| 🧹 **Data Pipeline** | Node.js parsers dynamically fix PDF column parsing anomalies and text corruptions. |
| 🚀 **Serverless API** | Vercel API routes ensure zero downtime during peak counseling rushes. |
| 📦 **MongoDB Integration** | Bypasses local session limits, ensuring lightning-fast search queries. |
| 🔒 **Stream Isolation** | Programmatically segregates MBBS, BDS, and AYUSH data pools natively. |

---

## 🗂️ Project Structure

```
namma-ugneet/
├── api/
│   ├── allotments.js      ← Serverless function to query matching seats
│   ├── lib/db.js          ← MongoDB connection pooling helper
│   └── stats.js           ← Aggregates dynamic dropdown options
├── dataprocessing/
│   ├── compile.cjs        ← Master script: parses text files into compiled JSON
│   ├── extract-pdfs.cjs   ← Extracts raw PDF files into formatted text
│   ├── fix-r3.cjs         ← Resolves spacing anomalies in Round 3 extraction
│   └── seed-mongodb.cjs   ← Uploads the compiled JSON directly to MongoDB
├── public/
│   └── data/              ← Local fallback JSON datasets
├── src/
│   ├── components/
│   │   ├── DashboardMongo.jsx ← The core predictor matrix UI
│   │   ├── CollegeCard.jsx    ← Renders individual college cutoff cards
│   │   └── TopNav.jsx         ← Navigation and Theme controls
│   ├── App.jsx            
│   └── main.jsx
└── vite.config.js
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React + Vite |
| **Backend / API** | Vercel Serverless Functions |
| **Database** | MongoDB Atlas |
| **Data Processing**| Node.js (Regex, PDF extraction) |
| **Styling** | Tailwind CSS / Pure CSS |
| **Linting** | OxLint (Oxc) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- A MongoDB Atlas Cluster URL

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/eshwarhs170-a11y/Namma-UGNEET-Portal.git
cd namma-ugneet

# 2. Install dependencies
npm install

# 3. Configure Environment Variables
# Create a .env.local file and add your connection string
echo 'MONGODB_URI="your_mongo_url"' > .env.local

# 4. Start the dev server
npm run dev
```

The app will be live at **http://localhost:5173** 🎉

### Optional: Seeding the Database

If you want to manually refresh the MongoDB cluster with new PDF data:
```bash
# Set your environment variable and run the seeder
MONGODB_URI="your_mongo_url" node dataprocessing/seed-mongodb.cjs
```

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

1. Fork the repo
2. Create your branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📜 License

MIT © 2026 NammaUGNEET Team

---

<div align="center">

*Engineered with precision for aspiring medical students.*

**ಭವಿಷ್ಯದ ವೈದ್ಯರಿಗೆ 🩺**

</div>