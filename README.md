# Personal Portfolio Tracker 📈

A high-performance stock & sector portfolio tracker designed for Indian (NSE/BSE) and global equity investors.

## 🚀 Key Features

- **⚡ Lightning-Fast CMP Batch Fetching**: Fetches all quotes simultaneously in parallel batch requests (< 400ms instead of 45+ seconds of sequential requests).
- **📅 Purchase Date & Holding Duration Tracking**:
  - Save exact buy dates for every stock holding.
  - Automatically calculate holding duration (Days / Months / Years).
  - Categorize investments into **STCG (Short-Term Capital Gains)** vs **LTCG (Long-Term Capital Gains)** based on the 365-day Indian tax threshold.
  - Sort portfolio by oldest or newest purchase date.
- **📊 Technical & Benchmark Indicators**: Real-time Nifty 50 spot price with **20 EMA, 50 EMA, and 200 EMA** trend diagnostics.
- **🎯 Dynamic Alerts**: Instant visual notifications and celebration when target prices are hit or stop-loss limits are breached.
- **🥧 Sector Diversification**: Asset allocation pie chart and sector concentration warning (alerts when single sector exceeds 30%).
- **💾 Local Storage Persistence & JSON/CSV Backups**: Automatically saved to your browser database, plus 1-click export/import.
- **🌙 Dark / Light Mode**: Beautiful high-contrast theme toggle with remembered preference.

---

## 🌐 Deploy to Vercel (Live Website)

This project includes a `vercel.json` and is 100% ready to deploy to Vercel in 2 simple steps:

### Step 1: Push to GitHub
```bash
# Initialize git
git init
git add .
git commit -m "feat: portfolio tracker with fast live CMP & date persistence"

# Link to your GitHub repository
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2: Import into Vercel
1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Select your repository and click **Import**.
3. Framework Preset: **Vite** (auto-configured).
4. Click **Deploy**. Your portfolio is live in ~30 seconds!

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
