"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAgentData } from "./AgentDataContext";
import { useCast } from "./CastContext";
import type { MultiAgentState } from "./AgentDataContext";

// ─── Static config ─────────────────────────────────────────────────────────────
export const STATE_TO_ZONE: Record<MultiAgentState, string> = {
  editing:   "studio",
  reading:   "studio",
  searching: "studio",
  thinking:  "meeting",
  waiting:   "terrace",
  running:   "servers",
  idle:      "sofa",    // lobby sofás — descanso
  spawning:  "cafe",    // barra cafetería — llegada
};

const POOL = { left: 0.397, top: 0.200, w: 0.247, h: 0.054 };

// Sprite size is proportional to canvas width — same as DeskCanvas.
// 1.2 multiplier (~1.5x vs before): terrace/studio figures read human-sized
// next to doors/railings; verified headroom in every zone (terrace/studio/
// servers/meeting/sofa/cafe) so enlarged sprites stay inside their rooms.
const SPRITE_W_FRAC = 16 / 1376 * 3.24 * 1.2; // ~3.9 scale at original 1376px width
const BG_RATIO = 768 / 1376;

interface Anim { row: number; frames: number[]; fps: number }
const ANIMS: Record<MultiAgentState, Anim> = {
  idle:      { row: 0, frames: [5, 6],       fps: 1 },
  thinking:  { row: 0, frames: [5, 6],       fps: 2 },
  reading:   { row: 0, frames: [5, 6],       fps: 2 },
  editing:   { row: 0, frames: [3, 4],       fps: 6 },
  running:   { row: 2, frames: [0, 1, 2, 1], fps: 6 },
  searching: { row: 1, frames: [0, 1, 2, 1], fps: 4 },
  waiting:   { row: 0, frames: [0, 1],       fps: 2 },
  spawning:  { row: 2, frames: [0, 1, 2, 1], fps: 6 },
};

const ZONE_LABELS = [
  { name: "Terrace",         left: "4%",    top: "4%",  color: "text-orange-400" },
  { name: "Studio",          left: "4%",    top: "29%", color: "text-amber-400" },
  { name: "Server Room",     left: "4%",    top: "54%", color: "text-blue-400" },
  { name: "Meeting Room",    left: "68.8%", top: "54%", color: "text-cyan-400" },
  { name: "Lobby",           left: "4%",    top: "78%", color: "text-violet-400" },
];


type MovePhase = "at-seat" | "walk-elev" | "in-elev" | "walk-seat";
interface AgentAnim {
  // All positions stored as fractions (0-1) so they survive window resize
  xFrac: number;       // left edge of sprite / canvasWidth
  topFrac: number;     // top edge of sprite / canvasHeight
  phase: MovePhase;
  targetXFrac: number; // target left / canvasWidth
  zone: string; facing: 1 | -1;
  frameIdx: number; charN: number; inPool: boolean;
  idleTicks: number;
}

function seatAnim(zone: string): { row: number; frames: number[] } {
  if (zone === "studio" || zone === "meeting") return { row: 2, frames: [3, 4] };
  return { row: 0, frames: [5, 6] };
}

// Stable per-agent look (0-5) derived from the id — same agent, same face
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h * 31 + id.charCodeAt(i)) >>> 0);
  return h;
}

const WALK_ANIM = { row: 0, frames: [0, 1, 2, 1] };

// ─── Ambient agents — always visible, purely decorative, zero tokens ──────────
// Office zones (studio/meeting/servers) show LIVE workers only — no ambient.
// Social zones (terrace/sofa/cafe) keep their ambient life; cafe has a
// chatting pair seated at the bar.
export const AMBIENT_AGENTS: [string, { state: MultiAgentState; role: string }][] = [
  ["amb_1",    { state: "waiting",   role: "ambient" }],  // terraza slot 0
  ["amb_2",    { state: "waiting",   role: "ambient" }],  // terraza slot 1
  ["amb_3",    { state: "waiting",   role: "ambient" }],  // terraza slot 2
  ["amb_4",    { state: "waiting",   role: "ambient" }],  // terraza slot 3
  ["amb_5",    { state: "waiting",   role: "ambient" }],  // terraza slot 4 (derecha)
  ["amb_6",    { state: "waiting",   role: "ambient" }],  // terraza slot 5 (derecha)
  ["amb_9",    { state: "idle",      role: "ambient" }],  // sofa lobby
  ["amb_10",   { state: "spawning",  role: "ambient" }],  // cafe bar
  ["amb_11",   { state: "spawning",  role: "ambient" }],  // cafe bar (charla)
  ["amb_12",   { state: "spawning",  role: "ambient" }],  // cafe bar (charla)
];

// ─── DEMO_MODE ─────────────────────────────────────────────────────────────────
const DEMO_MODE = false;

const DEMO_AGENTS: [string, { state: MultiAgentState; role: string }][] = [
  ["d1", { state: "editing",   role: "orchestrator" }],
  ["d2", { state: "idle",      role: "worker" }],
  ["d3", { state: "idle",      role: "worker" }],
  ["d4", { state: "running",   role: "worker" }],
  ["d5", { state: "thinking",  role: "worker" }],
  ["d6", { state: "waiting",   role: "worker" }],
  ["d7", { state: "spawning",  role: "worker" }],
];

// ─── Calibration initial values ────────────────────────────────────────────────
type SlotDef  = { x: number; y: number; facing: 1 | -1; seated?: boolean };
type LobbyZone = { key: string; label: string; left: number; top: number; w: number; h: number; seats: number; facing: 1 | -1; color: string; border: string };

const SLOTS_INIT: Record<string, SlotDef[]> = {
  studio:  [{ x: 0.505, y: 0.467, facing: 1 }, { x: 0.579, y: 0.469, facing: -1 }, { x: 0.652, y: 0.468, facing: 1 }, { x: 0.430, y: 0.467, facing: -1 }, { x: 0.355, y: 0.464, facing: 1 }],
  meeting: [{ x: 0.643, y: 0.710, facing: -1 }, { x: 0.731, y: 0.710, facing: 1 }, { x: 0.704, y: 0.710, facing: -1 }, { x: 0.676, y: 0.710, facing: 1 }],
  servers: [{ x: 0.574, y: 0.952, facing: 1 }, { x: 0.593, y: 0.954, facing: -1 }],
  terrace: [{ x: 0.280, y: 0.184, facing: 1 }, { x: 0.310, y: 0.184, facing: -1 }, { x: 0.340, y: 0.184, facing: 1 }, { x: 0.370, y: 0.184, facing: -1 }, { x: 0.692, y: 0.183, facing: 1 }, { x: 0.727, y: 0.183, facing: -1 }],
  pool:    [{ x: 0.46,  y: 0.254, facing: 1 }, { x: 0.52,  y: 0.254, facing: -1 }, { x: 0.58,  y: 0.254, facing: 1 }],
  sofa:    [{ x: 0.497, y: 0.950, facing: 1 }, { x: 0.482, y: 0.950, facing: -1 }],
};

// Derive zone slots from the bottom edge of lobby zone rectangles
function deriveZoneSlots(zones: LobbyZone[]): Record<string, SlotDef[]> {
  const acc: Record<string, SlotDef[]> = {};
  zones.forEach(z => {
    const y = z.top + z.h;
    const derived: SlotDef[] = Array.from({ length: z.seats }, (_, i) => ({
      x: z.left + z.w * (i + 1) / (z.seats + 1),
      y,
      facing: z.facing,
    }));
    acc[z.key] = [...(acc[z.key] ?? []), ...derived];
  });
  return acc;
}

const ZONE_TO_FLOOR: Record<string, string> = {
  studio:  "Studio",
  meeting: "Serv/Meeting",
  servers: "Serv/Meeting",
  terrace: "Terrace",   // walk at terrace ground (y=0.254 = pool bottom); sit at sun beds (y=0.183)
  pool:    "Terrace",   // walk to pool edge on terrace floor, then submerge
  sofa:    "Lobby",
  cafe:    "Lobby",
};

const ZONE_DOT_COLOR: Record<string, string> = {
  studio:  "rgba(245,158,11,0.95)",
  meeting: "rgba(34,211,238,0.95)",
  servers: "rgba(99,102,241,0.95)",
  terrace: "rgba(251,146,60,0.95)",
  sofa:    "rgba(167,139,250,0.95)",
  lobby:   "rgba(167,139,250,0.95)",
};

const FLOORS_INIT = [
  { label: "Sun Beds",          y: 0.184, color: "rgba(251,146,60,0.7)" },
  { label: "Pool",              y: 0.254, color: "rgba(34,211,238,0.7)" },
  { label: "Terrace",          y: 0.254, color: "rgba(251,146,60,0.4)" },
  { label: "Studio",           y: 0.498, color: "rgba(245,158,11,0.7)" },
  { label: "Serv/Meeting",     y: 0.740, color: "rgba(59,130,246,0.7)" },
  { label: "Lobby",            y: 0.980, color: "rgba(167,139,250,0.7)" },
];

const LOBBY_ZONES_INIT: LobbyZone[] = [
  { key: "cafe", label: "Café", left: 0.665, top: 0.923, w: 0.133, h: 0.059, seats: 3, facing: -1, color: "rgba(251,146,60,0.18)", border: "rgba(251,146,60,0.9)" },
];

// ─── OfficeCanvas ──────────────────────────────────────────────────────────────
// NOTE: this view always uses the original office map — its zone slots,
// elevator and labels are calibrated for it. Custom AI backgrounds apply
// to the DeskCanvas (close-up) view only, so scenes never look doubled.
export function OfficeCanvas() {
  const { agents } = useAgentData();
  const { officeHidden, officeChar, wander: wanderOn, workersOnly } = useCast();
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef     = useRef<HTMLDivElement>(null);
  const [cw, setCw]  = useState(0);
  const [tick, setTick] = useState(0);
  const animRef  = useRef<Map<string, AgentAnim>>(new Map());
  const stateRef = useRef({ cw: 0, elevX: 0.195, floors: FLOORS_INIT, slots: SLOTS_INIT, lobbyZones: LOBBY_ZONES_INIT, officeHidden: [] as string[], officeChar: {} as Record<string, number>, wander: false, workersOnly: false });

  // Calibration state
  const [floors,     setFloors]     = useState(FLOORS_INIT);
  const [elevX,      setElevX]      = useState(0.195);
  const [slots,      setSlots]      = useState(SLOTS_INIT);
  const [lobbyZones, setLobbyZones] = useState(LOBBY_ZONES_INIT);
  const [showVals,   setShowVals]   = useState(false);

  // Drag ref: { type, ...startData }
  const drag = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((e) => setCw(e[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Sync stateRef on every render so the interval can read fresh values
  stateRef.current = { cw, elevX, floors, slots, lobbyZones, officeHidden, officeChar, wander: wanderOn, workersOnly };

  useEffect(() => {
    const id = setInterval(() => {
      const { cw: W, elevX: EX, floors: FL, slots: SL, lobbyZones: LZ, officeHidden: OH, officeChar: OC, wander: WD, workersOnly: WO } = stateRef.current;
      if (W === 0) return;
      const H = W * BG_RATIO;
      const FW = Math.round(W * SPRITE_W_FRAC);
      const FH = FW * 2;
      const walkPx = W * 0.006;
      const list = DEMO_MODE ? DEMO_AGENTS : [...Array.from(agents.entries()), ...AMBIENT_AGENTS.filter(([aid]) => !WO && !OH.includes(aid))];
      const allS = { ...SL, ...deriveZoneSlots(LZ) };
      const zc = new Map<string, number>();

      list.forEach(([id, entry], gi) => {
        const isAmbient = id.startsWith("amb_");
        // Sheet per ambient: cast-panel pick wins, else fixed roster slot (1-5).
        // Live workers vary by id (0-5). No executives anywhere.
        const ambIdx = isAmbient ? AMBIENT_AGENTS.findIndex(([aid]) => aid === id) : -1;
        const ov = isAmbient ? OC[id] : undefined;
        const charN = isAmbient
          ? (ov !== undefined && ov >= 0 && ov <= 9 ? ov : 1 + ((ambIdx < 0 ? 0 : ambIdx) % 5))
          : (hashId(id) % 6);
        const desiredZone = id === "amb_pool" ? "pool" : (STATE_TO_ZONE[entry.state] ?? "sofa");
        const si = zc.get(desiredZone) ?? 0; zc.set(desiredZone, si + 1);
        const zSlots = allS[desiredZone] ?? allS.sofa;
        const slot = zSlots[Math.min(si, zSlots.length - 1)];
        const floorLabel = ZONE_TO_FLOOR[desiredZone];
        const floorY = FL.find(f => f.label === floorLabel)?.y ?? slot.y;
        const physSeat = desiredZone === "sofa" || desiredZone === "terrace" || desiredZone === "studio" || desiredZone === "pool";
        // All positions as fractions — immune to resize
        const FWf = FW / W; const FHf = FH / H;
        const walkTopFrac = floorY - FHf;
        const seatTopFrac = desiredZone === "pool"
          ? POOL.top - FHf / 3
          : physSeat ? slot.y - FHf : floorY - FHf;
        const destXFrac = slot.x - FWf / 2;
        const inPool = desiredZone === "pool" && slot.x >= POOL.left && slot.x <= POOL.left + POOL.w;
        const walkFrac = 0.0035; // calm stroll (was 0.006 scurry)

        let a = animRef.current.get(id);
        if (!a) {
          animRef.current.set(id, { xFrac: destXFrac, topFrac: seatTopFrac, phase: "at-seat",
            targetXFrac: destXFrac, zone: desiredZone, facing: slot.facing,
            frameIdx: 0, charN, inPool, idleTicks: 0 });
          return;
        }
        a.inPool = inPool; a.charN = charN;

        if (a.phase === "walk-elev" || a.phase === "walk-seat") {
          const effectiveWalk = a.inPool ? walkFrac * 0.4 : walkFrac;
          const dx = a.targetXFrac - a.xFrac;
          a.facing = dx >= 0 ? 1 : -1;
          if (Math.abs(dx) <= effectiveWalk) {
            a.xFrac = a.targetXFrac;
            if (a.phase === "walk-elev") {
              a.topFrac = walkTopFrac;  // y transition happens AT elevator, not before
              a.zone = desiredZone;
              a.phase = "walk-seat";
              a.targetXFrac = destXFrac;
            } else {
              a.phase = "at-seat";
              a.topFrac = seatTopFrac;
              a.facing = slot.facing;
            }
          } else {
            a.xFrac += Math.sign(dx) * effectiveWalk;
          }
          a.frameIdx = (a.frameIdx + 1) % 4;
        } else if (a.zone !== desiredZone) {
          // Zone changed: start elevator walk from CURRENT position (no y snap yet)
          a.phase = "walk-elev";
          a.targetXFrac = EX - FWf / 2;
        } else {
          // at-seat same zone: re-anchor and maybe wander
          a.xFrac = destXFrac;
          a.topFrac = seatTopFrac;
          const sa = seatAnim(a.zone);
          a.frameIdx = (a.frameIdx + 1) % sa.frames.length;
          a.idleTicks = (a.idleTicks ?? 0) + 1;
          const wanderThreshold = a.zone === "pool" ? 600 : 350;  // long seated stays
          // "Por ahí" toggle (cast panel): wander only when enabled
          const wanderProb      = WD ? (a.zone === "pool" ? 0.04 : 0.08) : 0;
          if (a.idleTicks >= wanderThreshold && Math.random() < wanderProb) {
            a.idleTicks = 0;
            const wanderSlots = allS[a.zone] ?? [];
            if (wanderSlots.length > 1) {
              const other = wanderSlots[Math.floor(Math.random() * wanderSlots.length)];
              const newXFrac = other.x - FWf / 2;
              if (Math.abs(newXFrac - a.xFrac) > FWf) {
                a.phase = "walk-seat";
                a.targetXFrac = newXFrac;
                a.topFrac = walkTopFrac;
              }
            }
          }
        }
      });
      setTick(t => t + 1);
    }, 150);
    return () => clearInterval(id);
  }, [agents]);

  // ── Drag helpers ─────────────────────────────────────────────────────────────
  function frac(e: React.MouseEvent) {
    const r = innerRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const { x, y } = frac(e);
    const d = drag.current;
    if (d.type === "floor") {
      setFloors(prev => prev.map((f, i) => i === d.i ? { ...f, y: Math.max(0, Math.min(1, y)) } : f));
    } else if (d.type === "elev") {
      setElevX(Math.max(0, Math.min(1, x)));
    } else if (d.type === "slot") {
      setSlots(prev => {
        const arr = [...prev[d.zone]];
        arr[d.i] = { ...arr[d.i], x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
        return { ...prev, [d.zone]: arr };
      });
    } else if (d.type === "lobby") {
      const dx = x - d.mx; const dy = y - d.my;
      setLobbyZones(prev => prev.map((z, i) => i === d.i
        ? { ...z, left: Math.max(0, d.left + dx), top: Math.max(0, d.top + dy) } : z));
    } else if (d.type === "lobby-rw") {
      const dx = x - d.mx;
      setLobbyZones(prev => prev.map((z, i) => i === d.i
        ? { ...z, w: Math.max(0.02, d.w + dx) } : z));
    } else if (d.type === "lobby-rh") {
      const dy = y - d.my;
      setLobbyZones(prev => prev.map((z, i) => i === d.i
        ? { ...z, h: Math.max(0.01, d.h + dy) } : z));
    }
  }

  function stopDrag() { drag.current = null; }

  // ── Positions — driven by animRef ─────────────────────────────────────────────
  const ch = cw * BG_RATIO;
  const agentList = DEMO_MODE ? DEMO_AGENTS : [...Array.from(agents.entries()), ...AMBIENT_AGENTS.filter(([aid]) => !workersOnly && !officeHidden.includes(aid))];
  const allSlots = { ...slots, ...deriveZoneSlots(lobbyZones) };

  type SpritePos = { agentId: string; charN: number; left: number; top: number; facing: 1|-1; col: number; animRow: number; inPool: boolean; zone: string; behindPool: boolean };
  const positions = agentList.map(([agentId]): SpritePos | null => {
    const a = animRef.current.get(agentId);
    if (!a || cw === 0) return null;
    const walking = a.phase === "walk-elev" || a.phase === "walk-seat";
    const sa = seatAnim(a.zone);
    const animRow = walking ? WALK_ANIM.row : sa.row;
    const animFrames = walking ? WALK_ANIM.frames : sa.frames;
    const col = animFrames[a.frameIdx % animFrames.length];
    // Convert fractions → pixels at render time (always correct after resize)
    const left = a.xFrac * cw;
    const top  = a.topFrac * (cw * BG_RATIO);
    const behindPool = a.zone === "terrace" && walking &&
      a.xFrac >= POOL.left && a.xFrac <= POOL.left + POOL.w;
    return { agentId, charN: a.charN, left, top,
             facing: a.facing, col, animRow, inPool: a.inPool, zone: a.zone, behindPool };
  }).filter((p): p is SpritePos => p !== null);

  // Sprite size scales with canvas width
  const FW = Math.round(cw * SPRITE_W_FRAC);
  const FH = FW * 2;

  // ── Values JSON ───────────────────────────────────────────────────────────────
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const valuesJson = JSON.stringify({
    FLOORS:      floors.map(f  => ({ label: f.label, y: r3(f.y) })),
    ELEVATOR_X:  r3(elevX),
    ZONE_SLOTS:  Object.fromEntries(Object.entries(slots).map(([k, v]) =>
      [k, v.map(s => ({ x: r3(s.x), y: r3(s.y), facing: s.facing }))])),
    LOBBY_ZONES: lobbyZones.map(z => ({ label: z.label, left: r3(z.left), top: r3(z.top), w: r3(z.w), h: r3(z.h) })),
  }, null, 2);

  return (
    <div ref={containerRef} className="relative w-full rounded overflow-hidden" style={{ paddingBottom: "55.81%", height: 0 }}>
      <div
        ref={innerRef}
        className="absolute inset-0"
        onMouseMove={DEMO_MODE ? onMouseMove : undefined}
        onMouseUp={DEMO_MODE ? stopDrag : undefined}
        onMouseLeave={DEMO_MODE ? stopDrag : undefined}
      >
        <img src="/pixel-agents-office-v2.webp" alt="Dubai pixel art office map"
          className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} draggable={false} />

        {ZONE_LABELS.map((z) => (
          <span key={z.name} className={`absolute font-mono tracking-wider uppercase bg-black/50 rounded ${z.color}`}
            style={{
              left: z.left, top: z.top,
              fontSize: Math.max(7, Math.min(10, cw * 0.0073)),
              padding: `${Math.max(1, cw * 0.0015)}px ${Math.max(2, cw * 0.003)}px`,
            }}>{z.name}</span>
        ))}

        {/* Sprites — char_N.png: 7 cols × 3 rows, frame 64×128, sheet 448×384 */}
        {positions.map(({ agentId, charN, left, top, facing, col, animRow, inPool, zone, behindPool }) => (
          <div key={agentId} style={{
            position: "absolute",
            left: left,
            top: top,
            width: FW,
            height: FH,
            imageRendering: "pixelated",
            backgroundImage: `url(/pixel-agents/char_${charN}.png)`,
            backgroundPosition: `-${col * FW}px -${animRow * FH}px`,
            backgroundSize: `${FW * 7}px ${FH * 3}px`,
            transform: facing === -1 ? "scaleX(-1)" : undefined,
            // pool swimmers behind water overlay; all walkers (incl. pool crossing) in front
            zIndex: (inPool || zone === "pool") ? 1 : 3,
            filter: undefined,
          }} />
        ))}

        {/* Pool water overlay */}
        <div style={{
          position: "absolute", left: `${POOL.left * 100}%`, top: `${POOL.top * 100}%`,
          width: `${POOL.w * 100}%`, height: `${POOL.h * 100}%`,
          background: "linear-gradient(180deg,rgba(14,165,233,0.38) 0%,rgba(6,182,212,0.28) 60%,rgba(8,145,178,0.18) 100%)",
          backdropFilter: "blur(1.5px)", zIndex: 2, pointerEvents: "none",
        }} />

        {DEMO_MODE && (<>
          {/* Floor lines — drag vertically */}
          {floors.map((f, i) => (
            <React.Fragment key={f.label}>
              <div style={{
                position: "absolute", left: 0, right: 0, top: `${f.y * 100}%`,
                height: 8, background: f.color, zIndex: 10, cursor: "ns-resize",
                transform: "translateY(-4px)",
              }} onMouseDown={(e) => { e.preventDefault(); drag.current = { type: "floor", i }; }} />
              <span style={{
                position: "absolute", left: "50%", top: `${f.y * 100}%`,
                transform: "translate(-50%,4px)", color: f.color, fontSize: 10,
                fontFamily: "monospace", background: "rgba(0,0,0,0.7)", padding: "1px 6px",
                borderRadius: 3, zIndex: 11, pointerEvents: "none", whiteSpace: "nowrap",
              }}>{f.label} — y={r3(f.y)}</span>
            </React.Fragment>
          ))}

          {/* Zone slot dots — drag freely */}
          {Object.entries(slots).map(([zone, zSlots]) =>
            zSlots.map((s, i) => (
              <div key={`${zone}-${i}`} style={{
                position: "absolute", left: `${s.x * 100}%`, top: `${s.y * 100}%`,
                width: 10, height: 10,
                background: ZONE_DOT_COLOR[zone] ?? "rgba(255,255,0,0.95)",
                borderRadius: "50%",
                transform: "translate(-50%,-50%)", zIndex: 12, cursor: "grab",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
              }} onMouseDown={(e) => { e.preventDefault(); drag.current = { type: "slot", zone, i }; }} />
            ))
          )}

          {/* Elevator line — drag horizontally */}
          <div style={{
            position: "absolute", left: `${elevX * 100}%`, top: 0, bottom: 0,
            width: 8, background: "rgba(255,100,100,0.8)", zIndex: 10, cursor: "ew-resize",
            transform: "translateX(-4px)",
          }} onMouseDown={(e) => { e.preventDefault(); drag.current = { type: "elev" }; }} />
          <span style={{
            position: "absolute", left: `${elevX * 100}%`, top: "45%", transform: "translateX(6px)",
            color: "rgba(255,100,100,0.9)", fontSize: 9, fontFamily: "monospace",
            background: "rgba(0,0,0,0.7)", padding: "1px 4px", borderRadius: 3,
            zIndex: 11, pointerEvents: "none",
          }}>ascensor x={r3(elevX)}</span>

          {/* Lobby sub-zone boxes — drag freely */}
          {lobbyZones.map((z, i) => (
            <React.Fragment key={z.label}>
              <div style={{
                position: "absolute", left: `${z.left * 100}%`, top: `${z.top * 100}%`,
                width: `${z.w * 100}%`, height: `${z.h * 100}%`,
                background: z.color, border: `1px solid ${z.border}`,
                zIndex: 12, cursor: "grab",
              }} onMouseDown={(e) => {
                e.preventDefault();
                const { x, y } = frac(e);
                drag.current = { type: "lobby", i, mx: x, my: y, left: z.left, top: z.top };
              }}>
                {/* Right edge — resize width */}
                <div style={{
                  position: "absolute", right: 0, top: 0, bottom: 0, width: 6,
                  cursor: "ew-resize", background: z.border, opacity: 0.7,
                }} onMouseDown={(e) => {
                  e.stopPropagation(); e.preventDefault();
                  const { x } = frac(e);
                  drag.current = { type: "lobby-rw", i, mx: x, w: z.w };
                }} />
                {/* Bottom edge — resize height */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: 6,
                  cursor: "ns-resize", background: z.border, opacity: 0.7,
                }} onMouseDown={(e) => {
                  e.stopPropagation(); e.preventDefault();
                  const { y } = frac(e);
                  drag.current = { type: "lobby-rh", i, my: y, h: z.h };
                }} />
              </div>
              <span style={{
                position: "absolute", left: `${z.left * 100}%`, top: `${z.top * 100}%`,
                transform: "translate(4px,3px)", color: z.border, fontSize: 9,
                fontFamily: "monospace", background: "rgba(0,0,0,0.7)",
                padding: "1px 4px", borderRadius: 3, zIndex: 13, pointerEvents: "none",
              }}>{z.label}</span>
              {/* Derived seat dots — bottom edge */}
              {Array.from({ length: z.seats }, (_, si) => {
                const sx = z.left + z.w * (si + 1) / (z.seats + 1);
                const sy = z.top + z.h;
                return (
                  <div key={si} style={{
                    position: "absolute", left: `${sx * 100}%`, top: `${sy * 100}%`,
                    width: 8, height: 8, background: z.border, borderRadius: "50%",
                    transform: "translate(-50%,-50%)", zIndex: 14, pointerEvents: "none",
                    boxShadow: "0 0 0 2px rgba(0,0,0,0.7)",
                  }} />
                );
              })}
            </React.Fragment>
          ))}

          {/* Values panel */}
          <div style={{ position: "absolute", top: 4, right: 4, zIndex: 20 }}>
            <button style={{
              background: "rgba(0,0,0,0.85)", color: "rgba(255,255,100,0.9)",
              border: "1px solid rgba(255,255,100,0.4)", borderRadius: 4,
              fontSize: 9, fontFamily: "monospace", padding: "2px 8px", cursor: "pointer",
            }} onClick={() => setShowVals(v => !v)}>
              {showVals ? "▲ valores" : "▼ valores"}
            </button>
            {showVals && (
              <pre style={{
                background: "rgba(0,0,0,0.92)", color: "rgba(180,255,130,0.9)",
                border: "1px solid rgba(180,255,130,0.3)", borderRadius: 4,
                fontSize: 8, fontFamily: "monospace", padding: "6px 8px",
                maxHeight: 280, overflowY: "auto", whiteSpace: "pre-wrap",
                maxWidth: 260, marginTop: 4,
              }}>{valuesJson}</pre>
            )}
          </div>
        </>)}
      </div>
    </div>
  );
}
