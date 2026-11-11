"use client";
import { useEffect, useRef, useState } from "react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

type Offer = { store: string; title: string; price: number | null; url: string; note: string; image?: string | null };
type Result = { product: string; summary: string; offers: Offer[]; cheapest: string; recommended: string; alternatives: string[]; currency: string };
type NewsItem = { title: string; link: string; source: string; date: string };
type PlanId = "basic" | "super";
type Limits = Record<PlanId, { hour: number; day: number; history: number }>;
type PlanInfo = { plan: PlanId; limits: Limits; used: { hour: number; day: number }; price: string; paypalClientId: string | null; until: string | null; days: number; demo: boolean };

// Shown to signed-out visitors (matches the default .env values)
const FALLBACK: Limits = { basic: { hour: 10, day: 40, history: 20 }, super: { hour: 60, day: 300, history: 100 } };

// Shrink photo in the browser -> faster + cheaper
async function compress(file: File): Promise<File> {
  const img = await createImageBitmap(file);
  const s = Math.min(1, 1024 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = img.width * s; c.height = img.height * s;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.8));
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

const icon = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const CartIcon = () => <svg {...icon}><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.6 11.4a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6" /></svg>;
const CamIcon = () => <svg {...icon}><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;

export default function Home() {
  const { isSignedIn } = useAuth();
  const [q, setQ] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [note, setNote] = useState<{ t: string; ok: boolean } | null>(null);
  const [pay, setPay] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const closePlans = () => { setShowPlans(false); setPay(false); };
  const ppBox = useRef<HTMLDivElement>(null);
  const inp = useRef<HTMLInputElement>(null);
  const [needs, setNeeds] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { try { setNeeds(localStorage.getItem("needs") || ""); } catch {} }, []);
  const saveNeeds = (v: string) => { setNeeds(v); try { localStorage.setItem("needs", v); } catch {} };

  // Deals & e-commerce news (Google News RSS via /api/news)
  const [topic, setTopic] = useState("sales");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsState, setNewsState] = useState<"loading" | "ok" | "err">("loading");
  const productName = res?.product || "";
  useEffect(() => {
    if (!isSignedIn) return;
    const t = topic === "product" && !productName ? "sales" : topic;
    setNewsState("loading");
    fetch(`/api/news?topic=${t}` + (t === "product" ? `&q=${encodeURIComponent(productName)}` : ""))
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { setNews(d.items); setNewsState("ok"); })
      .catch(() => setNewsState("err"));
  }, [isSignedIn, topic, productName]);
  const newsTabs: [string, string][] = [["sales", "Sales & deals"], ["ecommerce", "E-commerce"], ...(productName ? [["product", "This product"] as [string, string]] : [])];

  const loadHistory = () => fetch("/api/history").then(r => r.ok ? r.json() : { history: [] }).then(d => setHistory(d.history));
  const loadPlan = () => fetch("/api/plan").then(r => r.ok ? r.json() : null).then(d => d && setInfo(d));
  useEffect(() => { if (isSignedIn) { loadHistory(); loadPlan(); } }, [isSignedIn]);

  async function pick(f?: File) {
    if (!f) return;
    const small = await compress(f);
    setFile(small); setPreview(URL.createObjectURL(small));
  }

  async function search() {
    if (!q.trim() && !file) return;
    const question = q.trim() || "Find a product similar to this photo";
    setMessages(prev => [...prev, { role: "user", text: question }]);
    setErr(""); setRes(null); setLoading(true);
    const fd = new FormData();
    fd.append("q", q);
    if (needs.trim()) fd.append("needs", needs.trim());
    if (file) fd.append("image", file);
    try {
      const r = await fetch("/api/search", { method: "POST", body: fd });
      const d = await r.json();
      setLoading(false);
      loadPlan();
      if (!r.ok) { setErr(d.error || "Something went wrong"); setMessages(prev => [...prev, { role: "assistant", text: d.error || "I could not complete that search. Please try again." }]); return; }
      setRes(d.result);
      setMessages(prev => [...prev, { role: "assistant", text: d.result.summary || `I found ${d.result.offers?.length || 0} offers for ${d.result.product}. Here are the options I found.` }]);
      setQ(""); setFile(null); setPreview(""); loadHistory();
      requestAnimationFrame(() => chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch {
      setLoading(false); setErr("Unable to reach SmartCart right now. Check your connection and try again.");
      setMessages(prev => [...prev, { role: "assistant", text: "I couldn't connect to the shopping service. Please try again." }]);
    }
  }

  async function choose(p: PlanId) {
    if (!info) return;
    setNote(null);
    if (p === "super" && info.paypalClientId) { setPay(true); return; } // also used to add 30 more days
    if (p === info.plan) return;
    if (p === "basic" && info.until && !confirm("Switch to Basic? You'll lose the Super days you've already paid for.")) return;
    if (p === "super" && !info.demo) return setNote({ t: "Super isn't available to buy yet.", ok: false });
    const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: p }) });
    const d = await r.json();
    if (!r.ok) return setNote({ t: d.error || "Could not change plan.", ok: false });
    loadPlan(); loadHistory();
  }

  // Plans modal: close with Escape, lock page scroll while open
  useEffect(() => {
    if (!showPlans) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePlans(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [showPlans]);

  // PayPal buttons: the server creates the order and verifies the payment
  useEffect(() => {
    if (!pay || !info?.paypalClientId) return;
    let alive = true;
    const render = () => {
      const w = window as any;
      if (!alive || !w.paypal || !ppBox.current) return;
      ppBox.current.innerHTML = "";
      w.paypal.Buttons({
        style: { layout: "vertical", shape: "pill", label: "pay" },
        createOrder: async () => {
          const r = await fetch("/api/paypal/order", { method: "POST" });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || "Could not start checkout");
          return d.id;
        },
        onApprove: async (data: any) => {
          const r = await fetch("/api/paypal/capture", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          const d = await r.json();
          setPay(false);
          if (!r.ok) return setNote({ t: d.error || "Could not turn on Super.", ok: false });
          setNote({ t: d.pending ? d.message : d.until ? `Super is on until ${new Date(d.until).toLocaleDateString()}.` : "Super is on.", ok: true });
          loadPlan(); loadHistory();
        },
        onError: () => setNote({ t: "PayPal checkout failed. Please try again.", ok: false }),
      }).render(ppBox.current);
    };
    if ((window as any).paypal) render();
    else {
      const sc = document.createElement("script");
      sc.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(info.paypalClientId)}&currency=USD`;
      sc.onload = render;
      sc.onerror = () => setNote({ t: "Could not load PayPal. Check your connection.", ok: false });
      document.body.appendChild(sc);
    }
    return () => { alive = false; };
  }, [pay, info?.paypalClientId]);

  const sorted = res ? [...res.offers].sort((a, b) => (a.price ?? 1e12) - (b.price ?? 1e12)) : [];
  const limits = info?.limits ?? FALLBACK;
  const left = info ? Math.max(0, limits[info.plan].hour - info.used.hour) : null;

  const plans = [
    { id: "basic" as PlanId, name: "Basic", price: "Free", per: "", note: "Everything you need to compare prices.",
      perks: [`${limits.basic.hour} searches per hour`, `${limits.basic.day} searches per day`, "Photo and text search", `Last ${limits.basic.history} searches saved`] },
    { id: "super" as PlanId, name: "Super", price: info?.price ?? "$2", per: `/${info?.days ?? 30} days`, note: "For when you compare prices every day.",
      perks: [`${limits.super.hour} searches per hour`, `${limits.super.day} searches per day`, "Photo and text search", `Last ${limits.super.history} searches saved`] },
  ];

  return (
    <>
      <div className="space" />

      <header className="nav">
        <div className="logo"><span className="mark"><CartIcon /></span>SmartCart AI</div>
        <div className="right">
          <button type="button" className="link" style={{ background: "none", border: 0, cursor: "pointer", font: "inherit" }} onClick={() => { setNote(null); setShowPlans(true); }}>Plans</button>
          <SignedOut>
            <SignInButton mode="modal"><button className="ghost">Log in</button></SignInButton>
            <SignUpButton mode="modal"><button className="btn">Sign up</button></SignUpButton>
          </SignedOut>
          <SignedIn>
            {info && <span className={`pill ${info.plan}`}>{info.plan === "super" ? "Super" : "Basic"}</span>}
            <UserButton />
          </SignedIn>
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <h1>Meet your AI shopping partner.</h1>
          <p>Just chat naturally. SmartCart understands what you need, searches offers, and helps you choose with confidence.</p>
        </section>

        <SignedOut>
          <div className="scan center"><p>Log in to start finding better prices. Basic is free.</p>
            <SignInButton mode="modal"><button className="btn">Get started</button></SignInButton></div>
        </SignedOut>

        <SignedIn>
          <section className={`chat-shell${loading ? " busy" : ""}`} aria-label="SmartCart AI chatbot">
            <div className="chat-heading"><div className="chat-avatar">✦</div><div><b>SmartCart Assistant</b><small><i className="online-dot" /> AI shopping assistant · Ready to help</small></div></div>
            <div className="chat-thread" aria-live="polite">
              {messages.length === 0 && <div className="welcome-message"><div className="welcome-spark">✦</div><h2>Hi! What are you shopping for?</h2><p>Tell me what you need, your budget, and what matters most. I’ll search offers and help you compare.</p><div className="prompt-chips">{["Best wireless headphones under ₹2,000", "Gaming laptop under ₹70,000", "Compare iPhone and Samsung phones"].map(x => <button type="button" className="prompt-chip" key={x} onClick={() => setQ(x)}>{x}<span>↗</span></button>)}</div></div>}
              {messages.map((m, i) => <div className={`chat-message ${m.role}`} key={i}><div className="message-avatar">{m.role === "assistant" ? "✦" : "You"}</div><div className="message-bubble"><small>{m.role === "assistant" ? "SMARTCART AI" : "YOU"}</small><p>{m.text}</p></div></div>)}
              {loading && <div className="chat-message assistant"><div className="message-avatar">✦</div><div className="message-bubble typing"><small>SMARTCART AI</small><p><span></span><span></span><span></span> Searching products and comparing offers…</p></div></div>}
              <div ref={chatEnd} />
            </div>
            <div className="chat-composer">
              {preview && <div className="prev"><img src={preview} alt="Photo to search" /><button className="ghost" onClick={() => { setFile(null); setPreview(""); }}>Remove photo</button></div>}
              <div className="chat-input-row"><textarea value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!loading && (q.trim() || file)) search(); } }} placeholder="Message SmartCart… e.g. Find a gaming mouse under ₹1,500" maxLength={200} aria-label="Message SmartCart" rows={2} />
                <div className="composer-actions"><span>AI can make mistakes. Check prices with the store.</span><div><button type="button" className="photo-btn" onClick={() => inp.current?.click()} aria-label="Upload product photo"><CamIcon /></button><button className="send-btn" disabled={loading || (!q.trim() && !file)} onClick={search} aria-label="Send message">➤</button></div></div>
              </div>
              <input ref={inp} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => pick(e.target.files?.[0])} />
            </div>
          </section>
            <details className="needs">
              <summary>Describe what you need <span>{needs ? "· saved" : "(optional)"}</span></summary>
              <textarea value={needs} maxLength={400} rows={3} onChange={e => saveNeeds(e.target.value)}
                placeholder="e.g. For gaming and video editing, budget under ₹60,000, battery life matters, no refurbished." />
              <small>{needs.length}/400 · saved on this device and used for every search</small>
            </details>
            {err && <p className="err">{err}</p>}
            {loading && <p className="status">Comparing prices across stores…</p>}
            {info && left !== null && (
              <div className="meter">
                <span><b>{left}</b> of {limits[info.plan].hour} searches left this hour</span>
                <span className="bar"><i style={{ width: `${(left / limits[info.plan].hour) * 100}%` }} /></span>
              </div>
            )}

          {res && (
            <div className="card">
              <h3>{res.product}</h3>
              <p className="muted">{res.summary}</p>
              <div className="grid">
                {sorted.map((o, i) => (
                  <a key={i} href={o.url} target="_blank" rel="noopener noreferrer nofollow" className={`offer${o.store === res.cheapest ? " best" : ""}`}>
                    {o.image && <img src={o.image} alt="" referrerPolicy="no-referrer" />}
                    <div className="tags">
                      {o.store === res.cheapest && <span className="tag g">Cheapest</span>}
                      {o.store === res.recommended && <span className="tag p">Recommended</span>}
                    </div>
                    <b>{o.store}</b>
                    <span className="t">{o.title}</span>
                    <span className="price">{o.price ? `₹${o.price.toLocaleString("en-IN")}` : "Check price"}</span>
                    <small>{o.note}</small>
                  </a>
                ))}
              </div>
              {!!res.alternatives.length && <p className="muted">Similar: {res.alternatives.join(" • ")}</p>}
              <small className="muted">Prices can change. Always confirm on the store's page.</small>
            </div>
          )}

          {!!history.length && (
            <div className="card">
              <h3>Past searches</h3>
              <div className="hist">
                {history.map(h => (
                  <button key={h.id} className="chip" onClick={() => { setRes(h.result); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                    {h.query} <small>{new Date(h.created_at).toLocaleDateString()}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3>Deals &amp; e-commerce news</h3>
            <div className="tabs" role="tablist">
              {newsTabs.map(([k, l]) => (
                <button key={k} role="tab" aria-selected={topic === k} className={`chip${topic === k ? " on" : ""}`} onClick={() => setTopic(k)}>{l}</button>
              ))}
            </div>
            {newsState === "loading" && <p className="muted">Loading headlines…</p>}
            {newsState === "err" && <p className="err">Could not load news. Try again later.</p>}
            {newsState === "ok" && (news.length
              ? <ul className="news">{news.map((n, i) => (
                  <li key={i}><a href={n.link} target="_blank" rel="noopener noreferrer nofollow">
                    <b>{n.title}</b>
                    <small>{n.source}{n.date ? ` · ${new Date(n.date).toLocaleDateString()}` : ""}</small>
                  </a></li>))}</ul>
              : <p className="muted">No headlines right now.</p>)}
            <small className="muted">Headlines from Google News. Links open the publisher's page.</small>
          </div>
        </SignedIn>


        <p className="foot">Prices come from store listings and can change.</p>
      </main>

      {showPlans && (
        <div className="pm-backdrop" onClick={closePlans}>
          <div className="pm-dialog" role="dialog" aria-modal="true" aria-label="Plans" onClick={e => e.stopPropagation()}>
            <button type="button" className="pm-close" onClick={closePlans} aria-label="Close plans">×</button>
            <div className="plans-head">
            <h2>Simple plans for smarter shopping</h2>
            <p>Start free. Upgrade when you search a lot.</p>
          </div>
          <div className="plans">
            {plans.map(p => (
              <div key={p.id} className={`plan ${p.id}${info?.plan === p.id ? " on" : ""}`}>
                <h3>{p.name}</h3>
                <p className="note">{p.note}</p>
                <div className="price-row">{p.price}{p.per && <small>{p.per}</small>}</div>
                {p.id === "super" && info?.until && <p className="note">Active until {new Date(info.until).toLocaleDateString()}</p>}
                {p.id === "super" && info?.paypalClientId && <p className="note">One payment in USD through PayPal. No auto-renewal.</p>}
                <ul>{p.perks.map(x => <li key={x}>{x}</li>)}</ul>
                <SignedOut>
                  <SignUpButton mode="modal"><button className={p.id === "super" ? "btn" : "ghost"}>{p.id === "super" ? "Sign up for Super" : "Start free"}</button></SignUpButton>
                </SignedOut>
                <SignedIn>
                  {info?.plan === p.id && !(p.id === "super" && info.until && info.paypalClientId)
                    ? <button className="ghost" disabled>Your plan</button>
                    : pay && p.id === "super"
                    ? <><div ref={ppBox} className="ppbox" /><button className="ghost" onClick={() => setPay(false)}>Back</button></>
                    : <button className={p.id === "super" ? "btn" : "ghost"} onClick={() => choose(p.id)}>{p.id === "super" ? (info?.plan === "super" ? `Add ${info.days} days` : "Get Super") : "Switch to Basic"}</button>}
                </SignedIn>
              </div>
            ))}
          </div>
          {note && <p className={`planmsg${note.ok ? " ok" : ""}`} role="status">{note.t}</p>}
          </div>
        </div>
      )}
      <style>{`
        .pm-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto}
        .pm-dialog{position:relative;width:100%;max-width:820px;max-height:92vh;overflow-y:auto;background:var(--card,#12152a);color:inherit;border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:28px 24px;box-shadow:0 24px 80px rgba(0,0,0,.5)}
        .pm-close{position:absolute;top:10px;right:14px;background:none;border:0;color:inherit;font-size:28px;line-height:1;cursor:pointer;opacity:.7}
        .pm-close:hover{opacity:1}
      `}</style>
    </>
  );
}