"use client";

import { useEffect, useState } from "react";

/** A short, accessible brand intro shown once per browser tab. */
export default function OpeningIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("smartcart-intro-seen")) return;
      sessionStorage.setItem("smartcart-intro-seen", "1");
    } catch {
      // If storage is unavailable, still show the intro for this visit.
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 2300);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="opening-intro" role="status" aria-label="SmartCart AI loading">
      <div className="intro-orbit intro-orbit-one" />
      <div className="intro-orbit intro-orbit-two" />
      <div className="intro-content">
        <div className="intro-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M8 11h5l4.2 20.1a3 3 0 0 0 2.9 2.4h15.1a3 3 0 0 0 2.9-2.4L42 18H16" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="21" cy="39" r="2.5" fill="currentColor" />
            <circle cx="34" cy="39" r="2.5" fill="currentColor" />
            <path d="m25 7 2.1 4.4 4.9.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.9-.7L25 7Z" fill="#F5B942" />
          </svg>
        </div>
        <div className="intro-wordmark">SmartCart <span>AI</span></div>
        <p className="intro-tagline">Shopping made smarter.</p>
        <div className="intro-progress"><span /></div>
      </div>
    </div>
  );
}
