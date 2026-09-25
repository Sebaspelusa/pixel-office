import { AgentDataProvider } from "./AgentDataContext";
import { ThemeProvider } from "./ThemeContext";
import { BackgroundProvider } from "./BackgroundContext";
import { CastProvider } from "./CastContext";

export default function PixelAgentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BackgroundProvider>
        <CastProvider>
          <AgentDataProvider>{children}</AgentDataProvider>
        </CastProvider>
      </BackgroundProvider>
    </ThemeProvider>
  );
}
