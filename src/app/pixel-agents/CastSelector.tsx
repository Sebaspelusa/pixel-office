"use client";

import React, { useState } from "react";
import { useTheme } from "./ThemeContext";
import { useBackground } from "./BackgroundContext";
import { useCast } from "./CastContext";
import { AMBIENT_AGENTS, STATE_TO_ZONE } from "./OfficeCanvas";

const ZONE_ES: Record<string, string> = {
  terrace: "Terraza",
  sofa: "Sofá",
  cafe: "Café",
  pool: "Pileta",
  studio: "Estudio",
  meeting: "Reunión",
  servers: "Servidores",
  lobby: "Lobby",
};

function Pill({ on, onClick, title }: { on: boolean; onClick: () => void; title?: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: on ? `${c.statusLive}33` : "transparent",
        border: `1px solid ${on ? c.statusLive : c.panelBorder}`,
        borderRadius: 4,
        padding: "1px 8px",
        color: on ? c.statusLive : c.textMuted,
        fontSize: 10,
        fontFamily: "monospace",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {on ? "ON" : "OFF"}
    </button>
  );
}

function CharPick({ n, onNext, title }: { n: number; onNext: () => void; title?: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <button
      onClick={onNext}
      title={title ?? "Cambiar dibujo (0-9)"}
      style={{
        background: "transparent",
        border: `1px solid ${c.panelBorder}`,
        borderRadius: 4,
        padding: "1px 6px",
        color: c.textSecondary,
        fontSize: 10,
        fontFamily: "monospace",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      P{n}
    </button>
  );
}

export function CastButton() {
  const { theme } = useTheme();
  const { background } = useBackground();
  const cast = useCast();
  const [open, setOpen] = useState(false);
  const c = theme.colors;

  const deskSpots = (background.ambient ?? []).map((a, k) => {
    const key = `${background.id}:${k}`;
    return {
      key,
      name: `${a.label} (${a.state})`,
      shown: cast.deskChar[key] ?? a.charN ?? (3 + (k % 3)),
      on: !cast.workersOnly && !cast.deskHidden.includes(key),
    };
  });

  const perZone: Record<string, number> = {};
  const roster = AMBIENT_AGENTS.map(([id, e], idx) => {
    const zone = STATE_TO_ZONE[e.state] ?? e.state;
    perZone[zone] = (perZone[zone] ?? 0) + 1;
    const stored = cast.officeChar[id];
    return {
      id,
      name: `${ZONE_ES[zone] ?? zone} ${perZone[zone]}`,
      shown: stored ?? (1 + (idx % 5)),
      on: !cast.workersOnly && !cast.officeHidden.includes(id),
    };
  });

  const sectionTitle: React.CSSProperties = {
    fontSize: 10,
    fontFamily: "monospace",
    color: c.textSecondary,
    margin: "8px 0 4px",
    letterSpacing: "0.05em",
  };
  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "2px 0",
    fontSize: 11,
    fontFamily: "monospace",
    color: c.textMuted,
  };

  return (
    <span style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Elegir personajes en escena"
        style={{
          background: open ? `${c.statusLive}33` : "transparent",
          border: `1px solid ${open ? c.statusLive : c.panelBorder}`,
          borderRadius: 4,
          padding: "2px 8px",
          color: open ? c.statusLive : c.textMuted,
          fontSize: 10,
          fontFamily: "monospace",
          cursor: "pointer",
        }}
      >
        👥 Elenco
      </button>
      {open && (
        <div style={{
          position: "absolute",
          right: 0,
          top: "calc(100% + 6px)",
          width: 250,
          maxHeight: 340,
          overflowY: "auto",
          background: c.panelBg,
          border: `1px solid ${c.panelBorder}`,
          borderRadius: 6,
          padding: "8px 12px 12px",
          zIndex: 50,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          <div style={{ ...rowStyle, borderBottom: `1px solid ${c.panelBorder}`, paddingBottom: 6 }}>
            <span style={{ color: c.textSecondary }}>Solo trabajadores</span>
            <Pill on={cast.workersOnly} onClick={() => cast.setWorkersOnly(!cast.workersOnly)} title="Oculta todo el ambiente" />
          </div>

          <div style={sectionTitle}>ESTE FONDO · {background.name.toUpperCase()}</div>
          {deskSpots.length === 0 && (
            <div style={rowStyle}>Sin ambiente (solo trabajan)</div>
          )}
          {deskSpots.map((s) => (
            <div key={s.key} style={rowStyle}>
              <span style={{ flex: 1 }}>{s.name}</span>
              <CharPick n={s.shown} onNext={() => cast.setDeskChar(s.key, (s.shown + 1) % 10)} />
              <Pill on={s.on} onClick={() => cast.toggleDesk(s.key)} />
            </div>
          ))}

          <div style={sectionTitle}>EDIFICIO</div>
          {roster.map((r) => (
            <div key={r.id} style={rowStyle}>
              <span style={{ flex: 1 }}>{r.name}</span>
              <CharPick n={r.shown} onNext={() => cast.setOfficeChar(r.id, (r.shown + 1) % 10)} />
              <Pill on={r.on} onClick={() => cast.toggleOffice(r.id)} />
            </div>
          ))}
          <div style={rowStyle}>
            <span>Deambulan (por ahí)</span>
            <Pill on={cast.wander} onClick={() => cast.setWander(!cast.wander)} title="El ambiente pasea entre zonas" />
          </div>
        </div>
      )}
    </span>
  );
}
