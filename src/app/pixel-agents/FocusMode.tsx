"use client";

import React, { useState, useCallback } from "react";

interface FocusZone {
  id: string;
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
}

const FOCUS_ZONES: FocusZone[] = [
  { id: "terrace", name: "Terrace", left: 0.25, top: 0.12, width: 0.50, height: 0.18, color: "rgba(251,146,60,0.3)" },
  { id: "studio", name: "Studio", left: 0.30, top: 0.35, width: 0.40, height: 0.15, color: "rgba(245,158,11,0.3)" },
  { id: "servers", name: "Server Room", left: 0.50, top: 0.55, width: 0.20, height: 0.15, color: "rgba(99,102,241,0.3)" },
  { id: "meeting", name: "Meeting Room", left: 0.62, top: 0.55, width: 0.20, height: 0.15, color: "rgba(34,211,238,0.3)" },
  { id: "lobby", name: "Lobby", left: 0.40, top: 0.75, width: 0.30, height: 0.15, color: "rgba(167,139,250,0.3)" },
];

interface FocusModeProps {
  onZoneClick?: (zoneId: string) => void;
}

export function FocusMode({ onZoneClick }: FocusModeProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [focusedZone, setFocusedZone] = useState<string | null>(null);

  const handleDoubleClick = useCallback((zoneId: string) => {
    setFocusedZone(prev => prev === zoneId ? null : zoneId);
    onZoneClick?.(zoneId);
  }, [onZoneClick]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setFocusedZone(null);
    }
  }, []);

  React.useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* Zone hover indicators */}
      {FOCUS_ZONES.map((zone) => (
        <div
          key={zone.id}
          onDoubleClick={() => handleDoubleClick(zone.id)}
          onMouseEnter={() => setHoveredZone(zone.id)}
          onMouseLeave={() => setHoveredZone(null)}
          style={{
            position: "absolute",
            left: `${zone.left * 100}%`,
            top: `${zone.top * 100}%`,
            width: `${zone.width * 100}%`,
            height: `${zone.height * 100}%`,
            background: hoveredZone === zone.id ? zone.color : "transparent",
            border: hoveredZone === zone.id ? `2px solid ${zone.color.replace("0.3", "0.8")}` : "2px solid transparent",
            borderRadius: 4,
            cursor: "pointer",
            transition: "all 0.2s ease",
            zIndex: 15,
            pointerEvents: "auto",
          }}
        >
          {/* Zone label on hover */}
          {hoveredZone === zone.id && (
            <div style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.9)",
              color: "rgba(255,255,255,0.9)",
              padding: "4px 8px",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 10,
              whiteSpace: "nowrap",
              marginBottom: 4,
            }}>
              🔍 Double-click to zoom
            </div>
          )}
        </div>
      ))}

      {/* Focused zone overlay */}
      {focusedZone && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 25,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            background: "rgba(0,0,0,0.95)",
            border: "2px solid rgba(52,211,153,0.5)",
            borderRadius: 8,
            padding: "16px 24px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>
              {FOCUS_ZONES.find(z => z.id === focusedZone)?.name}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace" }}>
              Press ESC to exit focus mode
            </div>
          </div>
        </div>
      )}

      {/* Focus mode indicator */}
      {focusedZone && (
        <div style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 20,
          background: "rgba(52,211,153,0.2)",
          border: "1px solid rgba(52,211,153,0.5)",
          borderRadius: 4,
          padding: "4px 8px",
          fontFamily: "monospace",
          fontSize: 10,
          color: "#34d399",
        }}>
          🔍 Focus: {FOCUS_ZONES.find(z => z.id === focusedZone)?.name}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        position: "absolute",
        bottom: 8,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        background: "rgba(0,0,0,0.7)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 4,
        padding: "4px 8px",
        fontFamily: "monospace",
        fontSize: 9,
        color: "rgba(255,255,255,0.4)",
      }}>
        Double-click zone to focus • ESC to exit
      </div>
    </>
  );
}
