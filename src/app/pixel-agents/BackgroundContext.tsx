"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { officeBackgrounds, getOfficeBackground } from "./office-backgrounds";
import type { OfficeBackground } from "./office-backgrounds";

interface BackgroundCtx {
  backgroundId: string;
  background: OfficeBackground;
  setBackgroundId: (id: string) => void;
  backgrounds: OfficeBackground[];
}

const BackgroundContext = createContext<BackgroundCtx>({
  backgroundId: "retro-cubicles",
  background: officeBackgrounds[0],
  setBackgroundId: () => {},
  backgrounds: officeBackgrounds,
});

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [backgroundId, setBackgroundId] = useState("retro-cubicles");

  // ?bg=xxx URL override (for testing/screenshots), applied after mount
  // so server and client render identically (no hydration mismatch).
  // persisted choice wins on later visits (only apply ?bg when no saved value).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("bg");
    if (q && officeBackgrounds.some((b) => b.id === q) && !localStorage.getItem("pixel-hq-office")) {
      setBackgroundId(q);
    } else {
      const saved = localStorage.getItem("pixel-hq-office");
      if (saved) setBackgroundId(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pixel-hq-office", backgroundId);
  }, [backgroundId]);

  const background = getOfficeBackground(backgroundId);

  return (
    <BackgroundContext.Provider value={{ backgroundId, background, setBackgroundId, backgrounds: officeBackgrounds }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  return useContext(BackgroundContext);
}
