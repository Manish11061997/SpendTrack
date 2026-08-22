# 💳 SpendTrack — Intelligent Personal Finance & Budgeting Platform

[![Live App](https://img.shields.io/badge/Live_App-spendtrack--m--1106.web.app-indigo?style=for-the-badge&logo=google-chrome)](https://spendtrack-m-1106.web.app)
[![Android](https://img.shields.io/badge/Android_App-Ready-3DDC84?style=for-the-badge&logo=android)](https://spendtrack-m-1106.web.app)
[![React](https://img.shields.io/badge/React_19-TypeScript-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Firestore-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)

**SpendTrack** is a modern, high-performance personal finance tracking and budgeting application engineered for both web browsers and native mobile platforms (Android & iOS). Built with **React 19**, **TypeScript**, **Tailwind CSS v4**, **Firebase Cloud Firestore**, and **Capacitor**.

---

## 🎯 Purpose & Motive

Most expense trackers suffer from friction: manual entry fatigue, lack of real-time insights, rigid categories, and poor mobile performance. 

**SpendTrack solves these challenges by providing:**
1. **Zero-Friction Logging**: Add expenses in seconds via **AI Receipt Scanning (OCR)**, **Voice Commands**, **Quick Tap Templates**, or **Desktop Keyboard Shortcuts (`Cmd+K` / `N`)**.
2. **Proactive Budget Guardrails**: Real-time category budget warnings that calculate pacing and alert users *before* they overspend.
3. **Deep Financial Intelligence**: Interactive charts, month-over-month trend analysis, savings goal trackers, and an integrated **AI Financial Coach**.
4. **Universal Access & True Portability**: Instant 1-click CSV/Excel and multi-page executive PDF statements with native offline sync and biometrics/PIN privacy.

---

## ✨ Key Features Breakdown

### 📊 1. Executive Dashboard & Visual Analytics
- **Live Spending Pace**: Real-time radial burn gauge and month-over-month (MoM) % trend badges.
- **Category Donut Chart**: Interactive category breakdowns with 1-click filtering.
- **12-Month Historical Trajectory**: Bar chart showing annual spending trends.
- **Financial Health Radar & No-Spend Heatmap**: Daily habit tracking and visual financial health scoring.

### ⚡ 2. Smart Frictionless Inputs
- **AI Receipt Scanner**: Snap or upload any receipt; Google Gemini AI extracts merchant, amount, category, and line items.
- **Natural Voice Logging**: Speak naturally (*e.g., "Paid 450 for dinner at Starbucks"*) — auto-categorized into structured transactions.
- **Quick 1-Tap Templates**: Instantly log recurring daily routines (Coffee, Metro, Lunch) with a single tap.
- **CSV Data Import**: Bulk import statements from any major bank or credit card.

### 🛡️ 3. Budgeting, Subscriptions & Goals
- **Smart Category Limits**: Configurable monthly caps with color-coded safety badges (Green/Amber/Red).
- **Recurring Income & Salary Engine**: Auto-credits salary/paychecks on specified dates.
- **Subscription Tracker**: Monitors recurring bills with payment cadence reminders and duplicate detection.
- **Savings Goals Vault**: Track target milestones with visual progress rings.

### 📄 4. Professional Export & Portability
- **Executive PDF Statements**: High-resolution, multi-page branded PDF financial reports (dynamically lazy-loaded).
- **1-Click Excel / CSV Export**: Instant table export formatted for Google Sheets and Excel.

### 🔒 5. Privacy, Security & Native Mobile
- **Cloud Sync + Offline First**: Backed by Firebase Firestore with offline local queueing.
- **PIN Lock & Biometrics**: Protects financial data behind customizable 4-digit PIN security.
- **Native Android & iOS**: Powered by Capacitor with system local notifications and mobile haptic vibration feedback.

---

## 🏗️ Technical Architecture & Tech Stack

```
SpendTrack/
├── src/
│   ├── components/            # 26 Modular UI Components & Tabs
│   │   ├── DashboardTab.tsx   # Executive charts, health radar & quick templates
│   │   ├── HistoryTab.tsx     # Multi-year searchable archive & monthly grouping
│   │   ├── InsightsTab.tsx    # Category deep-dives & AI financial suggestions
│   │   ├── SettingsTab.tsx    # Currency, profile, PIN lock, data management
│   │   ├── AddTransactionForm.tsx # Frictionless log form with budget warnings
│   │   ├── ExportPDFButton.tsx    # Dynamic on-demand jsPDF report generator
│   │   └── ReceiptScannerModal.tsx # Gemini AI OCR receipt scanner
│   ├── utils/                 # Business logic, engines, & helpers
│   │   ├── aiReceiptParser.ts # Multimodal Gemini API receipt parser
│   │   ├── exportCsv.ts       # 1-click CSV spreadsheet generator
│   │   ├── haptics.ts         # Native Web Vibration API wrapper
│   │   ├── voiceParser.ts     # Natural language transaction parser
│   │   ├── currency.ts        # Multi-currency formatting & conversions
│   │   └── budgetRollover.ts  # Monthly rollover calculation engine
│   ├── firebase.ts            # Firebase Auth & Firestore client initialization
│   ├── types.ts               # Strict TypeScript domain interfaces
│   └── App.tsx                # Core state orchestration & responsive layout
├── android/                   # Native Android Capacitor wrapper (Gradle / APK)
├── ios/                       # Native iOS Capacitor wrapper (Xcode)
├── public/                    # Static assets, legal pages & offline manifest
├── capacitor.config.ts        # Native Capacitor cross-platform config
├── vite.config.ts             # Vite bundler with vendor chunk splitting
└── tsconfig.json              # Strict TypeScript 5+ compiler config
```

### Core Technologies:
- **Frontend Core**: React 19, TypeScript, Tailwind CSS v4
- **Animation & Visuals**: Motion (Framer Motion), Lucide Icons, Canvas Confetti
- **Data Visualization**: Recharts, D3
- **AI & Multimodal**: Google GenAI SDK (Gemini 2.0 Flash)
- **Backend & Database**: Firebase Authentication, Cloud Firestore
- **Mobile Bridge**: Capacitor (App, Local Notifications, Filesystem, Share)
- **Bundler & Tooling**: Vite 6, Rollup (Vendor code-splitting)

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Manish11061997/SpendTrack.git
   cd SpendTrack
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 📦 Production Build & Mobile Packaging

```bash
# Type-check and build optimized web bundle
npm run build

# Sync web bundle with native Android project
npx cap sync android

# Build release APK
cd android && ./gradlew assembleDebug
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
