// src/pages/Chat.jsx
import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api";

const TICKERS = ["SPY","VOO","JEPI","JEPQ","SCHD","SGOV","MSFT","AAPL","NVDA","GOOGL","AMZN","META","HOOD"];

const EXAMPLES = [
  "What is NVDA's current growth outlook?",
  "Is JEPI a good income ETF for my portfolio?",
  "Compare MSFT vs GOOGL for the next 6 months",
  "What does a BUY signal on META mean for me?",
  "Should I hold SPY during a market downturn?",
];

export default function Chat({ prices }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Ask me anything about your stocks, ETFs, or signals. I'll give you a concise, data-backed answer.",
  }]);
  const [input, setInput] = useState("");
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const send = async (question) => {
    const q = question || input.trim();
    if (!q) return;
    setMessages(prev => [...prev, { role:"user", content:q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.chat.ask(q, symbol || null);
      setMessages(prev => [...prev, { role:"assistant", content:res.answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role:"assistant", content:"Error: " + e.message }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 140px)" }}>
      {/* Symbol context picker */}
      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        <span className="hint" style={{ display:"flex", alignItems:"center" }}>Context:</span>
        <button className={`btn ${!symbol ? "btn-primary" : ""}`} onClick={() => setSymbol("")}>None</button>
        {TICKERS.map(t => (
          <button key={t} className={`btn ${symbol===t ? "btn-primary" : ""}`}
            onClick={() => setSymbol(t)}>{t}</button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
        {messages.map((m, i) => (
          <div key={i} className="fade-in" style={{
            alignSelf: m.role==="user" ? "flex-end" : "flex-start",
            maxWidth:"85%",
          }}>
            <div style={{
              padding:"10px 14px", borderRadius:12,
              background: m.role==="user" ? "#1f6feb" : "var(--bg2)",
              border: m.role==="user" ? "none" : "1px solid var(--border)",
              fontSize:13, lineHeight:1.6,
              borderBottomRightRadius: m.role==="user" ? 4 : 12,
              borderBottomLeftRadius: m.role==="assistant" ? 4 : 12,
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf:"flex-start", maxWidth:"85%" }}>
            <div style={{
              padding:"10px 14px", borderRadius:12, borderBottomLeftRadius:4,
              background:"var(--bg2)", border:"1px solid var(--border)",
              fontSize:13, color:"var(--text3)", fontFamily:"var(--mono)",
            }}>thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Example prompts */}
      {messages.length <= 1 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
          {EXAMPLES.map(ex => (
            <button key={ex} className="btn" style={{ fontSize:11, padding:"5px 10px" }}
              onClick={() => send(ex)}>{ex}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display:"flex", gap:8 }}>
        <input
          className="input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==="Enter" && !e.shiftKey && send()}
          placeholder={`Ask anything${symbol ? ` about ${symbol}` : ""}...`}
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
