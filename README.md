# NammaUGNEET Allotment Portal 🩺🎯

A high-performance, data-driven web app engineered to simplify complex NEET UG cutoff matrices. During counseling, candidates are often overwhelmed by dense, fragmented PDF reports where critical ranks, fees, and reservation categories are hidden in chaotic layouts. This portal solves those friction points by introducing an interactive search dashboard and rank predictor covering both **Karnataka State counseling (KEA)** and **All India Quota counseling (AIQ)**.

---

## 🚀 Features

* **Dual Counseling Portals:** Seamlessly toggle between Karnataka Examination Authority (KEA) state quota and Medical Counselling Committee (MCC) All India Quota (AIQ) datasets.
* **Strict Stream Isolation:** Programmatically segregates data pools based on user choices to eliminate cross-stream clutter (completely separating MBBS, BDS, and AYUSH datasets).
* **On-the-Fly Data Cleaning:** Intercepts raw dataset arrays to instantly fix column parsing anomalies, seat categories, and text corruptions before rendering.
* **Smart Predictor Matrix:** Features advanced conditional routing to accurately map standard merit ranks alongside high-fee management quota seats (up to ₹23L+ LPA) for GM candidates at higher rank boundaries (such as ~173k+), avoiding false "No Matches" errors.
* **Crash-Proof Visitor Tracking:** Migrated visitor logging and allotment query data processing to a secure MongoDB collection to bypass local/serverless session limits and ensure real-time statistic tracking.

---

## 🛠️ Tech Stack

* **Frontend Framework:** React.js (Vite)
* **Backend & API:** Vercel Serverless Functions
* **Database:** MongoDB Atlas (for high-speed cutoff querying & visitor telemetry)
* **Styling:** CSS3 / Tailwind CSS
* **Linting & Speed:** Oxlint (Oxc)
* **Data Pipelines:** Node.js data extraction scripts to clean, compile, and index PDF text reports.

---

## 📦 Local Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/eshwarhs170-a11y/Namma-UGNEET-Portal.git
   cd namma-ugneet
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory and copy the contents from `.env.example`, providing your MongoDB connection string:
   ```env
   MONGODB_URI="your-mongodb-connection-string"
   ```

4. **Seed the database (Optional):**
   Parse and import the compiled KEA and AIQ cutoff data into your MongoDB Atlas database:
   ```bash
   MONGODB_URI="your-mongodb-connection-string" node dataprocessing/seed-mongodb.cjs
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```