# Pixel Office

A live pixel-art visualization of your **OpenCode** AI agents, as a desktop app. Watch your agents walk to their desks, read, edit, run commands and think — in real time, retro-game style.

> Originally based on [Pixel Agents](https://github.com/pablodelucca/pixel-agents) by **Vasyl Pavlyuchok** · [vasylpavlyuchok.com](https://vasylpavlyuchok.com)
> Sprites by [pablodelucca](https://github.com/pablodelucca/pixel-agents) (MIT)

---

![Pixel Office preview](public/pixel-agents-office-v2.webp)

## What it does

- Polls the OpenCode SQLite database (`~/.local/share/opencode/opencode.db`) in real time
- Renders animated pixel-art agents that react to what each agent is doing: reading, editing, running commands, thinking, spawning sub-agents
- Multi-agent support: every active agent gets its own character with a stable identity (no ghosts)
- **6 office themes** (AI-generated): Retro Cubicles, Retro Office, Cozy Café, Corporate, Startup, Original Desk — each with its own seats, scale and floor calibration
- **Cast panel** (👥): toggle ambient characters per spot, pick their look (P0–P9), wander mode, workers-only mode
- **CAL mode** (📐): drag seats and characters onto furniture, tune zoom/size live, restore defaults
- Day/night clock overlay, event log, token usage counter, public broadcast toggle
- Optional multi-floor **building view** (🏢) with terrace, studio, servers, meeting room, lobby and café

## Requirements

- Node.js 20+ and npm
- OpenCode running on the same machine (it writes the SQLite DB this app reads)
- Windows for the `.exe` build (dev mode works anywhere)

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000/pixel-agents` — you'll see your agents live.

To build the desktop app:

```bash
npm run build:exe
```

The installer lands in `dist/` (`Pixel Office Setup 1.0.0.exe`).

## Configuration

| Env var      | Default                                              | What it does                          |
| ------------ | ---------------------------------------------------- | ------------------------------------- |
| `OPENCODE_DB`| `~/.local/share/opencode/opencode.db` (home dir)     | Path to the OpenCode SQLite database  |

No other setup needed — everything else (theme, background, cast, calibration) persists in the browser/Electron `localStorage`.

## How it works

OpenCode stores sessions and tool activity in a local SQLite database. A Server-Sent Events endpoint (`api/pixel-agents/agents-stream`) polls that DB and emits `snapshot` / `agent_update` / `agent_end` events with stable agent IDs. The frontend (`AgentDataContext`) keeps agent state; `DeskCanvas` renders the close-up office (sprites walk in, sit, work, fade out) and `OfficeCanvas` renders the building overview. No plugins or hooks required.

## Project structure

```
src/app/
├── api/pixel-agents/
│   ├── agents-stream/route.ts   ← SSE endpoint (polls OpenCode SQLite)
│   └── broadcast/route.ts       ← public visibility toggle
└── pixel-agents/
    ├── AgentDataContext.tsx      ← SSE client + state management
    ├── BackgroundContext.tsx     ← office theme selection + persistence
    ├── ThemeContext.tsx          ← color themes
    ├── CastContext.tsx           ← ambient cast selection (👥)
    ├── CastSelector.tsx          ← cast panel UI
    ├── BackgroundSelector.tsx    ← theme picker UI
    ├── ThemeSelector.tsx         ← theme picker UI
    ├── DeskCanvas.tsx            ← close-up office (seats, sprites, CAL mode)
    ├── OfficeCanvas.tsx          ← multi-floor building (zones, wander)
    ├── DayNightOverlay.tsx       ← clock + day/night tint
    ├── EventLog.tsx              ← agent activity feed
    ├── TokenCounter.tsx          ← token usage
    ├── office-backgrounds.ts     ← per-theme seats / zoom / scale / ambient
    ├── layout.tsx
    └── page.tsx
electron/
└── main.js                       ← Electron shell (single instance, loader)
```

## Credits

- Original concept + pixel art sprites: [pablodelucca/pixel-agents](https://github.com/pablodelucca/pixel-agents) (MIT)
- Office backgrounds: AI-generated for this fork
- Built with Next.js 16, Electron, Tailwind CSS, TypeScript

## License

MIT © Vasyl Pavlyuchok — see [LICENSE](LICENSE) (original notices preserved).
Modifications in this fork are also released under MIT.
