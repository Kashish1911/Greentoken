from flask import Flask, render_template, request, jsonify
import sqlite3
import os
import json
from datetime import datetime

app = Flask(__name__)

# ─── Database Setup ────────────────────────────────────────────────────────────
DB_PATH = "data/calculations.db"

def init_db():
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS calculations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            storage_gb REAL,
            compute_hours REAL,
            transfer_gb REAL,
            aws_cost REAL,
            azure_cost REAL,
            gcp_cost REAL,
            cheapest TEXT,
            carbon_kg REAL
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ─── Pricing Models ─────────────────────────────────────────────────────────────
PRICING = {
    "aws": {
        "storage_per_gb":   0.023,   # S3 standard
        "compute_per_hour": 0.0464,  # t3.medium
        "transfer_per_gb":  0.09,    # outbound
        "carbon_factor":    0.000415 # kg CO2 per kWh (US average)
    },
    "azure": {
        "storage_per_gb":   0.018,   # Blob hot
        "compute_per_hour": 0.0416,  # B2s
        "transfer_per_gb":  0.087,
        "carbon_factor":    0.000380
    },
    "gcp": {
        "storage_per_gb":   0.020,   # Standard
        "compute_per_hour": 0.0385,  # e2-medium
        "transfer_per_gb":  0.08,
        "carbon_factor":    0.000350 # GCP uses more renewables
    }
}

# AI energy model benchmarks (Wh per 1000 tokens)
AI_MODELS = {
    "GPT-4":         {"wh_per_1k": 0.0029, "params": "1.8T", "efficiency": "low"},
    "GPT-3.5":       {"wh_per_1k": 0.0007, "params": "175B", "efficiency": "medium"},
    "Claude 3 Opus": {"wh_per_1k": 0.0021, "params": "~500B", "efficiency": "medium"},
    "Claude 3 Haiku":{"wh_per_1k": 0.0004, "params": "~20B",  "efficiency": "high"},
    "Llama 3 8B":    {"wh_per_1k": 0.0002, "params": "8B",    "efficiency": "very_high"},
    "Llama 3 70B":   {"wh_per_1k": 0.0009, "params": "70B",   "efficiency": "high"},
    "Mistral 7B":    {"wh_per_1k": 0.00018,"params": "7B",    "efficiency": "very_high"},
    "Gemini Ultra":  {"wh_per_1k": 0.0025, "params": "~540B", "efficiency": "low"},
    "Gemini Flash":  {"wh_per_1k": 0.0003, "params": "~8B",   "efficiency": "very_high"},
}

def calculate_costs(storage_gb, compute_hours, transfer_gb):
    results = {}
    for provider, p in PRICING.items():
        storage_cost  = storage_gb    * p["storage_per_gb"]
        compute_cost  = compute_hours * p["compute_per_hour"]
        transfer_cost = transfer_gb   * p["transfer_per_gb"]
        total = storage_cost + compute_cost + transfer_cost

        # Carbon: assume 0.5 kWh per GB storage/month, 1 kWh per compute hour, 0.1 kWh per GB transfer
        kwh = (storage_gb * 0.5) + (compute_hours * 1.0) + (transfer_gb * 0.1)
        carbon_kg = round(kwh * p["carbon_factor"], 4)

        results[provider] = {
            "storage_cost":  round(storage_cost,  4),
            "compute_cost":  round(compute_cost,  4),
            "transfer_cost": round(transfer_cost, 4),
            "total":         round(total,         4),
            "carbon_kg":     carbon_kg
        }
    return results

# ─── Routes ────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/calculate", methods=["POST"])
def calculate():
    data = request.get_json()
    storage_gb    = float(data.get("storage_gb",    0))
    compute_hours = float(data.get("compute_hours", 0))
    transfer_gb   = float(data.get("transfer_gb",   0))

    costs = calculate_costs(storage_gb, compute_hours, transfer_gb)
    cheapest = min(costs, key=lambda p: costs[p]["total"])

    # Save to DB
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""INSERT INTO calculations
        (timestamp, storage_gb, compute_hours, transfer_gb,
         aws_cost, azure_cost, gcp_cost, cheapest, carbon_kg)
        VALUES (?,?,?,?,?,?,?,?,?)""",
        (datetime.now().isoformat(),
         storage_gb, compute_hours, transfer_gb,
         costs["aws"]["total"], costs["azure"]["total"], costs["gcp"]["total"],
         cheapest, costs[cheapest]["carbon_kg"])
    )
    conn.commit()
    conn.close()

    return jsonify({
        "costs":    costs,
        "cheapest": cheapest,
        "inputs":   {"storage_gb": storage_gb, "compute_hours": compute_hours, "transfer_gb": transfer_gb}
    })

@app.route("/ai_energy", methods=["POST"])
def ai_energy():
    data = request.get_json()
    tokens_per_day = float(data.get("tokens_per_day", 100000))
    model          = data.get("model", "GPT-3.5")

    model_data = AI_MODELS.get(model, AI_MODELS["GPT-3.5"])
    wh_per_day  = (tokens_per_day / 1000) * model_data["wh_per_1k"]
    kwh_per_day = wh_per_day / 1000
    kwh_per_yr  = kwh_per_day * 365
    carbon_yr   = kwh_per_yr * 0.000415  # kg CO2

    # Compare with other models
    comparisons = []
    for m_name, m_data in AI_MODELS.items():
        wh  = (tokens_per_day / 1000) * m_data["wh_per_1k"]
        kwh = wh / 1000 * 365
        comparisons.append({
            "model":      m_name,
            "kwh_yr":     round(kwh, 4),
            "params":     m_data["params"],
            "efficiency": m_data["efficiency"],
            "saving_pct": round((1 - (m_data["wh_per_1k"] / model_data["wh_per_1k"])) * 100, 1)
                          if m_data["wh_per_1k"] < model_data["wh_per_1k"] else 0
        })
    comparisons.sort(key=lambda x: x["kwh_yr"])

    return jsonify({
        "model":         model,
        "tokens_per_day": tokens_per_day,
        "wh_per_day":    round(wh_per_day, 4),
        "kwh_per_yr":    round(kwh_per_yr, 4),
        "carbon_yr_kg":  round(carbon_yr,  4),
        "comparisons":   comparisons
    })

@app.route("/history")
def history():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM calculations ORDER BY id DESC LIMIT 10")
    rows = c.fetchall()
    conn.close()
    cols = ["id","timestamp","storage_gb","compute_hours","transfer_gb",
            "aws_cost","azure_cost","gcp_cost","cheapest","carbon_kg"]
    return jsonify([dict(zip(cols, r)) for r in rows])

if __name__ == "__main__":
    app.run(debug=True, port=5000)
