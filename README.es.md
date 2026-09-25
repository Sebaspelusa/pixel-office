# Pixel Office

Visualización en vivo de tus agentes de IA de **OpenCode** como app de escritorio. Mira cómo tus agentes caminan a sus escritorios, leen, editan, ejecutan comandos y piensan — en tiempo real, estilo retro.

> Basado originalmente en [Pixel Agents](https://github.com/pablodelucca/pixel-agents) de **Vasyl Pavlyuchok** · [vasylpavlyuchok.com](https://vasylpavlyuchok.com)
> Sprites de [pablodelucca](https://github.com/pablodelucca/pixel-agents) (MIT)

---

![Vista previa de Pixel Office](public/pixel-agents-office-v2.webp)

## Qué hace

- Lee la base SQLite de OpenCode (`~/.local/share/opencode/opencode.db`) en tiempo real
- Renderiza agentes animados en pixel art que reaccionan a lo que hace cada agente: leyendo, editando, ejecutando comandos, pensando, creando sub-agentes
- Multi-agente: cada agente activo tiene su propio personaje con identidad estable (sin fantasmas)
- **6 temas de oficina** (generados con IA): Retro Cubicles, Retro Office, Cozy Café, Corporate, Startup, Original Desk — cada uno con asientos, escala y suelo calibrados
- **Panel de elenco** (👥): prende/apaga personajes ambiente por puesto, cambia su dibujo (P0–P9), modo deambular, modo solo-trabajadores
- **Modo CAL** (📐): arrastra asientos y personajes a los muebles, ajusta zoom/tamaño en vivo, restaura valores
- Reloj día/noche, registro de eventos, contador de tokens, toggle de broadcast público
- Vista opcional del **edificio** multi-planta (🏢): terraza, estudio, servidores, reuniones, lobby y café

## Requisitos

- Node.js 20+ y npm
- OpenCode corriendo en la misma máquina (escribe la SQLite que lee esta app)
- Windows para compilar el `.exe` (el modo dev funciona en cualquier SO)

## Inicio rápido

```bash
npm install
npm run dev
```

Abre `http://localhost:3000/pixel-agents` — verás tus agentes en vivo.

Para compilar la app de escritorio:

```bash
npm run build:exe
```

El instalador queda en `dist/` (`Pixel Office Setup 1.0.0.exe`).

## Configuración

| Variable     | Default                                              | Para qué sirve                          |
| ------------ | ---------------------------------------------------- | --------------------------------------- |
| `OPENCODE_DB`| `~/.local/share/opencode/opencode.db` (home)         | Ruta a la base SQLite de OpenCode       |

Nada más que configurar — todo lo demás (tema, fondo, elenco, calibración) persiste en el `localStorage` del navegador/Electron.

## Cómo funciona

OpenCode guarda sesiones y actividad en una SQLite local. Un endpoint Server-Sent Events (`api/pixel-agents/agents-stream`) la consulta y emite eventos `snapshot` / `agent_update` / `agent_end` con IDs estables. El frontend (`AgentDataContext`) mantiene el estado; `DeskCanvas` renderiza la oficina en primer plano (los sprites entran, se sientan, trabajan, se desvanecen) y `OfficeCanvas` la vista general del edificio. Sin plugins ni hooks.

## Estructura del proyecto

```
src/app/
├── api/pixel-agents/
│   ├── agents-stream/route.ts   ← endpoint SSE (lee la SQLite de OpenCode)
│   └── broadcast/route.ts       ← toggle de visibilidad pública
└── pixel-agents/
    ├── AgentDataContext.tsx      ← cliente SSE + gestión de estado
    ├── BackgroundContext.tsx     ← selección de tema de oficina + persistencia
    ├── ThemeContext.tsx          ← temas de color
    ├── CastContext.tsx           ← selección de elenco ambiente (👥)
    ├── CastSelector.tsx          ← UI del panel de elenco
    ├── BackgroundSelector.tsx    ← UI de temas
    ├── ThemeSelector.tsx         ← UI de colores
    ├── DeskCanvas.tsx            ← oficina en primer plano (asientos, sprites, modo CAL)
    ├── OfficeCanvas.tsx          ← edificio multi-planta (zonas, deambular)
    ├── DayNightOverlay.tsx       ← reloj + tinte día/noche
    ├── EventLog.tsx              ← feed de actividad
    ├── TokenCounter.tsx          ← uso de tokens
    ├── office-backgrounds.ts     ← asientos / zoom / escala / ambiente por tema
    ├── layout.tsx
    └── page.tsx
electron/
└── main.js                       ← shell Electron (instancia única, loader)
```

## Créditos

- Concepto original + sprites pixel art: [pablodelucca/pixel-agents](https://github.com/pablodelucca/pixel-agents) (MIT)
- Fondos de oficina: generados con IA para este fork
- Construido con Next.js 16, Electron, Tailwind CSS, TypeScript

## Licencia

MIT © Vasyl Pavlyuchok — ver [LICENSE](LICENSE) (avisos originales preservados).
Las modificaciones de este fork también se publican bajo MIT.
