<div align="center">
  <h1 align="center">NammaUGNEET 🎯🩺</h1>
  <p align="center">
    <strong>The Ultimate Data-Driven NEET UG Counseling Predictor & Analytics Dashboard</strong>
    <br />
    <br />
    <a href="https://github.com/eshwarhs170-a11y/Namma-UGNEET-Portal/issues">Report Bug</a>
    ·
    <a href="https://github.com/eshwarhs170-a11y/Namma-UGNEET-Portal/issues">Request Feature</a>
  </p>
</div>

<details open>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#key-features">Key Features</a></li>
    <li><a href="#tech-stack">Tech Stack</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
  </ol>
</details>

## 🌟 About The Project

Navigating through KEA (Karnataka) and AIQ (All India Quota) cutoff PDFs during NEET UG counseling is chaotic, fragmented, and frustrating. Critical ranks, fee structures, and reservation categories are often buried in unsearchable documents. 

**NammaUGNEET** was built to solve exactly this. It intercepts and transforms thousands of fragmented data points into a lightning-fast, interactive search dashboard. Instantly discover your predicted MBBS, BDS, or AYUSH matches based on your rank, reservation category, and budget.

## ✨ Key Features

* **🛡️ Dual Counseling Portals**  
  Toggle instantly between Karnataka State Quota (KEA) and Medical Counselling Committee (MCC) All India Quota (AIQ) datasets without losing your context.
  
* **🎯 Smart Predictor Matrix**  
  Our algorithm doesn't just look for numbers; it accurately maps complex parameters like high-fee management seats vs standard government seats, preventing false "No Matches" errors for higher ranks.

* **🧹 Automated Data Cleaning Pipeline**  
  Custom Node.js parsers intercept raw PDF text to dynamically fix column parsing anomalies, seat categories, and text corruptions before they even reach the database.

* **⚡ Lightning Fast & Crash-Proof**  
  Built entirely on Serverless architecture and MongoDB Atlas to bypass local session limits, ensuring real-time statistic tracking and zero downtime during peak counseling rushes.

* **🔒 Strict Stream Isolation**  
  Programmatically segregates data pools based on your choices to completely eliminate cross-stream clutter (MBBS, BDS, and AYUSH are handled entirely separately).

## 🛠️ Tech Stack

* **Frontend:** React.js, Vite, Tailwind CSS
* **Backend:** Vercel Serverless API Routes
* **Database:** MongoDB Atlas (for high-speed querying & telemetry)
* **Data Processing:** Node.js, Regex Parsing Pipelines
* **Linting:** Oxlint (Oxc)

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps:

### Prerequisites
* npm (`npm install npm@latest -g`)
* Node.js
* A MongoDB Atlas Cluster URL

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/eshwarhs170-a11y/Namma-UGNEET-Portal.git
   ```
2. **Install NPM packages**
   ```bash
   cd namma-ugneet
   npm install
   ```
3. **Set up your MongoDB connection**
   Create a `.env.local` file in the root folder and add your connection string:
   ```env
   MONGODB_URI="your_mongodb_connection_string_here"
   ```
4. **Start the development server**
   ```bash
   npm run dev
   ```

---

<div align="center">
  <i>Built with ❤️ for aspiring medical students.</i>
</div>