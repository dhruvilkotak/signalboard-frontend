// src/pages/Chat.jsx
import { useState, useRef, useEffect } from "react";
import { getToken } from "../lib/api";

const API = import.meta.env.VITE_API_URL || "https://signalboard.duckdns.org";

const EXAMPLES = [
  "What is NVDA's current growth outlook?",
  "Compare MSFT vs GOOGL for next 6 months",
  "Is JEPI a good income ETF right now?",
  "Should I hold SPY during a market downturn?",
  "What does a BUY signal with HIGH confidence mean?",
  "Which of my stocks has the most upside potential?",
];

// Simple markdown renderer — handles bold, italic, headers, bullets, code
function Markdown({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (!line.trim()) { elements.push(<div key={i} style={{ height: 6 }} />); i++; continue; }

    // H1/H2/H3
    if (line.startsWith("### ")) {
      elements.push(<div key={i} style={{ fontWeight: 700, fontSize: 13, color: "#58a6ff", marginTop: 10, marginBottom: 4, fontFamily: "'IBM Plex Mono',monospace" }}>{line.slice(4)}</div>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<div key={i} style={{ fontWeight: 700, fontSize: 14, color: "#e6edf3", marginTop: 12, marginBottom: 4 }}>{line.slice(3)}</div>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<div key={i} style={{ fontWeight: 700, fontSize: 16, color: "#e6edf3", marginTop: 14, marginBottom: 6 }}>{line.slice(2)}</div>);
      i++; continue;
    }

    // Bullet point
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 3 }}>
          <span style={{ color: "#58a6ff", flexShrink: 0, marginTop: 1 }}>•</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </div>
      );
      i++; continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)[1];
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 3 }}>
          <span style={{ color: "#58a6ff", flexShrink: 0, minWidth: 16 }}>{num}.</span>
          <span>{inlineFormat(line.replace(/^\d+\. /, ""))}</span>
        </div>
      );
      i++; continue;
    }

    // Code block
    if (line.startsWith("```")) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} style={{
          background: "#161b22", border: "1px solid #30363d",
          borderRadius: 8, padding: "10px 12px", margin: "8px 0",
          fontFamily: "'IBM Plex Mono',monospace", fontSize: 11,
          color: "#e6edf3", overflowX: "auto", lineHeight: 1.5,
        }}>{codeLines.join("\n")}</pre>
      );
      i++; continue;
    }

    // Normal paragraph
    elements.push(<div key={i} style={{ marginBottom: 4, lineHeight: 1.6 }}>{inlineFormat(line)}</div>);
    i++;
  }

  return <div style={{ fontSize: 13, color: "#e6edf3" }}>{elements}</div>;
}

function inlineFormat(text) {
  // **bold**, *italic*, `code`
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldIdx  = remaining.indexOf("**");
    const codeIdx  = remaining.indexOf("`");
    const italicIdx = remaining.indexOf("*") === boldIdx ? -1 : remaining.indexOf("*");

    const first = [
      boldIdx >= 0 ? boldIdx : Infinity,
      codeIdx >= 0 ? codeIdx : Infinity,
      italicIdx >= 0 ? italicIdx : Infinity,
    ].indexOf(Math.min(boldIdx >= 0 ? boldIdx : Infinity, codeIdx >= 0 ? codeIdx : Infinity, italicIdx >= 0 ? italicIdx : Infinity));

    if (first === -1 || Math.min(boldIdx >= 0 ? boldIdx : Infinity, codeIdx >= 0 ? codeIdx : Infinity, italicIdx >= 0 ? italicIdx : Infinity) === Infinity) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (first === 0 && boldIdx >= 0) {
      if (boldIdx > 0) parts.push(<span key={key++}>{remaining.slice(0, boldIdx)}</span>);
      const end = remaining.indexOf("**", boldIdx + 2);
      if (end === -1) { parts.push(<span key={key++}>{remaining}</span>); break; }
      parts.push(<strong key={key++} style={{ color: "#e6edf3" }}>{remaining.slice(boldIdx + 2, end)}</strong>);
      remaining = remaining.slice(end + 2);
    } else if (first === 1 && codeIdx >= 0) {
      if (codeIdx > 0) parts.push(<span key={key++}>{remaining.slice(0, codeIdx)}</span>);
      const end = remaining.indexOf("`", codeIdx + 1);
      if (end === -1) { parts.push(<span key={key++}>{remaining}</span>); break; }
      parts.push(<code key={key++} style={{ background: "#161b22", padding: "1px 5px", borderRadius: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#58a6ff" }}>{remaining.slice(codeIdx + 1, end)}</code>);
      remaining = remaining.slice(end + 1);
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }

  return parts.length > 0 ? parts : text;
}

export default function Chat({ watchlist = [] }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Ask me anything about your stocks, ETFs, or trading signals. I'll give you a concise, data-backed answer.",
  }]);
  const [input, setInput]   = useState("");
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (question) => {
    const q = (question || input).trim();
    if (!q || loading) return;

    setMessages(prev => [...prev, { role: "user", content: q }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/chat/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ question: q, symbol: symbol || null }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setError(e.message);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `**Error:** ${e.message}\n\nMake sure the backend is running at ${API}`,
      }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "calc(100vh - 100px)",
      maxWidth: 900, margin: "0 auto", width: "100%",
    }}>
      {/* Context selector */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 14,
        flexWrap: "wrap", alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid #21262d",
      }}>
        <span style={{ fontSize: 11, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace", letterSpacing: 1 }}>
          CONTEXT:
        </span>
        <button onClick={() => setSymbol("")} style={{
          padding: "4px 10px", borderRadius: 6, fontSize: 11,
          fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600,
          background: !symbol ? "#1f6feb" : "#161b22",
          color: !symbol ? "#fff" : "#6e7681",
          border: !symbol ? "1px solid #1f6feb" : "1px solid #21262d",
          cursor: "pointer",
        }}>None</button>

        {watchlist.map(sym => (
          <button key={sym} onClick={() => setSymbol(sym === symbol ? "" : sym)} style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 11,
            fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600,
            background: symbol === sym ? "#1f6feb" : "#161b22",
            color: symbol === sym ? "#fff" : "#8b949e",
            border: symbol === sym ? "1px solid #1f6feb" : "1px solid #21262d",
            cursor: "pointer", transition: "all 0.15s",
          }}>{sym}</button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 8 }}>

        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "85%",
            animation: "fadeIn 0.2s ease",
          }}>
            {m.role === "assistant" && (
              <div style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace", marginBottom: 4, letterSpacing: 1 }}>
                SIGNAL AI
              </div>
            )}
            <div style={{
              padding: "12px 16px", borderRadius: 12,
              background: m.role === "user" ? "#1f6feb" : "#161b22",
              border: m.role === "user" ? "none" : "1px solid #21262d",
              borderBottomRightRadius: m.role === "user" ? 4 : 12,
              borderBottomLeftRadius:  m.role === "assistant" ? 4 : 12,
              color: m.role === "user" ? "#fff" : "#e6edf3",
            }}>
              {m.role === "assistant"
                ? <Markdown text={m.content} />
                : <span style={{ fontSize: 13 }}>{m.content}</span>
              }
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
            <div style={{ fontSize: 9, color: "#6e7681", fontFamily: "'IBM Plex Mono',monospace", marginBottom: 4 }}>SIGNAL AI</div>
            <div style={{
              padding: "12px 16px", borderRadius: 12, borderBottomLeftRadius: 4,
              background: "#161b22", border: "1px solid #21262d",
            }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0,1,2].map(j => (
                  <div key={j} style={{
                    width: 6, height: 6, borderRadius: "50%", background: "#58a6ff",
                    animation: `blink 1.2s ${j * 0.2}s infinite`,
                  }} />
                ))}
                <span style={{ fontSize: 11, color: "#6e7681", marginLeft: 6, fontFamily: "'IBM Plex Mono',monospace" }}>
                  thinking{symbol ? ` about ${symbol}` : ""}...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Example prompts — only when fresh */}
      {messages.length <= 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => send(ex)} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 11,
              fontFamily: "'IBM Plex Sans',sans-serif",
              background: "#161b22", border: "1px solid #21262d",
              color: "#8b949e", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.target.style.borderColor = "#58a6ff"; e.target.style.color = "#58a6ff"; }}
            onMouseLeave={e => { e.target.style.borderColor = "#21262d"; e.target.style.color = "#8b949e"; }}
            >{ex}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={`Ask anything${symbol ? ` about ${symbol}` : " about your portfolio"}...`}
          disabled={loading}
          style={{
            flex: 1, background: "#161b22", border: "1px solid #30363d",
            borderRadius: 10, padding: "10px 14px", color: "#e6edf3",
            fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={e => e.target.style.borderColor = "#58a6ff"}
          onBlur={e => e.target.style.borderColor = "#30363d"}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 20px", borderRadius: 10, fontSize: 13,
            background: loading || !input.trim() ? "#161b22" : "#1f6feb",
            border: "1px solid #21262d",
            color: loading || !input.trim() ? "#6e7681" : "#fff",
            fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        @keyframes blink  { 0%,100%{opacity:.2} 50%{opacity:1} }
      `}</style>
    </div>
  );
}
