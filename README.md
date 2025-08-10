# 🌐 Cyferion Tech Status Dashboard

A **real-time service status dashboard** for Cyferion Tech, designed to provide transparency to users about system uptime, outages, and latency.  
This dashboard is powered by a backend service checker (`generate-status.mjs`) that pings each monitored endpoint and generates a `status.json` file for the frontend (`status.html`) to display.

---

## 📌 Features

- **Live Service Status** — Displays operational state or outages for each monitored service.
- **Latency Tracking** — Measures round-trip time for each service in milliseconds.
- **Incident Logging** — Shows current incidents pulled from automated checks.
- **Mobile-Friendly UI** — Fully responsive design for any screen size.
- **Lightweight & Fast** — Static HTML/CSS/JS with JSON as the data source.

---

## 🚀 How It Works

1. `generate-status.mjs` runs (manually or via GitHub Actions/cron job).
2. The script checks each service listed in `status.config.json` or `status.config.dev.json`.
3. Results are stored in `status.json` with:
   - Service name
   - Current status (`operational`, `outage`, or `degraded`)
   - Latency in milliseconds
   - Any open incidents
4. `status.html` fetches and displays these results for end-users.

---

## 📂 Project Structure

```plaintext
.
├── about.html             # About page
├── contact.html           # Contact page
├── games.html             # Games page
├── index.html             # Homepage
├── status.html            # Status dashboard page
├── styles.css             # Main CSS styling
├── script.js              # Frontend interactivity
├── generate-status.mjs    # Service status generator (Node.js)
├── status.config.json     # Service list for production
├── status.config.dev.json # Service list for local/dev testing
├── README.md              # This file
└── .gitignore             # Ignored files (logs, keys, generated files)
