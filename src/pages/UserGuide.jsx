// src/pages/UserGuide.jsx
// How to use SignalBoard — for family & friends onboarding

import { useState } from "react";

const MONO = "'IBM Plex Mono', monospace";
const GREEN = "#3fb950";
const AMBER = "#e3b341";
const RED   = "#f85149";
const BLUE  = "#58a6ff";

const sections = [
  {
    id: "what",
    icon: "📊",
    title: "What is SignalBoard?",
    content: [
      {
        type: "text",
        text: "SignalBoard is an AI-powered stock signal platform with paper (virtual) trading. It analyses real market data — price momentum, RSI, MACD, insider trades, news sentiment — and generates BUY / SELL / HOLD signals using Claude AI.",
      },
      {
        type: "callout",
        color: AMBER,
        text: "⚠ All money is VIRTUAL. No real funds are ever used. Think of it as a stock market simulator with real data.",
      },
      {
        type: "pills",
        items: [
          { label: "Real market data", color: GREEN },
          { label: "AI signal generation", color: BLUE },
          { label: "Virtual trading only", color: AMBER },
          { label: "No real money", color: RED },
        ],
      },
    ],
  },
  {
    id: "tabs",
    icon: "🗂",
    title: "The 4 Main Tabs",
    content: [
      {
        type: "tab_list",
        items: [
          {
            tab: "Live Prices",
            icon: "📈",
            color: GREEN,
            desc: "Real-time prices for all stocks in your watchlist. Updated every 5 seconds via WebSocket. Click any stock to see its chart, news, and AI signal.",
            tips: ["Add stocks via the search bar (top right)", "25 symbol limit total", "Click a ticker to open its detail panel"],
          },
          {
            tab: "AI Signals",
            icon: "🤖",
            color: BLUE,
            desc: "The signal feed — one card per symbol showing BUY/SELL signals with HIGH confidence. Generated every market session (pre-market, market hours, post-market). Only HIGH confidence BUY/SELL signals appear here.",
            tips: ["Click a card to expand bull/bear case, key factors, insider activity", "📋 History button shows all past signals for that stock", "Signals expire at end of each session — fresh analysis every session"],
          },
          {
            tab: "Auto-Trader",
            icon: "⚡",
            color: AMBER,
            desc: "Automated virtual trading. Choose a strategy, allocate virtual funds, and the AI manages buys and sells automatically based on signals. Also has a Manual Trades section for your own picks.",
            tips: ["Start small — allocate $100-$500 to test a strategy", "Stop-loss runs every 60 seconds to protect positions", "Manual trades use your available cash directly — no strategy needed"],
          },
          {
            tab: "AI Chat",
            icon: "💬",
            color: "#a371f7",
            desc: "Ask any question about a stock — earnings, analyst targets, recent news, technical setup. Claude searches the web and gives you a real analyst-style answer.",
            tips: ["Rate limited to 10 messages/minute", "Works best when you have a stock selected in Live Prices", "Not financial advice — use for research only"],
          },
        ],
      },
    ],
  },
  {
    id: "signals",
    icon: "🎯",
    title: "Understanding Signals",
    content: [
      {
        type: "signal_table",
        items: [
          { signal: "BUY", color: GREEN, meaning: "AI sees bullish setup — momentum, technicals, insider buying aligned", action: "Auto-trader may open a position if strategy is active" },
          { signal: "SELL", color: RED, meaning: "AI sees bearish setup — overbought, insider selling, momentum fading", action: "Auto-trader may close existing position or skip buying" },
          { signal: "HOLD", color: AMBER, meaning: "Mixed signals or insufficient conviction — no strong directional view", action: "Auto-trader does nothing for this stock" },
        ],
      },
      {
        type: "text",
        text: "Only HIGH confidence BUY/SELL signals appear in the feed. MEDIUM/LOW signals and HOLD signals are generated but filtered out.",
      },
      {
        type: "metric_row",
        items: [
          { label: "Conviction Score", desc: "1–10 rating of signal strength. 8+ is very high conviction." },
          { label: "Expected Return", desc: "AI's projected price move over the timeframe. +4% = expects 4% gain." },
          { label: "Stop-Loss", desc: "Price at which the auto-trader will sell to limit losses." },
          { label: "Target Price", desc: "AI's price target. Not guaranteed — purely analytical." },
        ],
      },
    ],
  },
  {
    id: "strategies",
    icon: "⚡",
    title: "Auto-Trader Strategies",
    content: [
      {
        type: "strategy_table",
        items: [
          { name: "Aggressive Growth", risk: "HIGH", color: RED, pos: "25%", sl: "8%", universe: "NVDA AAPL META AMZN GOOGL MSFT HOOD", best: "High risk tolerance, long time horizon" },
          { name: "Balanced / Hybrid", risk: "MEDIUM", color: AMBER, pos: "15%", sl: "5%", universe: "SPY VOO SCHD MSFT AAPL NVDA JEPI", best: "Moderate risk, mixed growth + income" },
          { name: "Tech Heavy", risk: "HIGH", color: RED, pos: "20%", sl: "7%", universe: "NVDA MSFT AAPL GOOGL META AMZN", best: "Strong tech conviction, higher volatility ok" },
          { name: "Income / Dividend", risk: "LOW", color: GREEN, pos: "20%", sl: "4%", universe: "JEPI JEPQ SCHD VOO SGOV", best: "Capital preservation + steady income" },
          { name: "Conservative", risk: "LOW", color: GREEN, pos: "20%", sl: "3%", universe: "SGOV SCHD VOO AAPL MSFT", best: "Lowest risk, safety first" },
        ],
      },
      {
        type: "callout",
        color: BLUE,
        text: "💡 Tip: Start with Conservative or Balanced to understand how the auto-trader works before using Aggressive or Tech Heavy.",
      },
    ],
  },
  {
    id: "getting-started",
    icon: "🚀",
    title: "Getting Started — Step by Step",
    content: [
      {
        type: "steps",
        items: [
          { step: 1, title: "Check the Signal Feed", desc: "Go to AI Signals → see what stocks have HIGH confidence BUY/SELL signals today. Read the bull/bear case to understand why." },
          { step: 2, title: "Browse Live Prices", desc: "Go to Live Prices → click a stock → open the AI Signal tab to generate an on-demand signal for any stock in your watchlist." },
          { step: 3, title: "Choose a Strategy", desc: "Go to Auto-Trader → read each strategy's description → pick one that matches your risk comfort level." },
          { step: 4, title: "Accept the Agreement", desc: "Read and accept the paper trading disclaimer. All checkboxes must be confirmed before you can start." },
          { step: 5, title: "Allocate Virtual Funds", desc: "Click 'Allocate Funds to Start' → enter an amount from your $10,000 virtual cash. Start with $100–$500 to experiment." },
          { step: 6, title: "Watch It Trade", desc: "The auto-trader runs automatically. Check back to see positions open, stop-losses trigger, and P&L update in real time." },
          { step: 7, title: "Try Manual Trades", desc: "In the My Manual Trades tab, you can manually BUY any stock from your available cash — no strategy needed." },
        ],
      },
    ],
  },
  {
    id: "limits",
    icon: "⚠",
    title: "Limits & Rules",
    content: [
      {
        type: "limit_list",
        items: [
          { icon: "💰", label: "Starting Virtual Cash", value: "$10,000", note: "Cannot deposit or withdraw. Fixed starting amount." },
          { icon: "📋", label: "Watchlist Limit", value: "25 symbols", note: "Including the 13 default tickers. Remove one to add another." },
          { icon: "🤖", label: "On-Demand Signals", value: "5 per minute", note: "Rate limited to prevent API abuse. Wait 60s if hit." },
          { icon: "💬", label: "AI Chat", value: "10 per minute", note: "Rate limited per user. Resets every 60 seconds." },
          { icon: "📊", label: "Signal Feed", value: "HIGH confidence only", note: "Only BUY/SELL with HIGH confidence appear. HOLD/LOW filtered out." },
          { icon: "⏰", label: "Signal Freshness", value: "Per session", note: "Signals refresh each market session — pre-market, market, post-market." },
        ],
      },
    ],
  },
  {
    id: "disclaimer",
    icon: "⚖",
    title: "Important Disclaimer",
    content: [
      {
        type: "callout",
        color: RED,
        text: "🚨 SignalBoard is NOT financial advice. All signals are AI-generated algorithmic analysis — not recommendations from a licensed financial adviser.",
      },
      {
        type: "text",
        text: "Past signal performance does not guarantee future results. Real stock markets are unpredictable and carry real risk of loss. Never make real investment decisions based solely on SignalBoard signals.",
      },
      {
        type: "callout",
        color: AMBER,
        text: "📚 Use SignalBoard to learn how technical analysis works, understand market signals, and practice trading psychology — all without real financial risk.",
      },
    ],
  },
];

function TextBlock({ text }) {
  return (
    <p style={{ fontFamily: MONO, fontSize: 12, color: "#8b949e", lineHeight: 1.8, margin: "8px 0" }}>
      {text}
    </p>
  );
}

function Callout({ color, text }) {
  return (
    <div style={{
      background: `${color}10`, border: `1px solid ${color}30`,
      borderRadius: 8, padding: "10px 14px", margin: "10px 0",
      fontFamily: MONO, fontSize: 11, color, lineHeight: 1.6,
    }}>{text}</div>
  );
}

function Pills({ items }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
      {items.map(({ label, color }) => (
        <span key={label} style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 700,
          background: `${color}15`, border: `1px solid ${color}40`,
          borderRadius: 20, padding: "3px 12px", color,
        }}>{label}</span>
      ))}
    </div>
  );
}

function TabList({ items }) {
  const [active, setActive] = useState(0);
  const item = items[active];
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {items.map((t, i) => (
          <button key={t.tab} onClick={() => setActive(i)} style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 700,
            padding: "4px 12px", borderRadius: 6, cursor: "pointer",
            background: active === i ? `${t.color}20` : "transparent",
            border: `1px solid ${active === i ? t.color : "#30363d"}`,
            color: active === i ? t.color : "#8b949e",
          }}>{t.icon} {t.tab}</button>
        ))}
      </div>
      <div style={{ background: "#0d1117", border: `1px solid ${item.color}30`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: "#e6edf3", marginBottom: 8, lineHeight: 1.7 }}>
          {item.desc}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {item.tips.map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: item.color, fontFamily: MONO, fontSize: 10, flexShrink: 0 }}>→</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: "#8b949e", lineHeight: 1.6 }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SignalTable({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "10px 0" }}>
      {items.map(({ signal, color, meaning, action }) => (
        <div key={signal} style={{
          display: "grid", gridTemplateColumns: "60px 1fr 1fr",
          gap: 12, alignItems: "center",
          background: `${color}08`, border: `1px solid ${color}25`,
          borderRadius: 8, padding: "10px 14px",
        }}>
          <span style={{
            fontFamily: MONO, fontSize: 11, fontWeight: 700,
            background: `${color}20`, border: `1px solid ${color}40`,
            borderRadius: 4, padding: "2px 8px", color, textAlign: "center",
          }}>{signal}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: "#8b949e", lineHeight: 1.6 }}>{meaning}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: "#6e7681", lineHeight: 1.6 }}>{action}</span>
        </div>
      ))}
    </div>
  );
}

function MetricRow({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "10px 0" }}>
      {items.map(({ label, desc }) => (
        <div key={label} style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: BLUE, marginBottom: 4 }}>{label}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "#8b949e", lineHeight: 1.5 }}>{desc}</div>
        </div>
      ))}
    </div>
  );
}

function StrategyTable({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "10px 0" }}>
      {items.map(({ name, risk, color, pos, sl, universe, best }) => (
        <div key={name} style={{ background: "#161b22", border: `1px solid ${color}25`, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "#e6edf3" }}>{name}</span>
            <span style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 700,
              background: `${color}20`, border: `1px solid ${color}40`,
              borderRadius: 4, padding: "2px 8px", color,
            }}>{risk}</span>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
            {[["Position", pos], ["Stop-loss", sl]].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681" }}>{l.toUpperCase()}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "#e6edf3" }}>{v}</div>
              </div>
            ))}
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: MONO, fontSize: 8, color: "#6e7681", marginBottom: 2 }}>UNIVERSE</div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: "#8b949e" }}>{universe}</div>
            </div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: color, opacity: 0.8 }}>Best for: {best}</div>
        </div>
      ))}
    </div>
  );
}

function Steps({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "10px 0" }}>
      {items.map(({ step, title, desc }) => (
        <div key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: `${BLUE}20`, border: `1px solid ${BLUE}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: MONO, fontSize: 11, fontWeight: 700, color: BLUE,
          }}>{step}</div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "#e6edf3", marginBottom: 2 }}>{title}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: "#8b949e", lineHeight: 1.6 }}>{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LimitList({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "10px 0" }}>
      {items.map(({ icon, label, value, note }) => (
        <div key={label} style={{
          display: "grid", gridTemplateColumns: "24px 1fr auto",
          gap: 10, alignItems: "center",
          background: "#161b22", border: "1px solid #21262d",
          borderRadius: 8, padding: "8px 12px",
        }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#e6edf3" }}>{label}</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: "#6e7681", marginTop: 1 }}>{note}</div>
          </div>
          <span style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 700, color: BLUE,
            background: `${BLUE}15`, border: `1px solid ${BLUE}30`,
            borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap",
          }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function renderContent(block, i) {
  switch (block.type) {
    case "text":        return <TextBlock key={i} text={block.text} />;
    case "callout":     return <Callout key={i} color={block.color} text={block.text} />;
    case "pills":       return <Pills key={i} items={block.items} />;
    case "tab_list":    return <TabList key={i} items={block.items} />;
    case "signal_table":return <SignalTable key={i} items={block.items} />;
    case "metric_row":  return <MetricRow key={i} items={block.items} />;
    case "strategy_table": return <StrategyTable key={i} items={block.items} />;
    case "steps":       return <Steps key={i} items={block.items} />;
    case "limit_list":  return <LimitList key={i} items={block.items} />;
    default: return null;
  }
}

export default function UserGuide() {
  const [active, setActive] = useState("what");
  const current = sections.find(s => s.id === active);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 4px" }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
        border: "1px solid #21262d", borderRadius: 14,
        padding: "20px 24px", marginBottom: 16,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <span style={{ fontSize: 36 }}>📖</span>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: "#e6edf3" }}>
            SignalBoard User Guide
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#6e7681", marginTop: 2 }}>
            Everything you need to know to get started · Virtual trading only
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12 }}>

        {/* Sidebar nav */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)} style={{
              fontFamily: MONO, fontSize: 11, textAlign: "left",
              padding: "8px 12px", borderRadius: 8, cursor: "pointer",
              background: active === s.id ? "#1f6feb20" : "transparent",
              border: `1px solid ${active === s.id ? "#388bfd50" : "transparent"}`,
              color: active === s.id ? "#58a6ff" : "#8b949e",
              fontWeight: active === s.id ? 700 : 400,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>{s.icon}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {current && (
          <div style={{
            background: "#161b22", border: "1px solid #21262d",
            borderRadius: 12, padding: "20px 20px",
            minHeight: 400,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #21262d" }}>
              <span style={{ fontSize: 22 }}>{current.icon}</span>
              <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: "#e6edf3" }}>{current.title}</span>
            </div>
            {current.content.map((block, i) => renderContent(block, i))}
          </div>
        )}
      </div>

      <div style={{
        textAlign: "center", marginTop: 16,
        fontFamily: MONO, fontSize: 9, color: "#6e7681",
      }}>
        SignalBoard · Virtual trading platform · Not financial advice · All returns simulated
      </div>
    </div>
  );
}