<div align="center">

# 🏙️ CivicAI

### AI-Powered Civic Issue Management for Modern Municipalities

**CivicAI** connects citizens with government authorities through Gemini AI — making it effortless to report civic problems and making it fast for authorities to act on them.

[![Built with React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black&style=flat-square)](https://firebase.google.com)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google&logoColor=white&style=flat-square)](https://ai.google.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vite.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

</div>

---

## 📌 Overview

Cities across India receive thousands of civic complaints daily — potholes, broken streetlights, garbage overflow, burst pipes — yet most remain unresolved for weeks due to manual triage and poor data visibility.

**CivicAI** is a full-stack web application that uses Google Gemini AI to automatically categorize, prioritize, and route citizen-reported civic issues to the right government department in seconds. Authorities get a Google-quality admin dashboard with live maps, AI-generated insights, and weekly analytics reports.

> Built for the **Google AI Hackathon**, CivicAI demonstrates how large language models can meaningfully improve public service delivery at city scale.

---

## 🔗 Live Demo

**Coming Soon**

**GitHub Repository:** `<repository-url-placeholder>`

---

## ✨ Features

### 🏘️ Citizen Portal

| Feature | Description |
|---|---|
| **AI Issue Reporting** | Citizens describe a problem in plain language. Gemini automatically identifies the category, priority, and responsible department. |
| **Image Upload** | Attach photos of the issue directly to the report. Images are stored in Firebase Storage. |
| **GPS Location Detection** | Reports are pinned to GPS coordinates automatically. Citizens can also place a pin manually on a map. |
| **Duplicate Detection** | Gemini compares new reports against recent submissions to detect duplicates before they are submitted, reducing database noise. |
| **AI Analysis Review** | Before submitting, citizens see a structured AI analysis — category, priority, department, confidence score — and can accept or override it. |
| **Real-time Submission** | Reports are written to Firestore and immediately visible to authorities. |

### 🏛️ Authority Portal

| Feature | Description |
|---|---|
| **Secure Login** | Firebase Email/Password authentication with session persistence and protected routes. |
| **Live Dashboard** | A real-time overview of all pending, assigned, and in-progress reports with KPI cards. |
| **Assignment Workflow** | Assign any report to a department and officer with one click. |
| **Resolution Workflow** | Mark reports as resolved with structured notes, resolver name, and completion timestamp. |
| **Archive System** | Resolved reports are archived to preserve historical data without cluttering the active queue. |
| **Interactive Map** | All reports are visualized on a Leaflet map clustered by neighbourhood. |
| **Report History** | Browse the full archive of past reports with multi-dimensional filtering by category, department, officer, priority, and date. |
| **AI Insights Dashboard** | Gemini analyzes the entire archive to produce executive summaries, trend analysis, department performance insights, and hotspot identification. |
| **Weekly Report Generator** | Select any week and generate a Gemini-authored report covering metrics, category breakdowns, departmental analysis, and actionable recommendations. |

---

## 🤖 AI Features (Powered by Gemini)

CivicAI uses **Gemini 2.5 Flash** across four distinct AI workflows:

### 1. Citizen Report Analysis
When a citizen submits a description, Gemini returns a structured JSON object identifying:
- **Category** (Road, Garbage, Water, Electricity, Drainage, Other)
- **Department** responsible (BBMP Roads, BBMP Sanitation, BWSSB, BESCOM, Traffic Police)
- **Priority** (Low, Medium, High, Critical)
- **Natural-language Summary** suitable for authority review
- **Confidence Score** (percentage)
- **Visible Hazards** — a list of risk identifiers

### 2. Duplicate Detection
Before a report is submitted, Gemini compares it against recent reports from the same area. If a similar issue has already been reported, it displays a structured similarity warning allowing the citizen to cancel or proceed.

### 3. AI Insights Dashboard
After sufficient archived reports accumulate, the Insights page fires a Gemini request that returns:
- Executive summary of the civic situation
- Issue hotspots by area and category
- Trend analysis with data-backed insights
- Department performance assessment with resolution-time estimates
- Prioritized areas requiring immediate attention
- Actionable recommendations for municipal leadership

### 4. Weekly Report Generator
For a selected week, Gemini generates a complete structured report including:
- Executive summary
- Key performance metrics (total reports, resolution rate, average resolution time)
- Category and department breakdowns
- Notable trends
- Strategic recommendations

> **Important:** All Gemini API calls are made server-free, directly from the React frontend using the `@google/genai` SDK. No backend server or proxy is required.

---

## 📸 Screenshots

> _Screenshots will be added after live deployment._

| Screen | Preview |
|---|---|
| Citizen Hub | ![Citizen Hub](docs/screenshots/citizen-hub.png) |
| Authority Dashboard | ![Authority Dashboard](docs/screenshots/authority-dashboard.png) |
| AI Insights | ![AI Insights](docs/screenshots/ai-insights.png) |
| Weekly Report | ![Weekly Report](docs/screenshots/weekly-report.png) |
| Report History | ![History](docs/screenshots/history.png) |

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 |
| **Build Tool** | Vite 8 |
| **Routing** | React Router DOM v7 |
| **Styling** | Vanilla CSS with a custom CivicAI Design System (`design-system.css`) |
| **Typography** | Google Sans, Inter (Google Fonts) |
| **Icons** | Material Symbols Outlined (Google Fonts) |
| **Database** | Cloud Firestore (Firebase v12) |
| **Authentication** | Firebase Authentication (Email/Password) |
| **File Storage** | Firebase Storage |
| **AI / LLM** | Google Gemini 2.5 Flash via `@google/genai` SDK |
| **Maps** | Leaflet + React Leaflet |
| **Linting** | ESLint |

---

## 🏗️ Architecture

### Citizen Reporting Flow

```
Citizen opens CitizenHub
        │
        ▼
  Opens ReportDrawer
        │
        ├── GPS detects location (or manual pin on map)
        ├── Citizen attaches photo (Firebase Storage upload)
        │
        ▼
  Citizen writes description
        │
        ▼
  Gemini Duplicate Detection
  (compares against recent reports)
        │
        ▼
  Gemini Report Analysis
  (category, department, priority, summary, confidence)
        │
        ▼
  AIAnalysisReview component
  (citizen can accept or override AI decision)
        │
        ▼
  Report written to Firestore
        │
        ▼
  Success toast → Drawer resets
```

### Authority Workflow

```
Authority authenticates via Firebase Auth
        │
        ▼
  AuthorityDashboard (live Firestore listener)
        │
        ├── Pending reports → AssignModal → status: assigned
        │
        ├── Assigned reports → ResolutionModal → status: resolved
        │
        ├── Resolved reports → Archive → status: archived
        │
        ├── DashboardMap (Leaflet, all live reports)
        │
        ├── HistoryPage (full archive with filters)
        │
        ├── AIInsightsDashboard (Gemini analysis of archives)
        │
        └── WeeklyReport (Gemini weekly analytics by date range)
```

---

## 📁 Folder Structure

```
civicai/
├── public/                 # Static public assets
├── scripts/
│   └── seed-demo-data.js   # Firestore demo dataset seeder
├── src/
│   ├── assets/             # Static image assets
│   ├── components/         # Reusable UI components
│   │   ├── AIAnalysisReview.jsx    # AI result review panel
│   │   ├── AssignModal.jsx         # Report assignment dialog
│   │   ├── AuthorityNav.jsx        # Persistent left sidebar
│   │   ├── DashboardMap.jsx        # Leaflet map wrapper
│   │   ├── DashboardStats.jsx      # KPI stat cards
│   │   ├── LoadingSkeleton.jsx     # Shimmer loading states
│   │   ├── LocationMarker.jsx      # Interactive map pin
│   │   ├── MapView.jsx             # Citizen map view
│   │   ├── ReportCard.jsx          # Single report card
│   │   ├── ReportDrawer.jsx        # Full citizen report form
│   │   ├── ReportSection.jsx       # Grouped report list
│   │   ├── ResolutionModal.jsx     # Resolution dialog
│   │   ├── SearchBar.jsx           # Shared search input
│   │   └── Toast.jsx               # Notification toasts
│   ├── pages/              # Top-level route pages
│   │   ├── AIInsightsDashboard.jsx # AI analytics page
│   │   ├── AuthorityDashboard.jsx  # Main authority view
│   │   ├── AuthorityLogin.jsx      # Login screen
│   │   ├── CitizenHub.jsx          # Citizen landing page
│   │   ├── HistoryPage.jsx         # Archive & history
│   │   └── WeeklyReport.jsx        # Weekly report generator
│   ├── services/           # Firebase & AI integrations
│   │   ├── ai.js           # Gemini SDK initialization
│   │   ├── auth.js         # Firebase Auth helpers
│   │   └── firebase.js     # Firestore CRUD operations
│   ├── utils/              # Shared utility functions
│   │   ├── analytics.js    # Report aggregation helpers
│   │   ├── departments.js  # Department list
│   │   ├── priorities.js   # Priority list
│   │   └── reports.js      # Report categories & formatters
│   ├── App.jsx             # Router, protected routes
│   ├── design-system.css   # CivicAI Design System (source of truth)
│   ├── index.css           # Global base reset
│   └── main.jsx            # React entry point
├── .env                    # Environment variables (not committed)
├── index.html              # HTML shell
├── package.json
└── vite.config.js
```

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** v18 or later
- A **Firebase project** with Firestore, Authentication, and Storage enabled
- A **Google AI Studio** API key for Gemini

### 1. Clone the repository

```bash
git clone https://github.com/your-username/civicai.git
cd civicai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then fill in your values (see [Environment Variables](#-environment-variables) below).

### 4. Firebase setup

1. Go to the [Firebase Console](https://console.firebase.google.com) and create a new project.
2. Enable **Firestore Database** (start in production mode).
3. Enable **Authentication** → Sign-in method → **Email/Password**.
4. Enable **Storage**.
5. Register a **Web App** and copy the config values into your `.env`.
6. Create an authority user: in Firebase Authentication, add a user with the email/password the authority team will use to log in.

> **Firestore Indexes:** The application queries `reports` ordered by `createdAt` with `status` filters. Create a composite index on `(status ASC, createdAt DESC)` in the Firestore console if prompted.

### 5. Gemini API setup

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Create an API key.
3. Add it to your `.env` as `VITE_GEMINI_API_KEY`.

### 6. Run locally

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

### 7. Production build

```bash
npm run build
```

The compiled output is placed in `dist/`. Deploy this folder to any static host (Firebase Hosting, Vercel, Netlify, etc.).

---

## 🔐 Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# ── Firebase Configuration ──────────────────────────────
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# ── Google Gemini AI ─────────────────────────────────────
VITE_GEMINI_API_KEY=your-gemini-api-key
```

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key (from Firebase project settings) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket URL |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID |
| `VITE_GEMINI_API_KEY` | Google Gemini API key from Google AI Studio |

> **Security note:** Never commit your `.env` file. It is already included in `.gitignore`.

---

## 🧪 Running the Project

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server at `localhost:5173` |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across all source files |

---

## 🌱 Demo Dataset

CivicAI ships with a standalone Node.js seeder that populates Firestore with **120 realistic Bengaluru civic reports** for demonstration purposes. Reports span 12 weeks, cover all categories and departments, and include geographic clustering across major Bengaluru neighbourhoods.

### Seeder commands

| Command | Description |
|---|---|
| `npm run seed:clear` | **(Recommended for demos)** Delete all existing reports, then seed 120 fresh ones |
| `npm run seed` | Append 120 new reports to whatever already exists |
| `npm run seed:dry` | Print the generated dataset to the terminal without touching Firestore |

### What the seeder generates

- **Geography:** Coordinates clustered around 12 Bengaluru hotspots (Whitefield, Koramangala, Indiranagar, HSR Layout, Electronic City, Yelahanka, JP Nagar, Hebbal, Malleshwaram, Rajajinagar, BTM Layout, Marathahalli)
- **Status distribution:** ~20% pending, ~25% assigned, ~30% resolved, ~25% archived
- **AI metadata:** Every report has pre-computed Gemini AI fields (category, priority, summary, confidence, hazards)
- **Duplicate cluster:** 7 near-duplicate "Koramangala junction pothole" reports within a 500m radius to demonstrate duplicate detection
- **Resolution timelines:** Realistic assignment → resolution → archival timestamps for accurate KPI calculations

---

## 🎨 Design System

CivicAI uses a bespoke Design System (`src/design-system.css`) inspired by Google Material Design and the Google Admin Console aesthetic.

**Brand colours:**
- **Navy** `#1A3F6F` — primary actions, navigation, CTAs
- **Amber** `#E67E22` — warnings, medium priority
- **Teal** `#1D9E75` — success, resolved status
- **App Background** `#F1EFE8` — warm off-white

**Typography:** Google Sans (primary), Inter (fallback)

**Design tokens** cover spacing, shadows, border radii, animation keyframes, and every interactive state. All components consume `ds-` CSS classes. No Tailwind utility classes are used at runtime.

---

## 🗺️ Project Highlights

- **Gemini-first architecture** — AI is not a feature added on top; it is the core of every workflow
- **No backend required** — Firebase SDK and Gemini SDK run entirely in the browser
- **Google Workspace aesthetic** — Premium Google Admin Console-style UI built with vanilla CSS
- **Production-grade auth** — Firebase Authentication with protected routes and session persistence
- **Real-time data** — Firestore powers live dashboard updates without polling
- **Accessible** — `prefers-reduced-motion` support, WCAG-compliant colour contrast, keyboard-navigable modals
- **Print-ready** — Weekly Reports render cleanly via `@media print` CSS

---

## 🔭 Future Enhancements

The following features are planned for future development:

- 🔔 **Push Notifications** — Notify citizens when their report status changes
- 👤 **Citizen Accounts** — Allow citizens to track their own submitted reports
- 📱 **Mobile Application** — React Native app for on-the-go reporting
- 🗣️ **Multilingual Support** — Kannada, Hindi, and Tamil interface for wider accessibility
- 📡 **Offline Reporting** — Queue reports locally and sync when connectivity is restored
- 🔮 **Predictive Maintenance** — Forecast infrastructure failures before they are reported
- 🗺️ **GIS Analytics** — Advanced geospatial analysis overlaid with city ward boundaries
- 🤝 **Inter-department Escalation** — Automatic cross-department notification for complex issues
- 📊 **Custom Report Builder** — Authority-configurable date ranges, filters, and export formats
- 🏅 **Citizen Engagement Score** — Gamification to encourage repeat reporting

---

## 👥 Team

| Name | Role |
|---|---|
| _Team Member 1_ | Full Stack Development |
| _Team Member 2_ | AI Integration & Prompt Engineering |
| _Team Member 3_ | UI/UX Design |

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 CivicAI Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgements

CivicAI was built on the shoulders of excellent open-source projects and Google's infrastructure:

- **[Google Gemini](https://ai.google.dev)** — Powering all AI analysis and report generation
- **[Firebase](https://firebase.google.com)** — Firestore, Authentication, and Storage
- **[React](https://react.dev)** — UI framework
- **[Vite](https://vite.dev)** — Lightning-fast development and build tool
- **[React Router](https://reactrouter.com)** — Client-side routing
- **[Leaflet](https://leafletjs.com)** — Interactive map rendering
- **[React Leaflet](https://react-leaflet.js.org)** — React bindings for Leaflet
- **[Material Symbols](https://fonts.google.com/icons)** — Google's icon system
- **[Google Fonts](https://fonts.google.com)** — Google Sans & Inter typefaces

---

<div align="center">

Made with ❤️ for the **Google AI Hackathon**

</div>
