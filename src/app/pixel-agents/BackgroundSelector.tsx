"use client";

import { useState } from "react";
import { useBackground } from "./BackgroundContext";
import { useTheme } from "./ThemeContext";

export function BackgroundSelector() {
  const { backgroundId, backgrounds, setBackgroundId } = useBackground();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const c = theme.colors;

  return (
    <div style={{ position: "fixed", bottom: 16, right: 68, zIndex: 100 }}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: c.panelBg,
          border: `2px solid ${c.panelBorder}`,
          cursor: "pointer",
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 12px ${c.accentGlow}`,
          transition: "all 0.2s ease",
        }}
        title="Change office background"
      >
        🏢
      </button>

      {/* Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 99,
            }}
          />

          {/* Menu */}
          <div style={{
            position: "absolute",
            bottom: 56,
            right: 0,
            background: c.panelBg,
            border: `1px solid ${c.panelBorder}`,
            borderRadius: 8,
            padding: "6px",
            minWidth: 200,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            zIndex: 101,
            animation: "bgMenuSlideUp 0.15s ease-out",
          }}>
            {/* Header */}
            <div style={{
              padding: "6px 10px",
              borderBottom: `1px solid ${c.panelBorder}`,
              marginBottom: 4,
            }}>
              <span style={{
                color: c.textSecondary,
                fontSize: 10,
                fontFamily: "monospace",
                letterSpacing: "0.05em",
              }}>
                🏢 OFFICE
              </span>
            </div>

            {/* Background options */}
            {backgrounds.map((bg) => (
              <button
                key={bg.id}
                onClick={() => { setBackgroundId(bg.id); setIsOpen(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: bg.id === backgroundId ? c.accentGlow : "transparent",
                  border: bg.id === backgroundId ? `1px solid ${c.accent}` : "1px solid transparent",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => {
                  if (bg.id !== backgroundId) {
                    e.currentTarget.style.background = c.panelHeader;
                  }
                }}
                onMouseLeave={(e) => {
                  if (bg.id !== backgroundId) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {/* Thumbnail preview */}
                <div style={{
                  width: 32,
                  height: 20,
                  borderRadius: 3,
                  overflow: "hidden",
                  border: `1px solid ${c.panelBorder}`,
                  flexShrink: 0,
                }}>
                  <img
                    src={bg.image}
                    alt={bg.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <span style={{
                    color: bg.id === backgroundId ? c.accent : c.textPrimary,
                    fontSize: 12,
                    fontFamily: "monospace",
                    fontWeight: bg.id === backgroundId ? "bold" : "normal",
                  }}>
                    {bg.name}
                  </span>
                  <span style={{
                    color: c.textMuted,
                    fontSize: 9,
                    fontFamily: "monospace",
                  }}>
                    {bg.perspective} · {bg.seats.length} seats
                  </span>
                </div>
                {bg.id === backgroundId && (
                  <span style={{
                    marginLeft: "auto",
                    color: c.accent,
                    fontSize: 10,
                  }}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* CSS animation */}
      <style>{`
        @keyframes bgMenuSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
