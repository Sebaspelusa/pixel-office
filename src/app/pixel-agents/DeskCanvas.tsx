"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAgentData } from "./AgentDataContext";
import { useTheme } from "./ThemeContext";
import { useBackground } from "./BackgroundContext";
import { useCast } from "./CastContext";
import type { AgentRole, MultiAgentState, AgentEntry } from "./AgentDataContext";

// ─── Sprite / Canvas Constants ────────────────────────────────────────────────

const BASE_SC   = 4;
const REF_WIDTH = 1280;

// Default fallback seats (used only if background has none)
const DEFAULT_SEATS = [
  { x: 0.079, y: 0.783, facing: 1 as const },
  { x: 0.251, y: 0.783, facing: -1 as const },
  { x: 0.421, y: 0.783, facing: 1 as const },
  { x: 0.585, y: 0.783, facing: -1 as const },
  { x: 0.750, y: 0.783, facing: 1 as const },
  { x: 0.913, y: 0.783, facing: -1 as const },
];

const FLOOR_Y_FRACTION = 0.97;

const BASE_SPEED = 200;

const SCREEN_W_MULT = 2.4;
const SCREEN_H_MULT = 0.75;

// Seated agents show torso only (top fraction); legs hide "behind the desk"
const SEAT_CROP_TOP = 0.38;

// Map image coords → container coords accounting for centered zoom crop
// with vertical focus (focusY = center of the visible window, 0.5 = centered)
function imgToC(imgFrac: number, zoom: number, focusY = 0.5): number {
  return (imgFrac - focusY) * zoom + 0.5;
}

// ─── Animation Types ──────────────────────────────────────────────────────────

interface Anim { row: number; frames: number[]; fps: number }

const WALK: Anim = { row: 2, frames: [0, 1, 2, 1], fps: 8 };

const ANIMS: Record<MultiAgentState, Anim> = {
  idle:      { row: 0, frames: [0, 1, 2, 1], fps: 3 },
  thinking:  { row: 0, frames: [5, 6],       fps: 2 },
  reading:   { row: 0, frames: [5, 6],       fps: 2 },
  editing:   { row: 0, frames: [3, 4],       fps: 8 },
  running:   { row: 2, frames: [0, 1, 2, 1], fps: 8 },
  searching: { row: 1, frames: [0, 1, 2, 1], fps: 4 },
  waiting:   { row: 0, frames: [0, 1],       fps: 2 },
  spawning:  { row: 2, frames: [0, 1, 2, 1], fps: 6 },
};

const RGB: Record<MultiAgentState, string> = {
  idle:      "255,255,255",
  thinking:  "56,189,248",
  reading:   "99,102,241",
  editing:   "245,158,11",
  running:   "16,185,129",
  searching: "167,139,250",
  waiting:   "244,63,94",
  spawning:  "34,211,238",
};

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

// ─── Per-Agent Motion State ───────────────────────────────────────────────────

interface AgentMotion {
  x: number;
  targetX: number;
  moving: boolean;
  facing: 1 | -1;
  seatFacing: 1 | -1; // facing to restore once seated
  walkingOut: boolean;
  seatIndex: number;
  frameTime: number;
  frameIdx: number;
  walkTime: number; // watchdog: snap to seat if walk-in takes too long
  opacity: number; // walk-outs fade in place instead of running off
  ax: number; // image-fraction x anchor (survives seat changes)
  ay: number; // image-fraction y anchor (feet)
  charN: number; // sprite variant (fixed at creation, no clothes-swapping)
}

// Max walk-in time before snapping to the seat (kills eternal walkers)
const MAX_WALK_TIME = 12;

// ─── Agent name mapping ───────────────────────────────────────────────────────

function agentLabel(role: AgentRole, agentType?: string): string {
  if (role === "main") return agentType ? agentType.slice(0, 10) : "main";
  const map: Record<string, string> = {
    "gsd-executor":          "executor",
    "gsd-planner":           "planner",
    "gsd-verifier":          "verifier",
    "gsd-phase-researcher":  "researcher",
    "gsd-plan-checker":      "checker",
    "gsd-debugger":          "debugger",
    "gsd-codebase-mapper":   "mapper",
    "general-purpose":       "agent",
    "Explore":               "explorer",
  };
  if (agentType && map[agentType]) return map[agentType];
  if (agentType) return agentType.replace(/^gsd-/, "").slice(0, 10);
  return "sub";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function spriteCSS(anim: Anim, frameIdx: number, charN: number, sc: number): React.CSSProperties {
  const col = anim.frames[frameIdx % anim.frames.length];
  const fw = 16 * sc;
  const fh = 32 * sc;
  const sw = 112 * sc;
  const sh = 96 * sc;
  return {
    backgroundImage: `url(/pixel-agents/char_${charN}.png)`,
    backgroundPosition: `${-(col * fw)}px ${-(anim.row * fh)}px`,
    backgroundSize: `${sw}px ${sh}px`,
    backgroundRepeat: "no-repeat",
    imageRendering: "pixelated",
  };
}

function assignSeat(role: AgentRole, occupied: Set<number>, seatCount: number, hasMain = false): number {
  if (role === "main") {
    if (!occupied.has(0)) return 0;
    // Dual source (OpenCode + Claude): a second main takes the first free
    // seat instead of overlapping the boss chair.
    for (let i = 1; i < seatCount; i++) {
      if (!occupied.has(i)) return i;
    }
    return -1;
  }
  // Boss chair never sits empty: first sub takes seat 0 when no main is around
  if (!hasMain && !occupied.has(0)) return 0;
  for (let i = 1; i < seatCount; i++) {
    if (!occupied.has(i)) return i;
  }
  return -1;
}

// ─── Speech Bubble Component ─────────────────────────────────────────────────

function SpeechBubble({ state, tool, detail, x, y, fw, sc, opacity, icon }: {
  state: MultiAgentState;
  tool?: string;
  detail?: string;
  x: number;
  y: number;
  fw: number;
  sc: number;
  opacity?: number;
  icon?: string | null; // undefined = default state icon, null/"" = no icon
}) {
  const shownIcon = icon === undefined ? STATE_ICONS[state] : icon;
  const text = tool ? `${tool}${detail ? `: ${detail}` : ""}` : detail ?? state;
  const maxWidth = Math.max(80, fw * 6);
  
  return (
    <div style={{
      position: "absolute",
      left: x + fw / 2,
      top: y - 8,
      transform: "translate(-50%, -100%)",
      zIndex: 10,
      pointerEvents: "none",
      animation: "bubbleIn 0.3s ease-out",
      opacity,
    }}>
      {/* Bubble body */}
      <div style={{
        background: "rgba(0,0,0,0.85)",
        border: `1px solid rgba(${RGB[state]}, 0.5)`,
        borderRadius: 6,
        padding: `${Math.max(2, fw * 0.06)}px ${Math.max(4, fw * 0.12)}px`,
        maxWidth,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        fontFamily: "monospace",
        fontSize: Math.max(7, Math.min(10, fw * 0.18)),
        color: "rgba(255,255,255,0.9)",
        boxShadow: `0 0 8px rgba(${RGB[state]}, 0.3)`,
      }}>
        {shownIcon ? <span style={{ marginRight: 4 }}>{shownIcon}</span> : null}
        {text}
      </div>
      {/* Pointer triangle */}
      <div style={{
        width: 0,
        height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: `5px solid rgba(0,0,0,0.85)`,
        margin: "0 auto",
      }} />
    </div>
  );
}

// ─── DeskCanvas ───────────────────────────────────────────────────────────────

export function DeskCanvas() {
  const { agents } = useAgentData();
  const { theme } = useTheme();
  const { background } = useBackground();
  const { deskHidden, deskChar, workersOnly } = useCast();
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidthRef = useRef<number>(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const motionRef = useRef<Map<string, AgentMotion>>(new Map());
  const localAgentsRef = useRef<Map<string, AgentEntry>>(new Map());
  const rafRef = useRef<number>(0);
  const [renderTick, setRenderTick] = useState(0);
  const occupiedSeatsRef = useRef<Set<number>>(new Set());
  const [showBubbles, setShowBubbles] = useState(true);
  // ?demo=1 URL flag (for testing/screenshots), applied after mount so
  // server and client render identically (no hydration mismatch).
  const [demoMode, setDemoMode] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1") {
      setDemoMode(true);
    }
  }, []);
  // ?cal=1: draw seat anchors + floor line so calibration offsets are measurable
  const [calMode, setCalMode] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("cal") === "1") {
      setCalMode(true);
    }
  }, []);
  // Click-to-measure: in cal mode, clicking the scene shows the IMAGE-fraction
  // coords of the click (inverse of imgToC) so chair bases can be read exactly.
  const [calClick, setCalClick] = useState<{ imgX: number; imgY: number } | null>(null);
  // Drag-to-place (cal mode): drag seat dots / ambient sprites onto furniture.
  // Overrides persist per background in localStorage; the tuner panel shows
  // the JSON to send back for permanent filing in office-backgrounds.ts.
  const [seatOverrides, setSeatOverrides] = useState<Record<number, { x: number; y: number }>>({});
  const [ambOverrides, setAmbOverrides] = useState<Record<number, { x: number; y: number }>>({});
  const [drag, setDrag] = useState<null | { kind: "seat" | "amb"; index: number; imgX: number; imgY: number }>(null);
  // Live sprite-scale override in cal mode (A−/A+ buttons); null = background value
  const [calScale, setCalScale] = useState<number | null>(null);
  // Live background-zoom override in cal mode (Z−/Z+ buttons); null = background value
  const [calZoom, setCalZoom] = useState<number | null>(null);
  useEffect(() => {
    setCalClick(null); setDrag(null);
    // Tuners (zoom/size) persist per background, like drag overrides.
    // v2 keys: v1 keys are orphaned on purpose (old giant tunings die out).
    try {
      const z = localStorage.getItem(`pixel-hq-zoom4-${background.id}`);
      const s = localStorage.getItem(`pixel-hq-scale4-${background.id}`);
      const zn = z !== null ? Number(z) : NaN;
      const sn = s !== null ? Number(s) : NaN;
      setCalZoom(!isNaN(zn) ? zn : null);
      setCalScale(!isNaN(sn) ? sn : null);
    } catch { setCalZoom(null); setCalScale(null); }
    try {
      const s = localStorage.getItem(`pixel-hq-seats2-${background.id}`);
      const a = localStorage.getItem(`pixel-hq-amb2-${background.id}`);
      setSeatOverrides(s ? JSON.parse(s) as Record<number, { x: number; y: number }> : {});
      setAmbOverrides(a ? JSON.parse(a) as Record<number, { x: number; y: number }> : {});
      // v1 seat/ambient keys are orphaned on purpose and deleted here: stale
      // drag positions from earlier broken calibrations used to shadow the
      // filed values in office-backgrounds.ts ("fix one, break others").
      // Every hand-placed spot is already filed there.
      localStorage.removeItem(`pixel-hq-seats-${background.id}`);
      localStorage.removeItem(`pixel-hq-amb-${background.id}`);
    } catch { setSeatOverrides({}); setAmbOverrides({}); }
  }, [background.id]);
  // Ambient life: advance decorative sitters' frames a few times per second
  // (only while the current background defines ambient spots)
  const [ambientTick, setAmbientTick] = useState(0);
  useEffect(() => {
    if (!(background.ambient?.length)) return;
    const id = setInterval(() => setAmbientTick((t) => t + 1), 600);
    return () => clearInterval(id);
  }, [background]);

  // ─── ResizeObserver ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;
    const ez = calZoom ?? background.zoom;
    const es = calScale ?? background.spriteScale;
    const efy = background.focusY ?? 0.5;
    const ro = new ResizeObserver((entries) => {
      const newCw = entries[0].contentRect.width;
      const oldCw = containerWidthRef.current;
      const ratio  = oldCw > 0 ? newCw / oldCw : 1;
      containerWidthRef.current = newCw;
      setContainerWidth(newCw);
      const newFw = Math.round(16 * BASE_SC * es * (newCw / REF_WIDTH));
      const seats = (background.seats.length > 0 ? background.seats : DEFAULT_SEATS).map((s, i) => ({ ...s, ...(seatOverrides[i] ?? {}) }));
      motionRef.current.forEach((motion) => {
        motion.x *= ratio;
        if (!motion.walkingOut) {
          const seat = seats[motion.seatIndex] ?? seats[0];
          motion.targetX = imgToC(seat.x, ez, efy) * newCw - newFw / 2;
          motion.walkTime = 0; // fresh target: watchdog restarts
        } else {
          motion.targetX = motion.facing === 1 ? newCw + newFw : -newFw;
        }
      });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [background, calZoom, calScale, seatOverrides]);

  // ─── Shared RAF loop ────────────────────────────────────────────────────

  useEffect(() => {
    let last = performance.now();
    function step(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      let changed = false;

      const speed = BASE_SPEED * (containerWidthRef.current > 0 ? containerWidthRef.current / REF_WIDTH : 1);
      motionRef.current.forEach((motion, agentId) => {
        const diff = motion.targetX - motion.x;
        // Exiting agents hurry out (2x) so stale ghosts vanish fast
        const stepPx = speed * dt * (motion.walkingOut ? 2 : 1);
        if (Math.abs(diff) > 1.5) {
          motion.x += Math.min(Math.abs(diff), stepPx) * Math.sign(diff);
          motion.moving = true;
          motion.facing = diff > 0 ? 1 : -1;
          changed = true;
          // Watchdog: never walk forever — snap to seat after MAX_WALK_TIME
          if (!motion.walkingOut) {
            motion.walkTime += dt;
            if (motion.walkTime > MAX_WALK_TIME) {
              motion.x = motion.targetX;
              motion.moving = false;
              motion.facing = motion.seatFacing;
              changed = true;
            }
          }
        } else {
          if (motion.moving && !motion.walkingOut) motion.facing = motion.seatFacing;
          motion.moving = false;
          motion.walkTime = 0; // arrived: reset watchdog for the next walk
        }

        const entry = localAgentsRef.current.get(agentId);
        if (entry) {
          const anim = motion.moving ? WALK : ANIMS[entry.state];
          motion.frameTime += dt;
          const frameDuration = 1 / anim.fps;
          while (motion.frameTime >= frameDuration) {
            motion.frameTime -= frameDuration;
            motion.frameIdx = (motion.frameIdx + 1) % anim.frames.length;
            changed = true;
          }
        }

        // Walk-outs fade in place (~0.5s) instead of running off-screen
        if (motion.walkingOut) {
          motion.opacity = Math.max(0, motion.opacity - dt * 2);
          changed = true;
        }
        if (motion.walkingOut && (motion.opacity <= 0 || Math.abs(motion.x - motion.targetX) < 2)) {
          localAgentsRef.current.delete(agentId);
          motionRef.current.delete(agentId);
          occupiedSeatsRef.current.delete(motion.seatIndex);
          changed = true;
        }
      });

      if (changed) setRenderTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ─── Agents sync ────────────────────────────────────────────────────────
  const bgIdRef = useRef<string>("");

  useEffect(() => {
    const cw = containerWidthRef.current;
    const seats = (background.seats.length > 0 ? background.seats : DEFAULT_SEATS).map((s, i) => ({ ...s, ...(seatOverrides[i] ?? {}) }));
    const ez = calZoom ?? background.zoom;
    const es = calScale ?? background.spriteScale;
    const efy = background.focusY ?? 0.5;

    // Background changed: clear all seats so agents walk into the new scene
    if (bgIdRef.current !== background.id) {
      bgIdRef.current = background.id;
      motionRef.current.clear();
      localAgentsRef.current.clear();
      occupiedSeatsRef.current.clear();
    }

    agents.forEach((entry, agentId) => {
      if (!motionRef.current.has(agentId)) {
        const hasMain = Array.from(agents.values()).some((e) => e.role === "main");
        if (entry.role === "main" && occupiedSeatsRef.current.has(0)) {
          // Boss is back: relocate whoever holds seat 0 to a free seat —
          // unless the holder is the other source's main (they coexist).
          const holder = Array.from(motionRef.current.entries()).find(([, m]) => m.seatIndex === 0 && !m.walkingOut);
          const holderIsMain = holder ? localAgentsRef.current.get(holder[0])?.role === "main" : false;
          const fwH = Math.round(16 * BASE_SC * es * (cw / REF_WIDTH));
          let free = -1;
          for (let i = 1; i < seats.length; i++) {
            if (!occupiedSeatsRef.current.has(i)) { free = i; break; }
          }
          if (holder && !holderIsMain && free !== -1) {
            const hm = holder[1];
            occupiedSeatsRef.current.delete(0);
            occupiedSeatsRef.current.add(free);
            hm.seatIndex = free;
            const hseat = seats[free];
            hm.seatFacing = hseat.facing;
            hm.ax = hseat.x;
            hm.ay = hseat.y;
            hm.targetX = imgToC(hseat.x, ez, efy) * cw - fwH / 2;
            hm.moving = true;
            hm.walkTime = 0;
          }
        }
        const seatIdx = assignSeat(entry.role, occupiedSeatsRef.current, seats.length, hasMain);
        if (seatIdx === -1) return;
        occupiedSeatsRef.current.add(seatIdx);
        const fw0 = Math.round(16 * BASE_SC * es * (cw / REF_WIDTH));
        const seat = seats[seatIdx];
        const seatX = imgToC(seat.x, ez, efy) * cw - fw0 / 2;
        const startX = entry.role === "main" ? -fw0 : cw;
        const facing: 1 | -1 = entry.role === "main" ? 1 : -1;
        motionRef.current.set(agentId, {
          x: startX,
          targetX: seatX,
          moving: true,
          facing,
          seatFacing: seat.facing,
          walkingOut: false,
          seatIndex: seatIdx,
          frameTime: 0,
          frameIdx: 0,
          walkTime: 0,
          opacity: 1,
          ax: seat.x,
          ay: seat.y,
          charN: seatIdx % 3, // workers share looks 0-2; ambient cast owns 3-5
        });
        localAgentsRef.current.set(agentId, entry);
      } else {
        localAgentsRef.current.set(agentId, entry);
      }
    });

    motionRef.current.forEach((motion, agentId) => {
      if (!agents.has(agentId) && !motion.walkingOut) {
        motion.walkingOut = true;
        const fwOut = Math.round(16 * BASE_SC * es * (containerWidthRef.current / REF_WIDTH));
        motion.targetX = motion.facing === 1
          ? containerWidthRef.current + fwOut
          : -fwOut;
        motion.moving = true;
      }
    });

    // Re-anchor seated agents to their effective seat (incl. CAL overrides):
    // dragging a red dot and releasing must move the character onto the dot,
    // not leave the old sprite position stale (previous bug).
    motionRef.current.forEach((motion) => {
      if (motion.walkingOut) return;
      const seat = seats[motion.seatIndex] ?? seats[0];
      const fwA = Math.round(16 * BASE_SC * es * (cw / REF_WIDTH));
      const tx = imgToC(seat.x, ez, efy) * cw - fwA / 2;
      if (Math.abs(tx - motion.targetX) > 1 || motion.ax !== seat.x || motion.ay !== seat.y) {
        motion.ax = seat.x;
        motion.ay = seat.y;
        motion.seatFacing = seat.facing;
        motion.targetX = tx;
        motion.moving = true;
        motion.walkTime = 0;
      }
    });
  }, [agents, background, calZoom, calScale, seatOverrides]);

  // ─── Render ─────────────────────────────────────────────────────────────

  void renderTick;

  const seats = background.seats.length > 0 ? background.seats : DEFAULT_SEATS;
  // Effective seats = file values + CAL drag overrides (persisted per bg)
  const effSeats = seats.map((s, i) => ({ ...s, ...(seatOverrides[i] ?? {}) }));
  const commitDrag = () => {
    if (!drag) return;
    const v = { x: +drag.imgX.toFixed(3), y: +drag.imgY.toFixed(3) };
    if (drag.kind === "seat") {
      const n = { ...seatOverrides, [drag.index]: v };
      try { localStorage.setItem(`pixel-hq-seats2-${background.id}`, JSON.stringify(n)); } catch {}
      setSeatOverrides(n);
    } else {
      const n = { ...ambOverrides, [drag.index]: v };
      try { localStorage.setItem(`pixel-hq-amb2-${background.id}`, JSON.stringify(n)); } catch {}
      setAmbOverrides(n);
    }
    setDrag(null);
  };
  // In cal mode the tuners override zoom/scale live; null = background value
  const zoom = calZoom ?? background.zoom;
  const effScale = calScale ?? background.spriteScale;
  // Vertical crop center (0.5 = centered, >0.5 = frame shifted down)
  const fcy = background.focusY ?? 0.5;

  const cw = containerWidth;
  const ch = cw / background.aspectRatio;
  const sc = cw > 0 ? BASE_SC * effScale * (cw / REF_WIDTH) : BASE_SC;
  const fw = Math.round(16 * sc);
  const fh = Math.round(32 * sc);

  const DEMO_MODE = demoMode;
  const demoStates: MultiAgentState[] = ["editing", "searching", "reading", "running", "thinking", "waiting", "idle", "spawning", "editing", "searching"];
  const demoEntries: [string, AgentEntry][] = DEMO_MODE
    ? seats.map((_, i) => [`demo-${i}`, {
        agentId: i === 0 ? "main" : `demo-${i}`,
        state: demoStates[i],
        role: (i === 0 ? "main" : "sub") as AgentRole,
        sessionId: `demo-${i}`,
        lastSeen: new Date().toISOString(),
      }])
    : [];
  const demoMotions = DEMO_MODE
    ? effSeats.map((seat, i) => { const sx = imgToC(seat.x, zoom, fcy) * cw - fw / 2; return { x: sx, targetX: sx, moving: false, facing: seat.facing, seatFacing: seat.facing, walkingOut: false, seatIndex: i, frameTime: 0, frameIdx: 0, walkTime: 0, opacity: 1, ax: seat.x, ay: seat.y, charN: i % 3 }; })
    : [];

  // Per-theme decorative sitters (bar, reading corner...). Static, seated,
  // never take agent seats and never walk: pure ambiance, zero tokens.
  // The cast panel can hide any of them (or all, with workers-only mode).
  const ambientDefs = (background.ambient ?? []).map((a, k) => ({ ...a, ...(ambOverrides[k] ?? {}) }));
  const ambientPairs = ambientDefs
    .map((a, k) => ({ a, k }))
    .filter(({ k }) => !workersOnly && !deskHidden.includes(`${background.id}:${k}`));
  const ambientEntries: [string, AgentEntry][] = DEMO_MODE
    ? []
    : ambientPairs.map(({ a, k }) => {
        const id = `amb-${background.id}-${k}`;
        return [id, {
          agentId: id,
          role: "sub" as AgentRole,
          sessionId: "ambient",
          state: a.state,
          detail: a.detail,
          lastSeen: "ambient",
          agentType: a.label,
        }];
      });
  const ambientMotions = new Map<string, AgentMotion>(ambientPairs.map(({ a, k }) => {
    const id = `amb-${background.id}-${k}`;
    const px = drag?.kind === "amb" && drag.index === k ? drag.imgX : a.x;
    const py = drag?.kind === "amb" && drag.index === k ? drag.imgY : a.y;
    const mx = imgToC(px, zoom, fcy) * cw - fw / 2;
    return [id, {
      x: mx, targetX: mx, moving: false, facing: a.facing, seatFacing: a.facing,
      walkingOut: false, seatIndex: -1, frameTime: 0, frameIdx: ambientTick + k,
      // Ambient cast (3-5) never shares looks with seated workers (0-2),
      // unless pinned: file charN, then cast-panel pick (0-9, your call)
      walkTime: 0, opacity: 1, charN: a.charN ?? deskChar[`${background.id}:${k}`] ?? (3 + (k % 3)), ax: px, ay: py,
    }];
  }));

  const ambientById = new Map<string, (typeof ambientDefs)[number]>(
    ambientPairs.map(({ a, k }) => [`amb-${background.id}-${k}`, a])
  );

  const renderEntries: [string, AgentEntry][] = DEMO_MODE
    ? demoEntries
    : [...Array.from(localAgentsRef.current.entries()), ...ambientEntries];
  const getMotion = (agentId: string, i: number): AgentMotion | undefined =>
    DEMO_MODE ? demoMotions[i] : (motionRef.current.get(agentId) ?? ambientMotions.get(agentId));

  return (
    <div style={{ position: "relative" }}>
      {/* Bubble toggle button */}
      <button
        onClick={() => setShowBubbles(b => !b)}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 20,
          background: showBubbles ? `${theme.colors.statusLive}33` : theme.colors.panelHeader,
          border: `1px solid ${showBubbles ? theme.colors.statusLive : theme.colors.panelBorder}`,
          borderRadius: 4,
          padding: "4px 8px",
          color: showBubbles ? theme.colors.statusLive : theme.colors.textMuted,
          fontSize: 10,
          fontFamily: "monospace",
          cursor: "pointer",
        }}
      >
        💬 {showBubbles ? "ON" : "OFF"}
      </button>
      {/* Calibration toggle button (same as ?cal=1, no URL needed) */}
      <button
        onClick={() => { setCalMode(c => !c); setCalClick(null); setDrag(null); }}
        title="Toggle seat calibration overlay"
        style={{
          position: "absolute",
          top: 8,
          right: 76,
          zIndex: 20,
          background: calMode ? "rgba(0,255,255,0.15)" : theme.colors.panelHeader,
          border: `1px solid ${calMode ? "#00ffff" : theme.colors.panelBorder}`,
          borderRadius: 4,
          padding: "4px 8px",
          color: calMode ? "#00ffff" : theme.colors.textMuted,
          fontSize: 10,
          fontFamily: "monospace",
          cursor: "pointer",
        }}
      >
        📐 CAL
      </button>

      <div
        ref={containerRef}
        onClick={calMode ? (e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          const cX = (e.clientX - rect.left) / rect.width;
          const cY = (e.clientY - rect.top) / rect.height;
          // inverse of imgToC with focus: img = (c - 0.5) / zoom + focusY
          setCalClick({ imgX: (cX - 0.5) / zoom + fcy, imgY: (cY - 0.5) / zoom + fcy });
        } : undefined}
        onMouseMove={calMode ? (e) => {
          if (!drag || !containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          const cX = (e.clientX - rect.left) / rect.width;
          const cY = (e.clientY - rect.top) / rect.height;
          setDrag({ ...drag, imgX: (cX - 0.5) / zoom + fcy, imgY: (cY - 0.5) / zoom + fcy });
        } : undefined}
        onMouseUp={calMode ? commitDrag : undefined}
        onMouseLeave={calMode ? commitDrag : undefined}
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: `${(1 / background.aspectRatio) * 100}%`,
          overflow: "hidden",
          background: "#000",
          cursor: calMode ? "crosshair" : undefined,
        }}
      >
        {/* Background layer — zoomed to crop baked-in checkerboard edges */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${background.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
          transform: `scale(${zoom}) translateY(${((0.5 - fcy) * 100).toFixed(1)}%)`,
          transformOrigin: "center",
          zIndex: 0,
        }} />
        {/* CSS animation for bubbles and monitor work */}
        <style>{`
          @keyframes bubbleIn {
            from { opacity: 0; transform: translate(-50%, -80%); }
            to { opacity: 1; transform: translate(-50%, -100%); }
          }
          @keyframes cursorBlink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          @keyframes typeLine {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          @keyframes scanLine {
            0% { transform: translateY(-2px); }
            50% { transform: translateY(2px); }
            100% { transform: translateY(-2px); }
          }
          @keyframes searchPulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.7; }
          }
        `}</style>

        {renderEntries.map(([agentId, entry], i) => {
          const motion = getMotion(agentId, i);
          if (!motion) return null;
          const amb = ambientById.get(agentId);
          const charN = motion.charN;
          const anim = motion.moving ? WALK : ANIMS[entry.state];
          const css = spriteCSS(anim, motion.frameIdx, charN, sc);
          // CAL drag preview: while dragging a seat dot, this agent's sprite
          // follows the cursor live (same trick as ambient sprites) so it
          // lands exactly on the dot, not higher/lower after releasing.
          const dragAt = drag?.kind === "seat" && drag.index === motion.seatIndex && !motion.moving && !motion.walkingOut;
          const anchorX = dragAt ? drag.imgX : motion.ax;
          const anchorY = dragAt ? drag.imgY : motion.ay;
          const renderX = dragAt ? imgToC(anchorX, zoom, fcy) * cw - fw / 2 : motion.x;
          const seatCx = imgToC(anchorX, zoom, fcy) * cw;
          const seatCy = imgToC(anchorY, zoom, fcy) * ch;
          const walkCy = imgToC(background.floorY ?? FLOOR_Y_FRACTION, zoom, fcy) * ch;
          const floorY = motion.moving ? walkCy - fh : seatCy - fh;
          // Seated: crop to torso (legs hidden behind desk); head line for labels
          const seated = !motion.moving;
          const headY = seated ? floorY + fh * SEAT_CROP_TOP : floorY;
          // Exiting agents fade out as a whole (sprite + glow + labels)
          const fade = motion.walkingOut ? motion.opacity : 1;
          const rgb = RGB[entry.state];
          // Monitor glow anchored above the sprite (screen sits on the desk)
          const glowLeft = motion.moving ? seatCx - fw * 1.2 : renderX + fw / 2 - fw * (SCREEN_W_MULT / 2);
          const glowTop = floorY - fh * 0.85;
          return (
            <React.Fragment key={`agent-${agentId}`}>
              {/* Monitor screen glow (live agents only — ambient sitters have no screens) */}
              {!motion.moving && entry.sessionId !== "ambient" && (
                <div className="animate-pulse" style={{ animationDuration: "4s",
                  position: "absolute",
                  left: glowLeft,
                  top: glowTop,
                  width: fw * SCREEN_W_MULT,
                  height: fh * SCREEN_H_MULT,
                  background: `rgba(${rgb}, 0.28)`,
                  filter: "blur(10px)",
                  transition: "background 0.7s ease",
                  pointerEvents: "none",
                  zIndex: 1,
                  opacity: fade,
                }} />
              )}
              {/* Monitor work overlay — cursor + code lines */}
              {!motion.moving && entry.sessionId !== "ambient" && (entry.state === "editing" || entry.state === "running" || entry.state === "reading" || entry.state === "searching") && (
                <div style={{
                  position: "absolute",
                  left: glowLeft + fw * 0.3,
                  top: glowTop + fh * 0.15,
                  width: fw * SCREEN_W_MULT * 0.7,
                  height: fh * SCREEN_H_MULT * 0.7,
                  overflow: "hidden",
                  pointerEvents: "none",
                  zIndex: 2,
                  opacity: fade,
                }}>
                  {/* Code lines */}
                  <div style={{
                    fontFamily: "monospace",
                    fontSize: Math.max(5, Math.min(7, fw * 0.12)),
                    color: `rgba(${rgb}, 0.6)`,
                    lineHeight: 1.4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}>
                    {entry.state === "editing" && (
                      <>
                        <div style={{ animation: "typeLine 0.8s ease-out forwards", opacity: 0 }}>
                          <span style={{ color: "rgba(168,85,247,0.7)" }}>const</span>{' '}
                          <span style={{ color: "rgba(52,211,153,0.7)" }}>agent</span>{' '}
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>=</span>{' '}
                          <span style={{ color: "rgba(251,191,36,0.7)" }}>{'\"'}{entry.tool ?? '...'}{'\"'}</span>
                        </div>
                        <div style={{ animation: "typeLine 1.2s ease-out 0.3s forwards", opacity: 0 }}>
                          <span style={{ color: "rgba(168,85,247,0.7)" }}>async</span>{' '}
                          <span style={{ color: "rgba(56,189,248,0.7)" }}>function</span>{' '}
                          <span style={{ color: "rgba(52,211,153,0.7)" }}>run</span>
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>{'()'}</span>{' '}
                          <span style={{ color: "rgba(255,255,255,0.3)" }}>{'{'}</span>
                        </div>
                        <div style={{ animation: "typeLine 1.5s ease-out 0.6s forwards", opacity: 0 }}>
                          {'  '}
                          <span style={{ color: "rgba(168,85,247,0.7)" }}>await</span>{' '}
                          <span style={{ color: "rgba(52,211,153,0.7)" }}>edit</span>
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>{'('}</span>
                          <span style={{ color: "rgba(251,191,36,0.7)" }}>{entry.detail?.slice(0, 15) ?? '...'}</span>
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>{')'}</span>
                        </div>
                      </>
                    )}
                    {entry.state === "running" && (
                      <>
                        <div style={{ animation: "typeLine 0.5s ease-out forwards", opacity: 0 }}>
                          <span style={{ color: "rgba(52,211,153,0.7)" }}>$</span>{' '}
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>{entry.detail?.slice(0, 25) ?? 'running...'}</span>
                        </div>
                        <div style={{ animation: "pulse 1s infinite", color: "rgba(16,185,129,0.5)" }}>
                          {'>>'} processing...
                        </div>
                      </>
                    )}
                    {entry.state === "reading" && (
                      <>
                        <div style={{ animation: "typeLine 0.6s ease-out forwards", opacity: 0 }}>
                          <span style={{ color: "rgba(99,102,241,0.7)" }}>{'📄'}</span>{' '}
                          <span style={{ color: "rgba(255,255,255,0.5)" }}>{entry.detail?.slice(0, 20) ?? 'file...'}</span>
                        </div>
                        <div style={{ animation: "scanLine 2s infinite", color: "rgba(99,102,241,0.4)" }}>
                          scanning lines...
                        </div>
                      </>
                    )}
                    {entry.state === "searching" && (
                      <>
                        <div style={{ animation: "typeLine 0.4s ease-out forwards", opacity: 0 }}>
                          <span style={{ color: "rgba(167,139,250,0.7)" }}>{'🔍'}</span>{' '}
                          <span style={{ color: "rgba(255,255,255,0.5)" }}>{entry.detail?.slice(0, 20) ?? 'query...'}</span>
                        </div>
                        <div style={{ animation: "searchPulse 1.5s infinite", color: "rgba(167,139,250,0.4)" }}>
                          finding matches...
                        </div>
                      </>
                    )}
                  </div>
                  {/* Blinking cursor */}
                  <div style={{
                    position: "absolute",
                    bottom: "20%",
                    left: "10%",
                    width: Math.max(4, fw * 0.08),
                    height: Math.max(6, fw * 0.12),
                    background: `rgba(${rgb}, 0.8)`,
                    animation: "cursorBlink 1s infinite",
                  }} />
                </div>
              )}
              {/* Sprite (seated = torso clip, legs behind desk) */}
              <div
                onMouseDown={calMode && amb ? (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const k = Number(agentId.split("-").pop());
                  const def = ambientDefs[k];
                  if (def) setDrag({ kind: "amb", index: k, imgX: def.x, imgY: def.y });
                } : undefined}
                title={amb ? "Arrastra este personaje a su sitio (se guarda solo)" : undefined}
                style={{
                position: "absolute",
                left: renderX,
                top: headY,
                width: fw,
                height: seated ? fh * (1 - SEAT_CROP_TOP) : fh,
                overflow: seated ? "hidden" : undefined,
                transition: motion.moving ? undefined : "top 0.4s ease",
                pointerEvents: calMode && amb ? "auto" : "none",
                cursor: calMode && amb ? "grab" : undefined,
                zIndex: 3,
                opacity: fade,
              }}>
                <div style={{
                  width: fw,
                  height: fh,
                  transform: motion.facing === -1 ? "scaleX(-1)" : undefined,
                  ...css,
                }} />
              </div>
              {/* Speech bubble */}
              {showBubbles && !motion.moving && (entry.tool || entry.detail) && (
                <SpeechBubble
                  state={entry.state}
                  tool={entry.tool}
                  detail={entry.detail}
                  x={renderX}
                  y={headY}
                  fw={fw}
                  sc={sc}
                  opacity={fade}
                  icon={amb ? (amb.icon || null) : undefined}
                />
              )}
              {/* Name + state labels */}
              {!motion.moving && (
                <div style={{
                  position: "absolute",
                  left: renderX + fw / 2,
                  top: headY - Math.max(20, fw * 0.55),
                  transform: "translateX(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: Math.max(1, fw * 0.02),
                  pointerEvents: "none",
                  zIndex: 4,
                  opacity: fade,
                }}>
                  <div style={{
                    color: entry.role === "main" ? theme.colors.nameMain : theme.colors.nameSub,
                    background: theme.colors.panelBg,
                    fontSize: Math.max(6, Math.min(10, fw * 0.16)),
                    fontFamily: "monospace",
                    letterSpacing: "0.08em",
                    padding: `${Math.max(1, fw * 0.02)}px ${Math.max(2, fw * 0.07)}px`,
                    borderRadius: 3,
                    whiteSpace: "nowrap",
                  }}>
                    {agentLabel(entry.role, entry.agentType)}
                  </div>
                  <div style={{
                    color: theme.colors[`state${entry.state.charAt(0).toUpperCase() + entry.state.slice(1)}` as keyof typeof theme.colors] ?? `rgb(${rgb})`,
                    background: theme.colors.panelBg,
                    fontSize: Math.max(7, Math.min(12, fw * 0.19)),
                    fontFamily: "monospace",
                    letterSpacing: "0.05em",
                    padding: `${Math.max(1, fw * 0.03)}px ${Math.max(2, fw * 0.08)}px`,
                    borderRadius: 3,
                    whiteSpace: "nowrap",
                    transition: "color 0.5s ease",
                  }}>
                    {entry.state}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* ─── Calibration overlay (?cal=1): seat anchors + floor line ─── */}
        {calMode && (
          <div style={{ position: "absolute", inset: 0, zIndex: 40, pointerEvents: "none" }}>
            {/* Live sprite-scale + bg-zoom tuners */}
            <div style={{
              position: "absolute",
              left: 8,
              top: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              pointerEvents: "auto",
              fontFamily: "monospace",
              fontSize: 14,
              color: "#00ffff",
              background: "rgba(0,0,0,0.8)",
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid rgba(0,255,255,0.4)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => { const n = +Math.max(0.3, (calScale ?? background.spriteScale) - 0.05).toFixed(2); setCalScale(n); try { localStorage.setItem(`pixel-hq-scale4-${background.id}`, String(n)); } catch {} }}
                  style={{ cursor: "pointer", background: "none", border: "1px solid #00ffff", borderRadius: 3, color: "#00ffff", fontSize: 14, padding: "0 8px" }}>A−</button>
                <span>size {effScale.toFixed(2)}</span>
                <button onClick={() => { const n = +Math.min(2.0, (calScale ?? background.spriteScale) + 0.05).toFixed(2); setCalScale(n); try { localStorage.setItem(`pixel-hq-scale4-${background.id}`, String(n)); } catch {} }}
                  style={{ cursor: "pointer", background: "none", border: "1px solid #00ffff", borderRadius: 3, color: "#00ffff", fontSize: 14, padding: "0 8px" }}>A+</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => { const n = +(Math.max(1.0, (calZoom ?? background.zoom) - 0.02)).toFixed(2); setCalZoom(n); try { localStorage.setItem(`pixel-hq-zoom4-${background.id}`, String(n)); } catch {} }}
                  style={{ cursor: "pointer", background: "none", border: "1px solid #00ffff", borderRadius: 3, color: "#00ffff", fontSize: 14, padding: "0 8px" }}>Z−</button>
                <span>zoom {zoom.toFixed(2)}</span>
                <button onClick={() => { const n = +(Math.min(1.6, (calZoom ?? background.zoom) + 0.02)).toFixed(2); setCalZoom(n); try { localStorage.setItem(`pixel-hq-zoom4-${background.id}`, String(n)); } catch {} }}
                  style={{ cursor: "pointer", background: "none", border: "1px solid #00ffff", borderRadius: 3, color: "#00ffff", fontSize: 14, padding: "0 8px" }}>Z+</button>
              </div>
              <button onClick={() => {
                setCalScale(null); setCalZoom(null); setCalClick(null);
                setSeatOverrides({}); setAmbOverrides({}); setDrag(null);
                try {
                  localStorage.removeItem(`pixel-hq-seats2-${background.id}`);
                  localStorage.removeItem(`pixel-hq-amb2-${background.id}`);
                  localStorage.removeItem(`pixel-hq-zoom-${background.id}`);
                  localStorage.removeItem(`pixel-hq-scale-${background.id}`);
                  localStorage.removeItem(`pixel-hq-zoom4-${background.id}`);
                  localStorage.removeItem(`pixel-hq-scale4-${background.id}`);
                  localStorage.removeItem(`pixel-hq-zoom3-${background.id}`);
                  localStorage.removeItem(`pixel-hq-scale3-${background.id}`);
                  localStorage.removeItem(`pixel-hq-zoom2-${background.id}`);
                  localStorage.removeItem(`pixel-hq-scale2-${background.id}`);
                } catch {}
              }}
                title="Volver a los valores del archivo (los agentes caminan de vuelta)"
                style={{ cursor: "pointer", background: "none", border: "1px solid #00ffff", borderRadius: 3, color: "#00ffff", fontSize: 14, padding: "2px 8px" }}>↺ Restaurar</button>
              {(Object.keys(seatOverrides).length > 0 || Object.keys(ambOverrides).length > 0 || calZoom !== null || calScale !== null) && (
                <pre title="Mándame este texto y grabo las posiciones en el archivo"
                  style={{ margin: 0, fontSize: 10, color: "#7dffce", whiteSpace: "pre-wrap", maxWidth: 230 }}>
                  {JSON.stringify({ bg: background.id, zoom: +zoom.toFixed(2), size: +effScale.toFixed(2), seats: seatOverrides, amb: ambOverrides })}
                </pre>
              )}
            </div>
            {/* Floor line */}
            <div style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: imgToC(background.floorY ?? FLOOR_Y_FRACTION, zoom, fcy) * ch,
              borderTop: "2px dashed rgba(255,0,0,0.8)",
            }} />
            {effSeats.map((seat, i) => {
              const sx = drag?.kind === "seat" && drag.index === i ? drag.imgX : seat.x;
              const sy = drag?.kind === "seat" && drag.index === i ? drag.imgY : seat.y;
              const cx = imgToC(sx, zoom, fcy) * cw;
              const cy = imgToC(sy, zoom, fcy) * ch;
              return (
                <div key={`cal-seat-${i}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setDrag({ kind: "seat", index: i, imgX: seat.x, imgY: seat.y });
                  }}
                  title={`Arrastra el asiento #${i} hasta su silla (se guarda solo)`}
                  style={{
                    position: "absolute",
                    left: cx,
                    top: cy,
                    transform: "translate(-50%, -50%)",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "rgba(255,0,0,0.8)",
                    boxShadow: "0 0 0 1px #fff",
                    cursor: "grab",
                    pointerEvents: "auto",
                  }}>
                  <div style={{
                    position: "absolute",
                    left: 6,
                    top: 6,
                    fontFamily: "monospace",
                    fontSize: 15,
                    color: "#ff4444",
                    background: "rgba(0,0,0,0.7)",
                    padding: "0 4px",
                    whiteSpace: "nowrap",
                  }}>
                    #{i} ({Math.round(sx * 100)}%, {Math.round(sy * 100)}%)
                  </div>
                </div>
              );
            })}
            {/* Click measurement readout */}
            {calClick && (
              <>
                <div style={{
                  position: "absolute",
                  left: imgToC(calClick.imgX, zoom, fcy) * cw,
                  top: imgToC(calClick.imgY, zoom, fcy) * ch,
                  transform: "translate(-50%, -50%)",
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(0,255,255,0.9)",
                  borderRadius: "50%",
                  boxShadow: "0 0 0 1px #000",
                }} />
                <div style={{
                  position: "absolute",
                  left: 8,
                  bottom: 8,
                  fontFamily: "monospace",
                  fontSize: 16,
                  color: "#00ffff",
                  background: "rgba(0,0,0,0.8)",
                  padding: "4px 10px",
                  borderRadius: 4,
                  border: "1px solid rgba(0,255,255,0.4)",
                }}>
                  click → x={calClick.imgX.toFixed(3)} y={calClick.imgY.toFixed(3)}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
