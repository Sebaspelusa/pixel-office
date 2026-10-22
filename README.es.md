<div align="center">

# 🏢 Pixel Office

**Mira a tus agentes de IA programando en vivo, como personajes pixel-art en una oficina retro.**

*Caminan hasta sus escritorios, leen archivos, editan código, ejecutan comandos, piensan — todo en tiempo real, estilo juego retro.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Electron](https://img.shields.io/badge/Electron-36-blue)](https://www.electronjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)

[English](README.md) · [Español](README.es.md)

</div>

---

![Pixel Office — agentes trabajando en la oficina de cubículos retro](docs/media/office-demo.gif)

*Arriba: 5 agentes trabajando en la oficina Retro Cubicles. Cada burbuja muestra lo que ese agente está haciendo (`Read`, `Edit`, `Bash`, `Grep`, `Task`).*

---

## ¿Qué es esto?

Pixel Office es una **app de escritorio** que convierte a tus agentes de IA en programación en personajes pixel-art animados sentados en una oficina retro. Lee tu actividad de agentes localmente y la muestra como una escena viva: los personajes caminan hasta sus escritorios, se sientan, escriben en sus monitores, ejecutan comandos, buscan código y piensan — todo en tiempo real.

Funciona con **OpenCode** (lee la base de datos SQLite) y **Claude Code** (lee archivos JSONL de sesiones). Ambos pueden correr al mismo tiempo, cada uno con su propio agente principal.

**Sin plugins. Sin hooks. Sin que tus datos salgan de tu máquina.** Solo lee archivos locales.

## Temas

Siete temas de oficina, cada uno calibrado a mano (sillas, escala, línea de piso, personajes ambientales):

| Tema | Vista previa |
|------|-------------|
| **Original Desk** | ![Original Desk](docs/screenshots/original-desk.jpg) |
| **Retro Cubicles** | ![Retro Cubicles](docs/screenshots/retro-cubicles.jpg) |
| **Retro Office** | ![Retro Office](docs/screenshots/retro-office.jpg) |
| **Cozy Café** | ![Cozy Café](docs/screenshots/cozy-cafe.jpg) |
| **Corporate Exec** | ![Corporate Exec](docs/screenshots/corporate-exec.jpg) |
| **Startup Cowork** | ![Startup Cowork](docs/screenshots/startup-cowork.jpg) |
| **Meeting Room** | ![Meeting Room](docs/screenshots/meeting-room.jpg) |

## Características

- **Agentes en vivo** — cada agente activo tiene su propio personaje con identidad estable (sin fantasmas, sin duplicados)
- **Animación en tiempo real** — los personajes caminan hasta sus escritorios, se sientan, escriben, ejecutan comandos, buscan, piensan y generan sub-agentes
- **Fuente dual** — lee OpenCode (SQLite) y Claude Code (JSONL) simultáneamente; las fuentes ausentes simplemente se ignoran
- **Burbujas de voz** — cada agente muestra lo que está haciendo (herramienta + archivo/comando)
- **7 temas de oficina** — fondos generados con IA y calibrados a mano (sillas, escala, línea de piso)
- **Panel de elenco** (👥) — activa/desactiva personajes ambientales por posición, elige su apariencia (P0–P9), modo deambulación, modo solo trabajadores
- **Modo calibración** (📐) — arrastra sillas y personajes sobre los muebles, ajusta zoom/tamaño en vivo, restaura valores por defecto
- **Reloj día/noche** — tinte superpuesto que sigue la hora de tu sistema
- **Registro de eventos + contador de tokens** — ve la actividad de los agentes y el costo estimado
- **Vista de edificio** (🏢) — vista general opcional de varios pisos: terraza, estudio, servidores, sala de juntas, lobby, café
- **Modo limpio** (`?clean=1`) — solo la oficina, sin paneles (perfecto para capturas de pantalla y fondos de escritorio)

## Instalación

### Opción A: Descargar el instalador (Windows)

1. Ve a [Releases](../../releases)
2. Descarga `Pixel Office Setup 1.0.0.exe`
3. Ejecútalo y sigue el instalador

> **Nota:** Windows SmartScreen puede mostrar "App no reconocida" porque la app no está firmada con certificado de firma de código (cuesta $100+/año). Haz clic en **Más información → Ejecutar de todos modos**. No es un virus — es solo una app indie sin firmar.

### Opción B: Compilar desde el código fuente

```bash
git clone https://github.com/Sebaspelusa/pixel-office.git
cd pixel-office
npm install
npm run build:exe
```

El instalador queda en `dist/` (`Pixel Office Setup 1.0.0.exe`).

### Opción C: Ejecutar en modo desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:3000/pixel-agents` — verás tus agentes en vivo.

## Uso

1. **Abre la app** — empieza a leer la actividad de tus agentes inmediatamente
2. **Cambia de tema** — haz clic en el selector de temas (arriba a la derecha) para elegir tu oficina
3. **Activa el elenco** — haz clic en 👥 para mostrar/ocultar personajes ambientales
4. **Calibra** — haz clic en 📐 para entrar en modo calibración (arrastra sillas, ajusta zoom)
5. **Vista de edificio** — haz clic en 🏢 para mostrar la vista general de varios pisos
6. **Burbujas** — haz clic en 💬 para mostrar/ocultar burbujas de voz

### Banderas de URL

| Bandera | Qué hace |
|---------|---------|
| `?bg=<id-tema>` | Abre un tema específico (ej: `?bg=cozy-cafe`) |
| `?demo=1` | Modo demo (agentes sintéticos, sin datos reales) |
| `?clean=1` | Solo la oficina, sin paneles (capturas/fondos) |
| `?cal=1` | Modo calibración al cargar |

IDs de tema: `original-desk`, `retro-cubicles`, `retro-office`, `cozy-cafe`, `corporate-exec`, `startup-cowork`, `meeting-room`

### Puerto

La app de escritorio no pelea por puertos: prueba `3014`, `3015`, `3016`, `3017`, `3018` y solo cae en `3000` si todos están ocupados. El puerto activo aparece en el título de la ventana — útil cuando otro servidor de desarrollo ya tiene el 3000.

Si el servidor arranca tarde (puerto ocupado al abrir), la app sigue reintentando y carga la página real en vez de quedarse pegada en la pantalla de error.

`npm run dev` (Opción C) sigue usando el `3000` por defecto de Next.js.

## Configuración

| Variable de entorno | Por defecto | Qué hace |
|---------------------|-------------|---------|
| `OPENCODE_DB` | `~/.local/share/opencode/opencode.db` | Ruta a la base de datos SQLite de OpenCode |
| `CLAUDE_DIR` | `~/.claude/projects` | Ruta a los archivos de sesión de Claude Code |

No se necesita ninguna otra configuración — todo lo demás (tema, fondo, elenco, calibración) se guarda en `localStorage`.

## Privacidad

**Pixel Office lee archivos locales. No envía datos a ningún lugar.**

- Lee `~/.local/share/opencode/opencode.db` (actividad de OpenCode)
- Lee `~/.claude/projects/*/*.jsonl` (sesiones de Claude Code)
- Escucha solo en `127.0.0.1` (sin acceso a red externa)
- Sin telemetría, sin analíticas, sin nube

El instalador contiene **cero datos personales** — es solo el código de la app, los sprites y los fondos.

## Cómo funciona

OpenCode guarda sesiones y actividad de herramientas en una base de datos SQLite local. Claude Code escribe archivos JSONL de sesiones. Un endpoint de Server-Sent Events (`api/pixel-agents/agents-stream`) consulta ambas fuentes cada 600ms y emite eventos `snapshot` / `agent_update` / `agent_end` con IDs de agente estables (`main` para OpenCode, `claude-main` para Claude).

El frontend (`AgentDataContext`) mantiene el estado de los agentes. `DeskCanvas` renderiza la oficina de cerca (los sprites caminan, se sientan, trabajan, se desvanecen). `OfficeCanvas` renderiza la vista del edificio. No se necesitan plugins ni hooks.

## Estructura del proyecto

```
src/app/
├── api/pixel-agents/
│   ├── agents-stream/route.ts   ← Endpoint SSE (consulta SQLite de OpenCode + JSONL de Claude)
│   └── broadcast/route.ts       ← Toggle de visibilidad pública
└── pixel-agents/
    ├── AgentDataContext.tsx      ← Cliente SSE + gestión de estado
    ├── BackgroundContext.tsx     ← Selección de tema de oficina + persistencia
    ├── ThemeContext.tsx          ← Temas de color
    ├── CastContext.tsx           ← Selección de elenco ambiental (👥)
    ├── CastSelector.tsx          ← UI del panel de elenco
    ├── BackgroundSelector.tsx    ← UI del selector de temas
    ├── ThemeSelector.tsx         ← UI del selector de temas
    ├── DeskCanvas.tsx            ← Oficina de cerca (sillas, sprites, modo CAL)
    ├── OfficeCanvas.tsx          ← Edificio de varios pisos (zonas, deambulación)
    ├── DayNightOverlay.tsx       ← Reloj + tinte día/noche
    ├── EventLog.tsx              ← Feed de actividad de agentes
    ├── TokenCounter.tsx          ← Uso de tokens
    ├── office-backgrounds.ts     ← Sillas/zoom/escala/ambiente por tema
    ├── layout.tsx
    └── page.tsx
electron/
└── main.js                       ← Shell de Electron (instancia única, loader)
scripts/
├── prune-standalone.js           ← Helper de build (elimina archivos Next.js innecesarios)
└── demo-agents.mjs               ← Generador de datos falsos (para demos/ capturas)
```

## Créditos

- Concepto original + sprites pixel-art: [pablodelucca/pixel-agents](https://github.com/pablodelucca/pixel-agents) (MIT)
- Fondos de oficina: generados con IA para este fork
- Hecho con [Next.js 16](https://nextjs.org), [Electron 36](https://www.electronjs.org), [Tailwind CSS 4](https://tailwindcss.com), [TypeScript 5](https://www.typescriptlang.org)

## Licencia

MIT © Vasyl Pavlyuchok — ver [LICENSE](LICENSE) (avisos originales preservados).

Las modificaciones en este fork también se publican bajo MIT.

---

<div align="center">

Hecho con 💜 por [Sebaspelusa](https://github.com/Sebaspelusa)

</div>
