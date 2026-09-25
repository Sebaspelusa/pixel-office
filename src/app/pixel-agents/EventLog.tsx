"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAgentData } from "./AgentDataContext";
import { useTheme } from "./ThemeContext";
import type { AgentEntry, MultiAgentState } from "./AgentDataContext";

interface LogEntry {
  id: number;
  agentId: string;
  agentName: string;
  state: MultiAgentState;
  tool?: string;
  detail?: string;
  timestamp: string;
}

const STATE_ICONS: Record<MultiAgentState, string> = {
  idle:      "💤",
  thinking:  "💭",
  reading:   "📖",
  editing:   "✏️",
  running:   "⚡",
  searching: "🔍",
  waiting:   "⏳",
  spawning:  "🚀",
};

function formatTime(iso: string): string {
  try {
    // SSE route may send epoch-ms as string; Date only parses those as numbers
    const t = typeof iso === "string" && /^\d+$/.test(iso) ? Number(iso) : iso;
    const d = new Date(t);
    // Invalid Date does NOT throw — check explicitly
    if (isNaN(d.getTime())) return "??:??:??";
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  } catch {
    return "??:??:??";
  }
}

export function EventLog() {
  const { agents } = useAgentData();
  const { theme } = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [maxEntries, setMaxEntries] = useState(50);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const prevAgentsRef = useRef<Map<string, AgentEntry>>(new Map());

  // Track agent changes and add to log
  useEffect(() => {
    const prev = prevAgentsRef.current;
    const newLogs: LogEntry[] = [];

    agents.forEach((entry, agentId) => {
      const prevEntry = prev.get(agentId);
      // New agent or state changed
      if (!prevEntry || prevEntry.state !== entry.state || prevEntry.tool !== entry.tool) {
        newLogs.push({
          id: idRef.current++,
          agentId,
          agentName: entry.agentType ?? agentId.slice(0, 8),
          state: entry.state,
          tool: entry.tool,
          detail: entry.detail,
          timestamp: entry.lastSeen,
        });
      }
    });

    // Agent removed
    prev.forEach((entry, agentId) => {
      if (!agents.has(agentId)) {
        newLogs.push({
          id: idRef.current++,
          agentId,
          agentName: entry.agentType ?? agentId.slice(0, 8),
          state: "idle",
          detail: "disconnected",
          timestamp: new Date().toISOString(),
        });
      }
    });

    if (newLogs.length > 0) {
      setLogs(prev => [...newLogs, ...prev].slice(0, maxEntries));
    }

    prevAgentsRef.current = new Map(agents);
  }, [agents, maxEntries]);

  // Auto-scroll to top when new entries arrive
  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs.length, expanded]);

  return (
    <div style={{
      background: theme.colors.panelBg,
      border: `1px solid ${theme.colors.panelBorder}`,
      borderRadius: 6,
      overflow: "hidden",
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: theme.colors.panelHeader,
          border: "none",
          cursor: "pointer",
          color: theme.colors.textSecondary,
          fontFamily: "monospace",
          fontSize: 11,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          📋 Event Log
          <span style={{ 
            background: `${theme.colors.statusLive}33`, 
            color: theme.colors.statusLive, 
            padding: "1px 6px", 
            borderRadius: 8,
            fontSize: 9,
          }}>
            {logs.length}
          </span>
        </span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Log entries */}
      {expanded && (
        <div
          ref={scrollRef}
          style={{
            maxHeight: 200,
            overflowY: "auto",
            padding: "4px 0",
          }}
        >
          {logs.length === 0 ? (
            <div style={{
              padding: "12px",
              textAlign: "center",
              color: "rgba(255,255,255,0.3)",
              fontSize: 10,
              fontFamily: "monospace",
            }}>
              Waiting for activity...
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "4px 12px",
                  borderBottom: `1px solid ${theme.colors.panelBorder}`,
                  animation: "logSlideIn 0.2s ease-out",
                }}
              >
                {/* Timestamp */}
                <span style={{
                  color: theme.colors.textMuted,
                  fontSize: 9,
                  fontFamily: "monospace",
                  whiteSpace: "nowrap",
                  minWidth: 60,
                }}>
                  {formatTime(log.timestamp)}
                </span>

                {/* Icon */}
                <span style={{ fontSize: 10 }}>{STATE_ICONS[log.state]}</span>

                {/* Agent name */}
                <span style={{
                  color: theme.colors.textSecondary,
                  fontSize: 10,
                  fontFamily: "monospace",
                  whiteSpace: "nowrap",
                  minWidth: 60,
                }}>
                  {log.agentName}
                </span>

                {/* State + detail */}
                <span style={{
                  color: theme.colors[`state${log.state.charAt(0).toUpperCase() + log.state.slice(1)}` as keyof typeof theme.colors] ?? theme.colors.textPrimary,
                  fontSize: 10,
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {log.tool ? `${log.tool}` : log.state}
                  {log.detail && (
                    <span style={{ color: theme.colors.textMuted }}>
                      {" "}{log.detail.slice(0, 40)}
                    </span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* CSS animation */}
      <style>{`
        @keyframes logSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
