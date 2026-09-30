// Office background definitions with seat positions for each background
// Seat positions are fractions (0-1) in IMAGE coordinates.
// DeskCanvas maps them to container coords accounting for zoom crop.

import type { MultiAgentState } from "./AgentDataContext";

export interface AmbientSpot {
  x: number; // image fraction
  y: number; // image fraction (feet anchor)
  facing: 1 | -1;
  state: MultiAgentState;
  label: string; // name shown above (max ~10 chars)
  detail?: string; // speech bubble text (omit = no bubble)
  icon?: string; // bubble icon override ("" = no icon, omit = no icon for ambient)
  charN?: number; // sprite sheet override (omit = ambient cast 3-5 rotation)
}

export interface OfficeBackground {
  id: string;
  name: string;
  image: string;
  perspective: "frontal" | "isometric" | "topdown";
  // Desk/seat positions where agents sit (fraction of IMAGE width/height)
  // y = floor point where feet stand (chair base)
  seats: { x: number; y: number; facing: 1 | -1 }[];
  // Zoom applied to the background (crops baked-in checkerboard edges)
  zoom: number;
  // Vertical center of the zoomed crop (0.5 = centered). >0.5 shifts the
  // frame down so two-tier offices show the front tier big and the back
  // tier stays empty backdrop. Default 0.5 = previous centered behavior.
  focusY?: number;
  // Floor level in image coords (where walking agents' feet go)
  floorY: number;
  // Sprite size multiplier relative to the original desk background
  spriteScale: number;
  // Decorative sitters that live in this scene (cafés, bars...). They never
  // take agent seats and never walk: pure ambiance, zero tokens.
  ambient?: AmbientSpot[];
  // Image aspect ratio (width/height) — container matches it exactly
  aspectRatio: number;
}

const AR = 2912 / 1440; // all AI-generated offices

export const officeBackgrounds: OfficeBackground[] = [
  // ─── ORIGINAL DESK (the project's panoramic desk background) ──────────
  {
    id: "original-desk",
    name: "Original Desk",
    image: "/pixel-agents-desk-bg.webp",
    perspective: "frontal",
    aspectRatio: 2064 / 512,
    zoom: 1.0,
    floorY: 0.98,
    spriteScale: 1.0,
    seats: [
      { x: 0.079, y: 0.783, facing: -1 },
      { x: 0.251, y: 0.783, facing: -1 },
      { x: 0.421, y: 0.783, facing: 1 },
      { x: 0.585, y: 0.783, facing: 1 },
      { x: 0.750, y: 0.783, facing: -1 },
      { x: 0.913, y: 0.783, facing: -1 },
    ],
  },

  // ─── RETRO CUBICLES (wood paneling, CRT monitors, "HANG IN THERE") ─────
  {
    id: "retro-cubicles",
    name: "Retro Cubicles",
    image: "/offices/retro-cubicles.jpg",
    perspective: "frontal",
    aspectRatio: AR,
    zoom: 1.22,
    // Walk line with margin inside the panel (was at 98.8%, edge-cut)
    floorY: 0.86,
    spriteScale: 0.9,
    seats: [
      // Front row - 3 cubicles (chair wheel bases, corrected from annotated shots)
      { x: 0.68, y: 0.835, facing: -1 },
      { x: 0.535, y: 0.835, facing: 1 },
      { x: 0.865, y: 0.835, facing: 1 },
      // Back row + solo desk (overflow)
      { x: 0.245, y: 0.55, facing: 1 },
      { x: 0.57, y: 0.55, facing: -1 },
      { x: 0.66, y: 0.55, facing: 1 },
      { x: 0.83, y: 0.55, facing: -1 },
    ],
  },

  // ─── RETRO OFFICE ("SUCCESS", "TEAMWORK" posters) ─────────────────────
  {
    id: "retro-office",
    name: "Retro Office",
    image: "/offices/retro-office.jpg",
    perspective: "frontal",
    aspectRatio: AR,
    zoom: 1.30,
    // Walk line on-screen (was mapping below the panel)
    floorY: 0.79,
    spriteScale: 0.9,
    seats: [
      // 4 front cubicles (chair wheel bases)
      { x: 0.425, y: 0.78, facing: -1 },
      { x: 0.26, y: 0.78, facing: 1 },
      { x: 0.59, y: 0.78, facing: -1 },
      { x: 0.755, y: 0.78, facing: 1 },
      // Back cubicles (overflow)
      { x: 0.43, y: 0.46, facing: 1 },
      { x: 0.61, y: 0.46, facing: -1 },
    ],
  },

  // ─── COZY CAFÉ (isometric, coffee machine, bookshelves) ───────────────
  {
    id: "cozy-cafe",
    name: "Cozy Café",
    image: "/offices/cozy-cafe.jpg",
    perspective: "isometric",
    aspectRatio: AR,
    zoom: 1.30,
    // Walk line must stay on-screen: at zoom 1.30, floorY 0.90 maps to 102%
    // (walkers crossed below the panel, invisible). 0.79 maps to ~88%.
    floorY: 0.79,
    spriteScale: 0.8,
    seats: [
      // Café chairs by the round tables (left side)
      { x: 0.185, y: 0.60, facing: -1 },
      // NOTE: x must stay >= 0.14 — at zoom 1.30 anything left of 0.115
      // renders off-screen (this seat used to swallow agents whole)
      { x: 0.141, y: 0.69, facing: 1 },
      { x: 0.205, y: 0.70, facing: -1 },
      { x: 0.435, y: 0.80, facing: 1 },
      // Reading corner armchairs (right side)
      { x: 0.59, y: 0.80, facing: -1 },
      { x: 0.70, y: 0.88, facing: 1 },
    ],
    ambient: [
      // Reading corner crew (user-placed via CAL drag)
      { x: 0.864, y: 0.641, facing: 1, state: "idle", label: "regular", detail: "☕ espresso", icon: "" },
      { x: 0.78, y: 0.57, facing: -1, state: "idle", label: "regular", detail: "☕ latte", icon: "" },
      { x: 0.62, y: 0.744, facing: 1, state: "reading", label: "reader", detail: "mystery novel", icon: "📖" },
      // More crowd: guest at the window table + browser at the shelves
      { x: 0.13, y: 0.62, facing: 1, state: "idle", label: "guest" },
      { x: 0.72, y: 0.70, facing: 1, state: "idle", label: "browser" },
    ],
  },

  // ─── CORPORATE EXECUTIVE (isometric, executive desk, leather chairs) ──
  {
    id: "corporate-exec",
    name: "Corporate",
    image: "/offices/corporate-exec.jpg",
    perspective: "isometric",
    aspectRatio: AR,
    zoom: 1.55,
    // Walk line on-screen (0.88 mapped to 109%, invisible before)
    floorY: 0.75,
    spriteScale: 0.9,
    seats: [
      // Behind the executive desk (leather chair)
      { x: 0.615, y: 0.52, facing: -1 },
      // Guest chairs (nudged onto chair centers from annotated shot)
      { x: 0.39, y: 0.74, facing: 1 },
      { x: 0.50, y: 0.80, facing: -1 },
    ],
  },

  // ─── STARTUP COWORKING (top-down, desks, bean bags, whiteboard) ──────
  {
    id: "startup-cowork",
    name: "Startup",
    image: "/offices/startup-cowork.jpg",
    perspective: "topdown",
    aspectRatio: AR,
    zoom: 1.22,
    // Walk line with margin inside the panel (was at 98.8%, edge-cut)
    floorY: 0.86,
    spriteScale: 0.7,
    seats: [
      // Top desk clusters (chairs face the desks)
      { x: 0.135, y: 0.40, facing: 1 },
      { x: 0.275, y: 0.40, facing: -1 },
      { x: 0.345, y: 0.40, facing: 1 },
      { x: 0.475, y: 0.40, facing: -1 },
      // Bottom-left long desk (front side chairs)
      { x: 0.175, y: 0.80, facing: 1 },
      { x: 0.275, y: 0.80, facing: -1 },
      { x: 0.395, y: 0.80, facing: 1 },
    ],
    ambient: [
      // Lounge: sunk into the beanbags (user-placed via CAL drag)
      { x: 0.786, y: 0.582, facing: 1, state: "idle", label: "dev", detail: "deploy hoy?", icon: "💬" },
      { x: 0.894, y: 0.67, facing: -1, state: "idle", label: "dev" },
      { x: 0.884, y: 0.541, facing: -1, state: "idle", label: "founder", detail: "☕", icon: "" },
      // Extra lounge crowd (drag into place with CAL, toggleable in cast panel)
      { x: 0.745, y: 0.60, facing: 1, state: "idle", label: "intern" },
      { x: 0.80, y: 0.72, facing: -1, state: "idle", label: "cto", detail: "ship it", icon: "" },
      // More crowd: trainee on the rug + pm grabbing coffee top-right
      { x: 0.70, y: 0.72, facing: 1, state: "idle", label: "trainee" },
      { x: 0.65, y: 0.44, facing: -1, state: "idle", label: "pm", detail: "☕", icon: "" },
    ],
  },

  // ─── MEETING ROOM (retro wood, blinds, laptops, rug) ───────────────────
  {
    id: "meeting-room",
    name: "Meeting Room",
    image: "/offices/meeting-room.jpg",
    perspective: "frontal",
    aspectRatio: AR,
    zoom: 1.22,
    floorY: 0.90,
    spriteScale: 0.9,
    seats: [
      // Side chairs (face the table)
      { x: 0.16, y: 0.83, facing: 1 },
      { x: 0.70, y: 0.83, facing: -1 },
      // Back row (behind the table)
      { x: 0.29, y: 0.64, facing: 1 },
      { x: 0.455, y: 0.64, facing: -1 },
      // Front row (backs to camera)
      { x: 0.365, y: 0.90, facing: 1 },
      { x: 0.555, y: 0.90, facing: -1 },
    ],
  },
];

export function getOfficeBackground(id: string): OfficeBackground {
  return officeBackgrounds.find(b => b.id === id) ?? officeBackgrounds[0];
}
