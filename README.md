# signalboard-frontend

React frontend for Signal // Board — AI stock signal dashboard.

**Companion repo:** [signalboard-backend](https://github.com/YOUR_USERNAME/signalboard-backend)

---

## Stack
- **React 18** + Vite
- **Recharts** — P&L charts
- **Lucide React** — icons
- Deployed on **Vercel** (free, always-on)

## Local setup

```bash
git clone https://github.com/YOUR_USERNAME/signalboard-frontend
cd signalboard-frontend

npm install

cp .env.example .env.local
# Edit .env.local:
# VITE_API_URL=http://localhost:8000   (local backend)
# VITE_WS_URL=ws://localhost:8000

npm run dev
# Opens at http://localhost:3000
```

Make sure `signalboard-backend` is running on port 8000.

## Project structure

```
signalboard-frontend/
├── index.html
├── vite.config.js
├── vercel.json              ← Vercel deploy config
├── .env.example             ← Copy to .env.local
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx             ← Entry point
    ├── App.jsx              ← Root component, tab navigation
    ├── styles/
    │   └── globals.css      ← All CSS variables + base styles
    ├── lib/
    │   ├── api.js           ← All backend API calls (single source)
    │   └── constants.js     ← Tickers, signal colors, config
    ├── hooks/
    │   └── usePrices.js     ← WebSocket + REST price hook
    ├── components/
    │   └── TickerCard.jsx   ← Reusable price + signal card
    └── pages/
        ├── Watchlist.jsx    ← Live prices for all tickers
        ├── NewsFeed.jsx     ← Stock news grouped by ticker
        ├── Signals.jsx      ← AI BUY/HOLD/SELL signals
        ├── Trader.jsx       ← $100 paper auto-trader + P&L
        └── Chat.jsx         ← AI chat for any stock question
```

## Deploy to Vercel

```bash
# Option 1: Vercel CLI (one command)
npm i -g vercel
vercel --prod

# Option 2: Connect GitHub repo in Vercel dashboard
# → vercel.com → New Project → Import from GitHub
# → Set env vars: VITE_API_URL, VITE_WS_URL
```

## GitHub Secrets (for auto-deploy CI)

Add these in GitHub → Settings → Secrets:
- `VERCEL_TOKEN` — from vercel.com/account/tokens
- `VERCEL_ORG_ID` — from `.vercel/project.json` after first deploy
- `VERCEL_PROJECT_ID` — from `.vercel/project.json`

## Environment variables

```bash
# .env.local (development)
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Production (set in Vercel dashboard)
VITE_API_URL=http://YOUR_VM_IP:8000
VITE_WS_URL=ws://YOUR_VM_IP:8000
```

## Adding a new page

1. Create `src/pages/MyPage.jsx`
2. Add to `TABS` array in `src/App.jsx`
3. Add `{tab === "mypage" && <MyPage prices={prices} />}` in App render
