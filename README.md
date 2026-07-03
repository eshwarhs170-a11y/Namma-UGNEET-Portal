# NammaUGNEET Allotment Portal 🩺🎯

A high-performance, data-driven web app engineered to simplify complex Karnataka Examination Authority (KEA) NEET UG cutoff matrices. During state counseling, candidates are often overwhelmed by dense, fragmented PDF reports where critical ranks, fees, and reservation categories are hidden in chaotic layouts. This portal solves those friction points by introducing an interactive search dashboard and rank predictor.

---

## 🚀 Features

* **Strict Stream Isolation:** Programmatically segregates data pools based on user choices to eliminate cross-stream clutter (completely separating MBBS, BDS, and AYUSH datasets).
* **On-the-Fly Data Cleaning:** Intercepts raw dataset arrays to instantly fix column parsing anomalies and text corruptions before rendering.
* **Smart Predictor Matrix:** Features advanced conditional routing to accurately map standard merit ranks alongside high-fee management quota seats (up to ₹23L+ LPA) for GM candidates at higher rank boundaries (such as ~173k+), avoiding false "No Matches" errors.

---

## 🛠️ Tech Stack

* **Frontend Framework:** React.js (Vite)
* **Styling:** CSS3 / Tailwind CSS
* **Linting & Speed:** Oxlint (Oxc)
* **Data Layer:** Normalized JSON matrices

---

## 📦 Local Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/eshwarhs170-a11y/Namma-UGNEET-Portal.git](https://github.com/eshwarhs170-a11y/Namma-UGNEET-Portal.git)
   cd namma-ugneet