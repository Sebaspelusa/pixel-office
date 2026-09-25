// Theme definitions for Pixel Office
// Each theme defines colors for: background, text, accent, panels, glows

export interface Theme {
  id: string;
  name: string;
  icon: string;
  colors: {
    // Background
    bg: string;
    bgGradient: string;
    bgPattern?: string; // CSS repeating pattern overlay
    
    // Text
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    
    // Accent
    accent: string;
    accentGlow: string;
    
    // Panels (EventLog, TokenCounter, etc)
    panelBg: string;
    panelBorder: string;
    panelHeader: string;
    
    // Monitor glow
    glowIdle: string;
    glowThinking: string;
    glowReading: string;
    glowEditing: string;
    glowRunning: string;
    glowSearching: string;
    glowWaiting: string;
    glowSpawning: string;
    
    // State colors (for text labels)
    stateIdle: string;
    stateThinking: string;
    stateReading: string;
    stateEditing: string;
    stateRunning: string;
    stateSearching: string;
    stateWaiting: string;
    stateSpawning: string;
    
    // Name labels
    nameMain: string;
    nameSub: string;
    
    // Bubble
    bubbleBg: string;
    bubbleBorder: string;
    
    // Status bar
    statusLive: string;
    statusOffline: string;
    
    // Scrollbar
    scrollbarTrack: string;
    scrollbarThumb: string;
  };
  // Optional CSS filter for background image
  bgFilter?: string;
  // Optional CSS filter for sprites
  spriteFilter?: string;
}

export const themes: Theme[] = [
  // ─── DARK (default) ──────────────────────────────────────────────────
  {
    id: "dark",
    name: "Dark",
    icon: "🌙",
    colors: {
      bg: "#0a0a0f",
      bgGradient: "linear-gradient(180deg, #0a0a0f 0%, #111118 100%)",
      
      textPrimary: "rgba(255,255,255,0.85)",
      textSecondary: "rgba(255,255,255,0.6)",
      textMuted: "rgba(255,255,255,0.3)",
      
      accent: "#fbbf24",
      accentGlow: "rgba(251,191,36,0.3)",
      
      panelBg: "rgba(0,0,0,0.85)",
      panelBorder: "rgba(255,255,255,0.1)",
      panelHeader: "rgba(255,255,255,0.03)",
      
      glowIdle: "255,255,255",
      glowThinking: "56,189,248",
      glowReading: "99,102,241",
      glowEditing: "245,158,11",
      glowRunning: "16,185,129",
      glowSearching: "167,139,250",
      glowWaiting: "244,63,94",
      glowSpawning: "34,211,238",
      
      stateIdle: "rgba(255,255,255,0.5)",
      stateThinking: "#38bdf8",
      stateReading: "#6366f1",
      stateEditing: "#f59e0b",
      stateRunning: "#10b981",
      stateSearching: "#a78bfa",
      stateWaiting: "#f43f5e",
      stateSpawning: "#22d3ee",
      
      nameMain: "rgba(251,191,36,0.9)",
      nameSub: "rgba(255,255,255,0.55)",
      
      bubbleBg: "rgba(0,0,0,0.85)",
      bubbleBorder: "rgba(255,255,255,0.15)",
      
      statusLive: "#34d399",
      statusOffline: "rgba(255,255,255,0.2)",
      
      scrollbarTrack: "rgba(255,255,255,0.05)",
      scrollbarThumb: "rgba(255,255,255,0.2)",
    },
  },

  // ─── LIGHT ───────────────────────────────────────────────────────────
  {
    id: "light",
    name: "Light",
    icon: "☀️",
    colors: {
      bg: "#f0f0e8",
      bgGradient: "linear-gradient(180deg, #f5f5f0 0%, #e8e8e0 100%)",
      
      textPrimary: "rgba(0,0,0,0.85)",
      textSecondary: "rgba(0,0,0,0.6)",
      textMuted: "rgba(0,0,0,0.3)",
      
      accent: "#3b82f6",
      accentGlow: "rgba(59,130,246,0.3)",
      
      panelBg: "rgba(255,255,255,0.92)",
      panelBorder: "rgba(0,0,0,0.1)",
      panelHeader: "rgba(0,0,0,0.03)",
      
      glowIdle: "100,100,100",
      glowThinking: "56,189,248",
      glowReading: "99,102,241",
      glowEditing: "245,158,11",
      glowRunning: "16,185,129",
      glowSearching: "167,139,250",
      glowWaiting: "244,63,94",
      glowSpawning: "34,211,238",
      
      stateIdle: "rgba(0,0,0,0.4)",
      stateThinking: "#0284c7",
      stateReading: "#4f46e5",
      stateEditing: "#d97706",
      stateRunning: "#059669",
      stateSearching: "#7c3aed",
      stateWaiting: "#e11d48",
      stateSpawning: "#0891b2",
      
      nameMain: "rgba(59,130,246,0.9)",
      nameSub: "rgba(0,0,0,0.5)",
      
      bubbleBg: "rgba(255,255,255,0.95)",
      bubbleBorder: "rgba(0,0,0,0.12)",
      
      statusLive: "#16a34a",
      statusOffline: "rgba(0,0,0,0.2)",
      
      scrollbarTrack: "rgba(0,0,0,0.05)",
      scrollbarThumb: "rgba(0,0,0,0.2)",
    },
    bgFilter: "brightness(1.1) contrast(0.95) saturate(0.9)",
    spriteFilter: "brightness(1.15) contrast(0.9)",
  },

  // ─── CYBERPUNK ───────────────────────────────────────────────────────
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    icon: "🌃",
    colors: {
      bg: "#0a0a1a",
      bgGradient: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)",
      bgPattern: "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,0,255,0.06) 39px, rgba(255,0,255,0.06) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0,255,255,0.06) 39px, rgba(0,255,255,0.06) 40px)",
      
      textPrimary: "rgba(0,255,255,0.9)",
      textSecondary: "rgba(255,0,255,0.7)",
      textMuted: "rgba(0,255,255,0.3)",
      
      accent: "#f472b6",
      accentGlow: "rgba(244,114,182,0.4)",
      
      panelBg: "rgba(10,10,30,0.92)",
      panelBorder: "rgba(0,255,255,0.2)",
      panelHeader: "rgba(0,255,255,0.05)",
      
      glowIdle: "0,255,255",
      glowThinking: "244,114,182",
      glowReading: "168,85,247",
      glowEditing: "255,200,0",
      glowRunning: "0,255,128",
      glowSearching: "255,0,255",
      glowWaiting: "255,50,50",
      glowSpawning: "0,200,255",
      
      stateIdle: "rgba(0,255,255,0.5)",
      stateThinking: "#f472b6",
      stateReading: "#a855f7",
      stateEditing: "#facc15",
      stateRunning: "#00ff80",
      stateSearching: "#ff00ff",
      stateWaiting: "#ff3232",
      stateSpawning: "#00c8ff",
      
      nameMain: "rgba(244,114,182,0.95)",
      nameSub: "rgba(0,255,255,0.6)",
      
      bubbleBg: "rgba(10,10,30,0.92)",
      bubbleBorder: "rgba(0,255,255,0.3)",
      
      statusLive: "#00ff80",
      statusOffline: "rgba(0,255,255,0.2)",
      
      scrollbarTrack: "rgba(0,255,255,0.05)",
      scrollbarThumb: "rgba(0,255,255,0.3)",
    },
    bgFilter: "saturate(1.3) contrast(1.1)",
  },

  // ─── RETRO TERMINAL ─────────────────────────────────────────────────
  {
    id: "retro",
    name: "Retro",
    icon: "📺",
    colors: {
      bg: "#0a0a0a",
      bgGradient: "linear-gradient(180deg, #0a0a0a 0%, #0d1a0d 100%)",
      bgPattern: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(74,222,128,0.03) 2px, rgba(74,222,128,0.03) 4px)",
      
      textPrimary: "rgba(74,222,128,0.9)",
      textSecondary: "rgba(74,222,128,0.6)",
      textMuted: "rgba(74,222,128,0.25)",
      
      accent: "#4ade80",
      accentGlow: "rgba(74,222,128,0.3)",
      
      panelBg: "rgba(0,10,0,0.92)",
      panelBorder: "rgba(74,222,128,0.2)",
      panelHeader: "rgba(74,222,128,0.05)",
      
      glowIdle: "74,222,128",
      glowThinking: "134,239,172",
      glowReading: "52,211,153",
      glowEditing: "250,204,21",
      glowRunning: "74,222,128",
      glowSearching: "167,139,250",
      glowWaiting: "248,113,113",
      glowSpawning: "56,189,248",
      
      stateIdle: "rgba(74,222,128,0.4)",
      stateThinking: "#86efac",
      stateReading: "#34d399",
      stateEditing: "#facc15",
      stateRunning: "#4ade80",
      stateSearching: "#a78bfa",
      stateWaiting: "#f87171",
      stateSpawning: "#38bdf8",
      
      nameMain: "rgba(74,222,128,0.95)",
      nameSub: "rgba(74,222,128,0.5)",
      
      bubbleBg: "rgba(0,10,0,0.92)",
      bubbleBorder: "rgba(74,222,128,0.3)",
      
      statusLive: "#4ade80",
      statusOffline: "rgba(74,222,128,0.2)",
      
      scrollbarTrack: "rgba(74,222,128,0.05)",
      scrollbarThumb: "rgba(74,222,128,0.3)",
    },
    bgFilter: "sepia(0.3) hue-rotate(80deg) saturate(1.2)",
    spriteFilter: "brightness(1.1) sepia(0.15) hue-rotate(80deg)",
  },
];

export function getThemeById(id: string): Theme {
  return themes.find(t => t.id === id) ?? themes[0];
}
