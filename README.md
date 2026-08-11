<div align="center">
  <img src="https://raw.githubusercontent.com/eshwarhs170-a11y/Namma-UGNEET-Portal/main/public/favicon.ico" alt="Logo" width="100" height="100">

  <h1 align="center">NammaUGNEET</h1>

  <p align="center">
    <strong>The Ultimate Data-Driven NEET UG Counseling Predictor & Analytics Dashboard</strong>
    <br />
    <br />
    <a href="https://namma-ugneet.vercel.app"><strong>Explore the Live App »</strong></a>
    <br />
    <br />
    <a href="https://github.com/eshwarhs170-a11y/Namma-UGNEET-Portal/issues">Report Bug</a>
    ·
    <a href="https://github.com/eshwarhs170-a11y/Namma-UGNEET-Portal/issues">Request Feature</a>
  </p>

  <!-- Badges -->
  <p align="center">
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  </p>
</div>

---

> **NammaUGNEET** intercepts and transforms millions of fragmented data points from KEA and AIQ counseling PDFs into a lightning-fast, interactive search dashboard. Instantly discover your predicted MBBS, BDS, or AYUSH matches based on your rank, category, and budget.

---

## ⚡ Key Features

| Feature | Description |
| :--- | :--- |
| **🛡️ Dual Counseling Portals** | Toggle instantly between Karnataka State Quota (KEA) and Medical Counselling Committee (MCC) AIQ datasets. |
| **🎯 Smart Predictor Matrix** | Accurately maps complex parameters (like high-fee management seats vs standard govt seats) preventing false "No Matches". |
| **🧹 Automated Data Cleaning** | Custom Node.js parsers dynamically fix PDF column parsing anomalies and text corruptions before they reach the database. |
| **🚀 Serverless Architecture** | Built entirely on Vercel Serverless Functions and MongoDB Atlas to guarantee zero downtime during peak counseling rushes. |
| **🔒 Strict Stream Isolation** | Programmatically segregates MBBS, BDS, and AYUSH data pools to completely eliminate cross-stream clutter. |

## 🛠️ Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- npm (`npm install npm@latest -g`)
- A MongoDB Atlas Cluster URL

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/eshwarhs170-a11y/Namma-UGNEET-Portal.git
   ```

2. **Install dependencies**
   ```bash
   cd namma-ugneet
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory and add your MongoDB connection string:
   ```env
   MONGODB_URI="your_mongodb_connection_string_here"
   ```

4. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` to view it in your browser.

---

<div align="center">
  <i>Engineered with precision for aspiring medical students.</i>
</div>