"use client";

import React, { useEffect, useState } from "react";

interface TimeState {
  hour: number;
  minute: number;
  isNight: boolean;
  overlay: string;
  label: string;
  icon: string;
}

function getTimeState(): TimeState {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Determine time of day and overlay
  let overlay: string;
  let label: string;
  let icon: string;
  let isNight: boolean;

  if (hour >= 6 && hour < 8) {
    // Dawn (6-8am)
    overlay = "linear-gradient(180deg, rgba(255,183,77,0.08) 0%, rgba(255,138,101,0.05) 100%)";
    label = "Dawn";
    icon = "🌅";
    isNight = false;
  } else if (hour >= 8 && hour < 17) {
    // Day (8am-5pm)
    overlay = "none";
    label = "Day";
    icon = "☀️";
    isNight = false;
  } else if (hour >= 17 && hour < 20) {
    // Dusk (5-8pm)
    overlay = "linear-gradient(180deg, rgba(156,39,176,0.08) 0%, rgba(255,87,34,0.06) 100%)";
    label = "Dusk";
    icon = "🌇";
    isNight = false;
  } else if (hour >= 20 && hour < 22) {
    // Evening (8-10pm)
    overlay = "linear-gradient(180deg, rgba(26,35,126,0.15) 0%, rgba(13,71,161,0.1) 100%)";
    label = "Evening";
    icon = "🌆";
    isNight = true;
  } else {
    // Night (10pm-6am)
    overlay = "linear-gradient(180deg, rgba(13,17,23,0.25) 0%, rgba(30,41,59,0.2) 100%)";
    label = "Night";
    icon = "🌙";
    isNight = true;
  }

  return { hour, minute, isNight, overlay, label, icon };
}

export function DayNightOverlay() {
  // null until mounted: server and client first render match (no hydration mismatch),
  // then the live clock takes over.
  const [timeState, setTimeState] = useState<TimeState | null>(null);
  const [showClock, setShowClock] = useState(false);

  useEffect(() => {
    setTimeState(getTimeState());
    const interval = setInterval(() => {
      setTimeState(getTimeState());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (!timeState) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: timeState.overlay,
          pointerEvents: "none",
          zIndex: 5,
          transition: "background 60s linear",
        }}
      />

      {/* Clock indicator */}
      <div
        onClick={() => setShowClock(c => !c)}
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(0,0,0,0.7)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 4,
          padding: "4px 8px",
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: 10,
        }}
      >
        <span>{timeState.icon}</span>
        <span style={{ color: "rgba(255,255,255,0.7)" }}>
          {timeState.hour.toString().padStart(2, "0")}:{timeState.minute.toString().padStart(2, "0")}
        </span>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 9 }}>
          {timeState.label}
        </span>
      </div>

      {/* Night mode indicator (subtle) */}
      {timeState.isNight && (
        <div style={{
          position: "absolute",
          top: 8,
          left: 80,
          zIndex: 20,
          background: "rgba(30,41,59,0.8)",
          border: "1px solid rgba(100,116,139,0.3)",
          borderRadius: 4,
          padding: "4px 8px",
          fontFamily: "monospace",
          fontSize: 9,
          color: "rgba(148,163,184,0.8)",
        }}>
          🌙 Night Mode
        </div>
      )}
    </>
  );
}
