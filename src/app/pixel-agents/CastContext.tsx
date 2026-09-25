"use client";

import { createContext, useContext, useEffect, useState } from "react";

// ─── Cast management ─────────────────────────────────────────────────────────
// Which decorative characters are on stage. Workers (live agents) always show;
// ambient can be toggled per spot, set to wander, or hidden all at once
// (workers-only mode). Persisted in localStorage.

interface CastState {
  deskHidden: string[];   // `${bgId}:${spotIndex}` for DeskCanvas ambient
  officeHidden: string[]; // amb_x ids for OfficeCanvas ambient
  wander: boolean;        // office ambient strolls ("por ahí") vs stays put
  workersOnly: boolean;   // master switch: hide every ambient character
  deskChar: Record<string, number>;   // `${bgId}:${spotIndex}` -> sheet 0-9
  officeChar: Record<string, number>; // amb_x id -> sheet 0-9
}

interface CastCtx extends CastState {
  toggleDesk: (key: string) => void;
  toggleOffice: (id: string) => void;
  setWander: (v: boolean) => void;
  setWorkersOnly: (v: boolean) => void;
  setDeskChar: (key: string, n: number) => void;
  setOfficeChar: (id: string, n: number) => void;
}

const CastContext = createContext<CastCtx>({
  deskHidden: [],
  officeHidden: [],
  wander: false,
  workersOnly: false,
  deskChar: {},
  officeChar: {},
  toggleDesk: () => {},
  toggleOffice: () => {},
  setWander: () => {},
  setWorkersOnly: () => {},
  setDeskChar: () => {},
  setOfficeChar: () => {},
});

const KEY = "pixel-hq-cast";

export function CastProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<CastState>({ deskHidden: [], officeHidden: [], wander: false, workersOnly: false, deskChar: {}, officeChar: {} });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS((prev) => ({ ...prev, ...(JSON.parse(raw) as Partial<CastState>) }));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }, [s]);

  const toggleDesk = (key: string) =>
    setS((prev) => ({
      ...prev,
      deskHidden: prev.deskHidden.includes(key) ? prev.deskHidden.filter((x) => x !== key) : [...prev.deskHidden, key],
    }));

  const toggleOffice = (id: string) =>
    setS((prev) => ({
      ...prev,
      officeHidden: prev.officeHidden.includes(id) ? prev.officeHidden.filter((x) => x !== id) : [...prev.officeHidden, id],
    }));

  const setWander = (v: boolean) => setS((prev) => ({ ...prev, wander: v }));
  const setWorkersOnly = (v: boolean) => setS((prev) => ({ ...prev, workersOnly: v }));
  const setDeskChar = (key: string, n: number) => setS((prev) => ({ ...prev, deskChar: { ...prev.deskChar, [key]: n } }));
  const setOfficeChar = (id: string, n: number) => setS((prev) => ({ ...prev, officeChar: { ...prev.officeChar, [id]: n } }));

  return (
    <CastContext.Provider value={{ ...s, toggleDesk, toggleOffice, setWander, setWorkersOnly, setDeskChar, setOfficeChar }}>
      {children}
    </CastContext.Provider>
  );
}

export function useCast(): CastCtx {
  return useContext(CastContext);
}
