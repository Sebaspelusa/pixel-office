"use client";

import { useState } from "react";
import { useTheme } from "./ThemeContext";

export function ThemeSelector() {
  const { theme, themes, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 100 }}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: theme.colors.panelBg,
          border: `2px solid ${theme.colors.panelBorder}`,
          cursor: "pointer",
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 12px ${theme.colors.accentGlow}`,
          transition: "all 0.2s ease",
        }}
        title="Change theme"
      >
        {theme.icon}
      </button>

      {/* Theme menu */}
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
            background: theme.colors.panelBg,
            border: `1px solid ${theme.colors.panelBorder}`,
            borderRadius: 8,
            padding: "6px",
            minWidth: 160,
            boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
            zIndex: 101,
            animation: "menuSlideUp 0.15s ease-out",
          }}>
            {/* Header */}
            <div style={{
              padding: "6px 10px",
              borderBottom: `1px solid ${theme.colors.panelBorder}`,
              marginBottom: 4,
            }}>
              <span style={{
                color: theme.colors.textSecondary,
                fontSize: 10,
                fontFamily: "monospace",
                letterSpacing: "0.05em",
              }}>
                🎨 THEME
              </span>
            </div>

            {/* Theme buttons */}
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setIsOpen(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: t.id === theme.id ? theme.colors.accentGlow : "transparent",
                  border: t.id === theme.id ? `1px solid ${theme.colors.accent}` : "1px solid transparent",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => {
                  if (t.id !== theme.id) {
                    e.currentTarget.style.background = theme.colors.panelHeader;
                  }
                }}
                onMouseLeave={(e) => {
                  if (t.id !== theme.id) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <span style={{
                  color: t.id === theme.id ? theme.colors.accent : theme.colors.textPrimary,
                  fontSize: 12,
                  fontFamily: "monospace",
                  fontWeight: t.id === theme.id ? "bold" : "normal",
                }}>
                  {t.name}
                </span>
                {t.id === theme.id && (
                  <span style={{
                    marginLeft: "auto",
                    color: theme.colors.accent,
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
        @keyframes menuSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
