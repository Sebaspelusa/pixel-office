"use client";

import { useEffect, useState } from "react";
import { useAgentData } from "./AgentDataContext";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { ThemeSelector } from "./ThemeSelector";
import { BackgroundSelector } from "./BackgroundSelector";
import { DeskCanvas } from "./DeskCanvas";
import { OfficeCanvas } from "./OfficeCanvas";
import { EventLog } from "./EventLog";
import { TokenCounter } from "./TokenCounter";
import { DayNightOverlay } from "./DayNightOverlay";
import { CastButton } from "./CastSelector";

function PixelAgentsPage() {
  const { connected, activeSessionId, agents } = useAgentData();
  const { theme } = useTheme();
  // Building (pisos de abajo) hidden by default; toggle persists. Applied
  // after mount so server and client render identically (no hydration mismatch).
  const [showBuilding, setShowBuilding] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pixel-hq-show-building");
      if (saved !== null) setShowBuilding(saved === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("pixel-hq-show-building", showBuilding ? "1" : "0"); } catch {}
  }, [showBuilding]);

  const c = theme.colors;

  // ?clean=1 — office only, no chrome (status bar, log, panels, selectors).
  // Used for screenshots/shareable wallpapers; also keeps private agent data
  // out of any capture. Applied after mount to avoid hydration mismatch.
  const [cleanMode, setCleanMode] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("clean") === "1") {
      setCleanMode(true);
    }
  }, []);

  if (cleanMode) {
    return (
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#0b0b12" }}>
        <DeskCanvas clean />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: c.bgGradient,
      ...(c.bgPattern ? { backgroundImage: c.bgPattern } : {}),
      transition: "background 0.3s ease",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
        {/* Status bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, fontFamily: "monospace" }}>
          <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, color: connected ? c.statusLive : c.statusOffline }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: connected ? c.statusLive : c.statusOffline }} />
            {connected ? "LIVE" : "offline"}
          </span>
          {activeSessionId && (
            <span style={{ fontSize: 11, color: c.textMuted }}>
              session {activeSessionId.slice(0, 8)}
            </span>
          )}
          <span style={{ fontSize: 11, color: c.textMuted }}>
            {agents.size} agent{agents.size !== 1 ? "s" : ""}
          </span>

          {/* Building toggle */}
          <button
            onClick={() => setShowBuilding(v => !v)}
            title="Mostrar / ocultar el edificio (pisos de abajo)"
            style={{
              background: showBuilding ? `${c.statusLive}33` : "transparent",
              border: `1px solid ${showBuilding ? c.statusLive : c.panelBorder}`,
              borderRadius: 4,
              padding: "2px 8px",
              color: showBuilding ? c.statusLive : c.textMuted,
              fontSize: 10,
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            🏢 {showBuilding ? "ON" : "OFF"}
          </button>

          {/* Cast selector */}
          <CastButton />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Desk view with day/night overlay (top panel = work office) */}
          <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: `1px solid ${c.panelBorder}` }}>
            <DayNightOverlay />
            <DeskCanvas />
          </div>

          <div style={{ borderTop: `1px solid ${c.panelBorder}` }} />

          {/* Office building view — hidden by default (toggle above) */}
          {showBuilding && (
          <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: `1px solid ${c.panelBorder}` }}>
            <DayNightOverlay />
            <OfficeCanvas />
          </div>
          )}

          {/* Event log and token counter */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <EventLog />
            <TokenCounter />
          </div>
        </div>
      </div>

      {/* Selectors */}
      <ThemeSelector />
      <BackgroundSelector />
    </div>
  );
}

export default function PageWrapper() {
  return <PixelAgentsPage />;
}
