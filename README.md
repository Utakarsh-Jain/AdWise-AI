# AdWise AI 🚀

AdWise AI is a premium, data-driven marketing analytics and budget optimization platform powered by Gemini Generative AI. It allows growth marketers and ad-ops professionals to upload campaign performance datasets, visualize marketing metrics in real-time, optimize budgets automatically across platforms, and extract strategic AI-generated recommendations.

---

## 🌟 Key Features

- **Asynchronous Data Ingestion**: Supports uploading both **CSV** and **Excel** (`.xlsx`, `.xls`) file formats containing campaign metrics. Processing runs in the background.
- **Smart Campaign Identification**: Automatically detects common platforms (Google, Meta, LinkedIn, TikTok, Twitter/X) from campaign names if platform designations are omitted.
- **Performance Analytics Dashboard**: Real-time KPI analysis (Spend, Conversions, CTR, CPC, CPA, and custom Performance Scores).
- **Budget Optimization Engine**: Computes smart reallocation models shifting funds from underperforming campaigns to high-efficiency ones, projecting conversion lifts.
- **Gemini Gen AI Recommendations**: Integrates with Gemini 1.5 Flash to generate executive-ready marketing reports and answer arbitrary questions about your campaigns.
- **Fallback Engine**: Local analytical rules ensure the app functions even without active API keys.

---

## 🛠️ Project Structure

The project is structured as a monorepo containing:
1. **/backend**: Node.js/Express application with Prisma ORM, SQLite database, and TypeScript.
2. **/frontend**: Next.js (App Router), TailwindCSS, Recharts, and TypeScript.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

---

### Backend Setup

1. **Navigate to the Backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="adwise_super_secret_token_123_change_me"
   GEMINI_API_KEY="your-gemini-api-key-here"  # Get this from https://aistudio.google.com/apikey
   ```

4. **Initialize Database & Prisma**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:5000`.

---

### Frontend Setup

1. **Navigate to the Frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`.

---

## 📊 Testing with Datasets

A sample dataset is provided at the root of the project to test the ingestion pipeline:
- **Location**: `campaign_data.csv`
- **Format supported**: CSV, Excel (`.xlsx`, `.xls`)
- **Headers recognized**:
  - **Date**: `Date`, `Day`
  - **Campaign**: `Campaign`, `Campaign_Name`, `Name`
  - **Platform**: `Platform`, `Channel`, `Source` (Optional, auto-inferred if omitted)
  - **Spend**: `Spend`, `Cost`, `Amount`
  - **Clicks**: `Clicks`, `Click`
  - **Impressions**: `Impressions`, `Impression`, `Views` (Optional, estimates as `Clicks * 15` if omitted)
  - **Conversions**: `Conversions`, `Conversion`, `Leads`

---

## 💻 Tech Stack

- **Frontend**: Next.js, React, TailwindCSS, Lucide Icons, Recharts
- **Backend**: Node.js, Express, TypeScript, Multer, SheetJS (XLSX), CSV-Parser
- **Database**: SQLite, Prisma ORM
- **AI Engine**: `@google/generative-ai` (Gemini 1.5 Flash)
