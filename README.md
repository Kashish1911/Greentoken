# GreenToken — Smart Cloud & AI Sustainability Dashboard

A full-stack web application built with Flask + SQLite + Chart.js that:
- Calculates and compares cloud costs for AWS, Azure, and GCP
- Analyzes AI model energy consumption and carbon footprint
- Suggests optimizations for sustainability and cost savings

---

## 📁 Folder Structure

```
greentoken/
├── app.py                  ← Flask backend (all API routes)
├── requirements.txt        ← Python dependencies
├── README.md               ← This file
├── data/
│   └── calculations.db     ← SQLite database (auto-created on first run)
├── templates/
│   └── index.html          ← Main HTML page
└── static/
    ├── css/
    │   └── style.css       ← All styles
    └── js/
        └── main.js         ← Frontend logic + Chart.js
```

---

## 🚀 Setup & Run Instructions

### Step 1 — Install Python
Make sure Python 3.8+ is installed:
```
python --version
```

### Step 2 — Open in VS Code or PyCharm
- Open the `greentoken/` folder as your project root

### Step 3 — Create a virtual environment (recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 4 — Install dependencies
```bash
pip install -r requirements.txt
```

### Step 5 — Run the app
```bash
python app.py
```

### Step 6 — Open in browser
Go to: http://localhost:5000

---

## 🧪 Sample Test Data

| Scenario   | Storage | Compute | Transfer |
|------------|---------|---------|----------|
| Startup    | 100 GB  | 50 hrs  | 20 GB    |
| SMB        | 500 GB  | 200 hrs | 100 GB   |
| Enterprise | 5 TB    | 720 hrs | 2 TB     |

Click the preset buttons in the UI to auto-fill these values.

---

## 🌐 API Endpoints

| Method | Endpoint      | Description                          |
|--------|---------------|--------------------------------------|
| GET    | /             | Main dashboard page                  |
| POST   | /calculate    | Calculate cloud costs (JSON)         |
| POST   | /ai_energy    | Analyze AI energy usage (JSON)       |
| GET    | /history      | Fetch last 10 calculations from DB   |

### POST /calculate — Request body:
```json
{
  "storage_gb": 500,
  "compute_hours": 200,
  "transfer_gb": 100
}
```

### POST /ai_energy — Request body:
```json
{
  "tokens_per_day": 100000,
  "model": "GPT-3.5"
}
```

---

## 🔧 Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Frontend | HTML5, CSS3, JS ES6 |
| Backend  | Python 3, Flask     |
| Database | SQLite (built-in)   |
| Charts   | Chart.js 4.x        |
| Fonts    | Google Fonts CDN    |

---

## 📊 Pricing Models Used

| Provider | Storage/GB/mo | Compute/hr | Transfer/GB |
|----------|---------------|------------|-------------|
| AWS      | $0.023        | $0.0464    | $0.09       |
| Azure    | $0.018        | $0.0416    | $0.087      |
| GCP      | $0.020        | $0.0385    | $0.08       |

---

## 🌱 Features

1. **Cloud Cost Tab** — Input storage, compute, transfer → get instant comparison
2. **AI Energy Tab** — See how much energy your AI model uses per year vs alternatives
3. **History Tab** — View past calculations stored in SQLite
4. **Sustainable AI Tips** — 6 actionable tips to reduce cloud carbon footprint
5. **Token Optimization** — 4 strategies to reduce AI energy consumption
6. **Charts** — Bar charts and grouped breakdown charts using Chart.js
7. **Smart Recommendations** — Cheapest provider, greenest provider, usage tips

---

Built for BTech Computer Science — Sustainable Energy Project
