/**
 * DesignSystem.jsx
 *
 * Visual reference sheet for the CivicAI design system.
 * Development use only — not included in any production route.
 *
 * To preview: temporarily add this route to App.jsx:
 *   <Route path="/design-system" element={<DesignSystem />} />
 */

import { useState } from "react";

/* ─── Small helper: a labelled token swatch ─────────────────── */
function Swatch({ name, value, textColor = "#FFFFFF" }) {
  return (
    <div
      style={{
        background:    value,
        borderRadius:  "8px",
        padding:       "16px",
        minWidth:      "140px",
        border:        "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <p style={{ color: textColor, fontSize: "12px", fontWeight: 500, margin: 0 }}>
        {name}
      </p>
      <p style={{ color: textColor, fontSize: "11px", opacity: 0.75, margin: "4px 0 0" }}>
        {value}
      </p>
    </div>
  );
}

/* ─── Section wrapper ────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <section style={{ marginBottom: "48px" }}>
      <h2
        style={{
          fontSize:      "var(--font-size-section)",
          fontWeight:    "var(--font-weight-medium)",
          color:         "var(--color-text-primary)",
          marginBottom:  "20px",
          paddingBottom: "12px",
          borderBottom:  "1px solid var(--color-divider)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ─── Row label ──────────────────────────────────────────────── */
function RowLabel({ label }) {
  return (
    <p
      style={{
        fontSize:      "var(--font-size-label)",
        fontWeight:    "var(--font-weight-medium)",
        letterSpacing: "var(--letter-spacing-label)",
        color:         "var(--color-text-secondary)",
        marginBottom:  "10px",
        marginTop:     "20px",
      }}
    >
      {label.toUpperCase()}
    </p>
  );
}

/* ─── Toast demo (auto-dismiss after 3s) ─────────────────────── */
function ToastDemo() {
  const [visible, setVisible]   = useState(false);
  const [exiting, setExiting]   = useState(false);
  const [message, setMessage]   = useState("Report submitted successfully.");

  const show = (msg) => {
    setMessage(msg);
    setVisible(true);
    setExiting(false);

    setTimeout(() => {
      setExiting(true);
      setTimeout(() => setVisible(false), 300);
    }, 3000);
  };

  return (
    <>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button className="ds-btn ds-btn-primary" onClick={() => show("Report submitted successfully.")}>
          Show Success Toast
        </button>
        <button className="ds-btn ds-btn-secondary" onClick={() => show("Failed to load reports. Please try again.")}>
          Show Error Toast
        </button>
      </div>

      {visible && (
        <div className="ds-toast-wrapper">
          <div className={`ds-toast ${exiting ? "ds-toast-exit" : ""}`}>
            <span>{message}</span>
            <button
              className="ds-toast-close"
              onClick={() => {
                setExiting(true);
                setTimeout(() => setVisible(false), 300);
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Main design system reference component ─────────────────── */
export default function DesignSystem() {
  return (
    <div className="ds-page" style={{ fontFamily: "var(--font-family)" }}>
      <div className="ds-container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>

        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <h1
            style={{
              fontSize:   "var(--font-size-title)",
              fontWeight: "var(--font-weight-medium)",
              color:      "var(--color-primary)",
              margin:     0,
            }}
          >
            CivicAI Design System
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "8px" }}>
            Version 1.0 — Reference sheet for all design tokens, components, and utilities.
            Do not ship this page in production.
          </p>
        </div>

        {/* ── § 1  Color Tokens ─────────────────────────────────── */}
        <Section title="§ 1  Color Tokens">
          <RowLabel label="Brand" />
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Swatch name="Primary Navy"   value="#1A3F6F" />
            <Swatch name="Primary Dark"   value="#153457" />
            <Swatch name="Primary Pastel" value="#E8EEF6" textColor="#1A3F6F" />
          </div>

          <RowLabel label="Semantic" />
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Swatch name="Amber"         value="#E67E22" />
            <Swatch name="Amber Pastel"  value="#FDF0E3" textColor="#E67E22" />
            <Swatch name="Teal"          value="#1D9E75" />
            <Swatch name="Teal Pastel"   value="#E3F5EF" textColor="#1D9E75" />
            <Swatch name="Error Red"     value="#D93025" />
            <Swatch name="Error Pastel"  value="#FCE8E6" textColor="#D93025" />
          </div>

          <RowLabel label="Neutral" />
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Swatch name="App Background" value="#F1EFE8" textColor="#1C1B1F" />
            <Swatch name="Surface"        value="#FFFFFF"  textColor="#1C1B1F" />
            <Swatch name="Hover"          value="#F8F9FA"  textColor="#1C1B1F" />
            <Swatch name="Archived Bg"    value="#F1F3F4"  textColor="#5F6368" />
            <Swatch name="Divider"        value="#E8EAED"  textColor="#1C1B1F" />
            <Swatch name="Input Border"   value="#DADCE0"  textColor="#1C1B1F" />
          </div>

          <RowLabel label="Text" />
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Swatch name="Text Primary"   value="#1C1B1F" />
            <Swatch name="Text Secondary" value="#5F6368" />
          </div>
        </Section>

        {/* ── § 2  Typography ───────────────────────────────────── */}
        <Section title="§ 2  Typography">
          <div className="ds-card">
            <p className="ds-title"   style={{ margin: "0 0 8px" }}>Page Title — 22px / weight 500</p>
            <p className="ds-section-header" style={{ margin: "0 0 8px" }}>Section Header — 18px / weight 500</p>
            <p className="ds-card-title"     style={{ margin: "0 0 8px" }}>Card Title — 16px / weight 500</p>
            <p className="ds-body"           style={{ margin: "0 0 8px" }}>Body copy — 14px / weight 400. Used for all paragraph text, report descriptions, resolution notes, and general content throughout the application.</p>
            <p className="ds-label"          style={{ margin: 0 }}>Label / Chip / Badge — 12px / weight 500 / tracking 0.3px</p>
          </div>
        </Section>

        {/* ── § 3  Buttons ──────────────────────────────────────── */}
        <Section title="§ 3  Buttons">
          <RowLabel label="Standard" />
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <button className="ds-btn ds-btn-primary">Primary Button</button>
            <button className="ds-btn ds-btn-secondary">Secondary Button</button>
            <button className="ds-btn ds-btn-danger">Danger Button</button>
            <button className="ds-btn ds-btn-primary" disabled>Disabled</button>
          </div>

          <RowLabel label="Pill CTA — Hero use only" />
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <button className="ds-btn ds-btn-pill-cta">Report an Issue</button>
            <button className="ds-btn ds-btn-pill-cta-outline">Secure Authority Login</button>
          </div>

          <RowLabel label="Icon Button" />
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button className="ds-btn-icon" aria-label="Search">
              <span className="material-symbols-outlined">search</span>
            </button>
            <button className="ds-btn-icon" aria-label="Close">
              <span className="material-symbols-outlined">close</span>
            </button>
            <button className="ds-btn-icon" aria-label="Filter">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
          </div>
        </Section>

        {/* ── § 4  Status Badges ────────────────────────────────── */}
        <Section title="§ 4  Status Badges">
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <span className="ds-badge ds-badge-pending">Pending</span>
            <span className="ds-badge ds-badge-assigned">Assigned</span>
            <span className="ds-badge ds-badge-resolved">Resolved</span>
            <span className="ds-badge ds-badge-archived">Archived</span>
            <span className="ds-badge ds-badge-critical">Critical</span>
          </div>
        </Section>

        {/* ── § 5  Priority Indicators ──────────────────────────── */}
        <Section title="§ 5  Priority Indicators">
          <RowLabel label="Left border accent on cards" />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="ds-card ds-card-priority-high"   style={{ padding: "12px 16px" }}>
              <span className="ds-card-title">High Priority</span>
              <span className="ds-label ds-secondary" style={{ marginLeft: "12px" }}>4px left border — #D93025</span>
            </div>
            <div className="ds-card ds-card-priority-medium" style={{ padding: "12px 16px" }}>
              <span className="ds-card-title">Medium Priority</span>
              <span className="ds-label ds-secondary" style={{ marginLeft: "12px" }}>4px left border — #E67E22</span>
            </div>
            <div className="ds-card ds-card-priority-low"    style={{ padding: "12px 16px" }}>
              <span className="ds-card-title">Low Priority</span>
              <span className="ds-label ds-secondary" style={{ marginLeft: "12px" }}>4px left border — #1D9E75</span>
            </div>
          </div>

          <RowLabel label="Priority dot (8px circle) before titles" />
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[["high", "High — #D93025"], ["medium", "Medium — #E67E22"], ["low", "Low — #1D9E75"]].map(([level, label]) => (
              <div key={level} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className={`ds-priority-dot ds-priority-dot-${level}`} />
                <span className="ds-body">{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── § 6  Department Chips ─────────────────────────────── */}
        <Section title="§ 6  Department Chips">
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["BBMP Roads", "BBMP Sanitation", "BWSSB", "BESCOM", "Traffic Police"].map((dept) => (
              <span key={dept} className="ds-chip">{dept}</span>
            ))}
            <span className="ds-chip ds-chip-active">BBMP Roads (active)</span>
          </div>
        </Section>

        {/* ── § 7  Form Inputs ──────────────────────────────────── */}
        <Section title="§ 7  Form Inputs">
          <div className="ds-card" style={{ maxWidth: "480px" }}>
            <div style={{ marginBottom: "20px" }}>
              <label className="ds-input-label" htmlFor="demo-input">Issue Description</label>
              <input id="demo-input" className="ds-input" placeholder="Describe the civic issue..." />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label className="ds-input-label" htmlFor="demo-select">Department</label>
              <select id="demo-select" className="ds-select">
                <option>BBMP Roads</option>
                <option>BBMP Sanitation</option>
                <option>BWSSB</option>
                <option>BESCOM</option>
                <option>Traffic Police</option>
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label className="ds-input-label" htmlFor="demo-textarea">Resolution Notes</label>
              <textarea id="demo-textarea" className="ds-textarea" placeholder="Describe what was completed..." />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label className="ds-input-label" htmlFor="demo-error">Email (error state)</label>
              <input id="demo-error" className="ds-input ds-input-error" defaultValue="not-an-email" />
              <p className="ds-input-error-text">Please enter a valid email address.</p>
            </div>

            <div>
              <label className="ds-input-label" htmlFor="demo-search">Search</label>
              <div className="ds-search-wrapper">
                <span className="material-symbols-outlined ds-search-icon">search</span>
                <input id="demo-search" className="ds-search" placeholder="Search reports, departments, officers..." />
              </div>
            </div>
          </div>
        </Section>

        {/* ── § 8  Shadows ──────────────────────────────────────── */}
        <Section title="§ 8  Shadows">
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {[
              { name: "Card Shadow",    cls: "ds-shadow-card",   desc: "0 1px 3px / 0 1px 2px" },
              { name: "Search Shadow",  cls: "ds-shadow-search", desc: "0 1px 3px" },
              { name: "Inset Shadow",   cls: "ds-shadow-inset",  desc: "inset 0 2px 4px" },
            ].map(({ name, cls, desc }) => (
              <div
                key={name}
                className={cls}
                style={{
                  background:    "var(--color-bg-surface)",
                  borderRadius:  "var(--radius-card)",
                  padding:       "20px 24px",
                  minWidth:      "180px",
                }}
              >
                <p style={{ margin: 0, fontWeight: 500, fontSize: "var(--font-size-body)" }}>{name}</p>
                <p style={{ margin: "4px 0 0", fontSize: "var(--font-size-label)", color: "var(--color-text-secondary)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── § 9  Cards ────────────────────────────────────────── */}
        <Section title="§ 9  Cards">
          <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            <div className="ds-card">
              <p className="ds-card-title" style={{ marginBottom: "8px" }}>Standard Card</p>
              <p className="ds-body ds-secondary">White surface, 12px radius, card shadow, 24px padding.</p>
            </div>
            <div className="ds-card-inset">
              <p className="ds-card-title" style={{ marginBottom: "8px" }}>Inset Card</p>
              <p className="ds-body ds-secondary">App background color, inset shadow. Used for secondary info panels.</p>
            </div>
          </div>
        </Section>

        {/* ── § 10  Loading Skeletons ───────────────────────────── */}
        <Section title="§ 10  Loading Skeletons">
          <div className="ds-card" style={{ maxWidth: "480px" }}>
            <div className="ds-skeleton ds-skeleton-title" style={{ marginBottom: "16px" }} />
            <div className="ds-skeleton ds-skeleton-text" style={{ marginBottom: "8px", width: "90%" }} />
            <div className="ds-skeleton ds-skeleton-text" style={{ marginBottom: "8px", width: "75%" }} />
            <div className="ds-skeleton ds-skeleton-text" style={{ width: "60%" }} />
            <div className="ds-skeleton ds-skeleton-card" style={{ marginTop: "20px" }} />
          </div>
        </Section>

        {/* ── § 11  Icons ───────────────────────────────────────── */}
        <Section title="§ 11  Material Symbols Outlined Icons">
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
            {[
              ["search",         "search"],
              ["location_on",    "location_on"],
              ["report",         "report"],
              ["assignment",     "assignment"],
              ["check_circle",   "check_circle"],
              ["archive",        "archive"],
              ["auto_awesome",   "auto_awesome"],
              ["insights",       "insights"],
              ["calendar_today", "calendar_today"],
              ["logout",         "logout"],
              ["notifications",  "notifications"],
              ["priority_high",  "priority_high"],
            ].map(([icon, label]) => (
              <div key={icon} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>{icon}</span>
                <span style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>{label}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "20px", display: "flex", gap: "24px", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>map</span>
              <span style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>20px standard</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <span className="material-symbols-outlined icon-nav">map</span>
              <span style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>22px nav</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <span className="material-symbols-outlined icon-feature">map</span>
              <span style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>28px feature</span>
            </div>
          </div>
        </Section>

        {/* ── § 12  Page Animation ──────────────────────────────── */}
        <Section title="§ 12  Page Entrance Animation">
          <p className="ds-body ds-secondary" style={{ marginBottom: "16px" }}>
            Add <code>.ds-page-enter</code> to a page wrapper, or <code>.ds-stagger-item</code> to list children for sequential staggered appearance.
          </p>
          <div className="ds-card ds-page-enter" style={{ maxWidth: "320px" }}>
            <p className="ds-card-title">Fade + translate in</p>
            <p className="ds-body ds-secondary">
              opacity 0→1 + translateY(12px→0), 300ms cubic-bezier(0.2,0,0,1)
            </p>
          </div>
        </Section>

        {/* ── § 13  Toast ───────────────────────────────────────── */}
        <Section title="§ 13  Toast Notification">
          <p className="ds-body ds-secondary" style={{ marginBottom: "16px" }}>
            Bottom-center, #202124 dark background, 320px wide, auto-dismiss after 3 seconds.
          </p>
          <ToastDemo />
        </Section>

        {/* ── § 14  Divider ─────────────────────────────────────── */}
        <Section title="§ 14  Divider">
          <hr className="ds-divider" />
          <p className="ds-label ds-secondary" style={{ marginTop: "8px" }}>
            1px solid #E8EAED — used between sections and inside cards
          </p>
        </Section>

        {/* ── Footer ────────────────────────────────────────────── */}
        <hr className="ds-divider" />
        <p
          className="ds-label ds-secondary"
          style={{ textAlign: "center", marginTop: "24px" }}
        >
          CivicAI Design System v1.0 — Do not ship this page in production.
        </p>
      </div>
    </div>
  );
}
