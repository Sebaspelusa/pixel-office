"use client";

import React, { useEffect, useState } from "react";
import { useAgentData } from "./AgentDataContext";
import { useTheme } from "./ThemeContext";

interface TokenStats {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  activeAgents: number;
  sessionsToday: number;
}

// Approximate token counts based on agent activity (since OpenCode doesn't expose exact counts)
function estimateTokens(agents: Map<string, any>): TokenStats {
  let total = 0;
  let input = 0;
  let output = 0;

  agents.forEach((entry) => {
    // Rough estimation based on state
    switch (entry.state) {
      case "editing":
        input += 2000;
        output += 4000;
        break;
      case "thinking":
        input += 3000;
        output += 1000;
        break;
      case "reading":
        input += 5000;
        output += 500;
        break;
      case "running":
        input += 1000;
        output += 2000;
        break;
      case "searching":
        input += 2000;
        output += 800;
        break;
      default:
        input += 500;
        output += 200;
    }
  });

  total = input + output;
  // Approximate cost: $3/1M input, $15/1M output (Claude Sonnet pricing)
  const cost = (input * 3 + output * 15) / 1_000_000;

  return {
    totalTokens: total,
    inputTokens: input,
    outputTokens: output,
    estimatedCost: cost,
    activeAgents: agents.size,
    sessionsToday: agents.size,
  };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function TokenCounter() {
  const { agents } = useAgentData();
  const { theme } = useTheme();
  const [stats, setStats] = useState<TokenStats>({
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    activeAgents: 0,
    sessionsToday: 0,
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setStats(estimateTokens(agents));
  }, [agents]);

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
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          📊 Token Usage
          <span style={{ color: theme.colors.statusLive, fontSize: 10 }}>
            {formatTokens(stats.totalTokens)}
          </span>
          <span style={{ 
            color: theme.colors.textMuted, 
            fontSize: 9,
            background: theme.colors.panelHeader,
            padding: "1px 6px",
            borderRadius: 4,
          }}>
            ~${stats.estimatedCost.toFixed(4)}
          </span>
        </span>
        <span style={{ color: theme.colors.textMuted }}>{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded stats */}
      {expanded && (
        <div style={{ padding: "8px 12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {/* Input tokens */}
            <div style={{
              background: `${theme.colors.stateReading}1a`,
              border: `1px solid ${theme.colors.stateReading}4d`,
              borderRadius: 4,
              padding: "6px 8px",
            }}>
              <div style={{ color: theme.colors.textMuted, fontSize: 9, fontFamily: "monospace" }}>
                Input
              </div>
              <div style={{ color: theme.colors.stateReading, fontSize: 14, fontFamily: "monospace", fontWeight: "bold" }}>
                {formatTokens(stats.inputTokens)}
              </div>
            </div>

            {/* Output tokens */}
            <div style={{
              background: `${theme.colors.stateEditing}1a`,
              border: `1px solid ${theme.colors.stateEditing}4d`,
              borderRadius: 4,
              padding: "6px 8px",
            }}>
              <div style={{ color: theme.colors.textMuted, fontSize: 9, fontFamily: "monospace" }}>
                Output
              </div>
              <div style={{ color: theme.colors.stateEditing, fontSize: 14, fontFamily: "monospace", fontWeight: "bold" }}>
                {formatTokens(stats.outputTokens)}
              </div>
            </div>

            {/* Active agents */}
            <div style={{
              background: `${theme.colors.stateRunning}1a`,
              border: `1px solid ${theme.colors.stateRunning}4d`,
              borderRadius: 4,
              padding: "6px 8px",
            }}>
              <div style={{ color: theme.colors.textMuted, fontSize: 9, fontFamily: "monospace" }}>
                Agents
              </div>
              <div style={{ color: theme.colors.stateRunning, fontSize: 14, fontFamily: "monospace", fontWeight: "bold" }}>
                {stats.activeAgents}
              </div>
            </div>

            {/* Estimated cost */}
            <div style={{
              background: `${theme.colors.stateWaiting}1a`,
              border: `1px solid ${theme.colors.stateWaiting}4d`,
              borderRadius: 4,
              padding: "6px 8px",
            }}>
              <div style={{ color: theme.colors.textMuted, fontSize: 9, fontFamily: "monospace" }}>
                Est. Cost
              </div>
              <div style={{ color: theme.colors.stateWaiting, fontSize: 14, fontFamily: "monospace", fontWeight: "bold" }}>
                ${stats.estimatedCost.toFixed(4)}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            marginTop: 8,
            padding: "4px 8px",
            background: theme.colors.panelHeader,
            borderRadius: 4,
            color: theme.colors.textMuted,
            fontSize: 8,
            fontFamily: "monospace",
            textAlign: "center",
          }}>
            ⚠️ Estimated based on activity patterns (OpenCode doesn't expose exact token counts)
          </div>
        </div>
      )}
    </div>
  );
}
