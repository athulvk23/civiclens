# CivicLens — Community Problems to Action

An AI-powered civic issue reporting and community triage web application built with **React 19 + Vite + TypeScript + Tailwind CSS + Leaflet (OpenStreetMap) + Google Gemini 3.8 Flash Vision (`@google/genai`)**.

CivicLens turns raw resident observations and uploaded photos into structured, PII-redacted, authority-routed civic tickets plotted on a minimalist Light/Dark split-pane map workspace across **Central Chennai**, **SRM Chennai (Kattankulathur)**, **VIT Vellore (Katpadi)**, **IIT Palakkad (Kanjikode)**, or any location searched worldwide.

---

## 1. Quick Start (For Friends & Testers)

### Option A: 1-Click Windows Launcher
Double-click **`START-CIVICLENS.bat`**, then open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### Option B: Terminal Commands
```bash
# 1. Install dependencies
npm install

# 2. Start the full-stack server (React UI + /api/* server middleware)
npm run dev

# 3. Open in your browser:
# http://localhost:5173/
```

### Optional Commands
```bash
# Run the automated 6-test end-to-end verification suite
npm test

# Build for production
npm run build
```

> **Note on Gemini Vision AI Key:** The app works out-of-the-box in **Demo Triage Mode** with 20 pre-seeded tickets and real hazard photos. To test live **Gemini 3.8 Flash** multimodal vision analysis, click the **Civic Coordinator** profile button in the top-right header (or create a `.env` file from `.env.example`) and paste a `GEMINI_API_KEY`.

---

## 2. Pre-Seeded Multi-Hub Demo Dataset (20 Tickets + Real Photos)

Use the 1-click hub switcher pills in the top dark-navy header bar to jump between regions:
- **Central Chennai (7 Tickets):** Anna Salai / Teynampet, Pondy Bazaar (T. Nagar), Luz Church Road (Mylapore), LB Road (Adyar), Kathipara Flyover (Guindy), Velachery Main Road, Egmore Railway Station.
- **SRM Chennai — KTR (5 Tickets):** SRM Arch Gate (GST Road Service Lane), Potheri Railway Station, SRM Tech Park Avenue, Valliammai Junction, Guduvancheri Bus Bay.
- **VIT Vellore (4 Tickets):** Tiruvalam Road (Outside VIT Main Gate 1), Katpadi Railway Station Approach, VIT Gate 3 (Vaibhav Nagar), Chittoor Bus Stand Junction.
- **IIT Palakkad (4 Tickets):** Nila Campus Approach Road (Kanjikode), Sahyadri Campus Link Road (NH-544), Kanjikode Town Bus Stand Underpass, Pudussery Industrial Service Lane.
- **Search Anywhere:** Type any university, landmark, or city in the search bar (or inside `+ New Ticket`) to fly the map there via OpenStreetMap Nominatim.
