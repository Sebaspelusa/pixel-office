// demo-agents.mjs — genera sesiones FALSAS de Claude Code (JSONL) para demos,
// capturas y videos. Nunca lee ni toca datos reales: escribe en una carpeta
// temporal propia y el server la usa via CLAUDE_DIR.
//
// uso:
//   node scripts/demo-agents.mjs <carpeta> <segundos> [ms-por-evento]
//
// Luego arranca la app apuntando ahi:
//   CLAUDE_DIR=<carpeta> OPENCODE_DB=<ruta-inexistente> npm run dev
import fs from "node:fs";
import path from "node:path";

const outDir = process.argv[2] ?? path.join(process.env.TEMP ?? "/tmp", "pixel-hq-demo");
const seconds = Number(process.argv[3] ?? 30);
const tickMs = Number(process.argv[4] ?? 1300);

// Trabajos falsos: nombre de carpeta -> linea de tiempo de herramientas.
// Los detalles que se ven en las burbujas salen de aqui (nada real).
const JOBS = [
  {
    project: "web-dashboard",
    session: "8f3a1c20-1111-4a01-9b01-a1b2c3d4e501",
    steps: [
      ["Read", { filePath: "src/app/page.tsx" }],
      ["Edit", { filePath: "src/components/Header.tsx" }],
      ["Bash", { command: "npm run build" }],
      ["Grep", { pattern: "useEffect" }],
      ["Edit", { filePath: "src/styles/theme.css" }],
    ],
  },
  {
    project: "api-gateway",
    session: "8f3a1c20-2222-4a02-9b02-a1b2c3d4e502",
    steps: [
      ["Bash", { command: "npm test -- --watch" }],
      ["Read", { filePath: "api/routes/users.ts" }],
      ["Edit", { filePath: "api/middleware/auth.ts" }],
      ["Task", { description: "write integration tests" }],
      ["Bash", { command: "docker compose up -d" }],
    ],
  },
  {
    project: "mobile-app",
    session: "8f3a1c20-3333-4a03-9b03-a1b2c3d4e503",
    steps: [
      ["Grep", { pattern: "TODO" }],
      ["Read", { filePath: "src/screens/Home.tsx" }],
      ["Bash", { command: "npx expo start" }],
      ["Edit", { filePath: "src/navigation/Root.tsx" }],
      ["Read", { filePath: "package.json" }],
    ],
  },
  {
    project: "docs-site",
    session: "8f3a1c20-4444-4a04-9b04-a1b2c3d4e504",
    steps: [
      ["Read", { filePath: "docs/getting-started.md" }],
      ["Edit", { filePath: "docs/api-reference.md" }],
      ["WebFetch", { url: "https://example.com/docs" }],
      ["Grep", { pattern: "install" }],
      ["Bash", { command: "npm run docs:build" }],
    ],
  },
  {
    project: "data-pipeline",
    session: "8f3a1c20-5555-4a05-9b05-a1b2c3d4e505",
    steps: [
      ["Bash", { command: "python -m pytest -q" }],
      ["Edit", { filePath: "pipelines/etl.py" }],
      ["Read", { filePath: "pipelines/schema.sql" }],
      ["Grep", { pattern: "SELECT" }],
      ["Bash", { command: "make lint" }],
    ],
  },
];

const line = (step) =>
  JSON.stringify({
    type: "assistant",
    timestamp: new Date().toISOString(),
    message: { role: "assistant", content: [{ type: "tool_use", name: step[0], input: step[1] }] },
  }) + "\n";

fs.mkdirSync(outDir, { recursive: true });
const files = JOBS.map((j) => {
  const dir = path.join(outDir, j.project);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${j.session}.jsonl`);
  fs.writeFileSync(file, line(j.steps[0]));
  return { file, steps: j.steps, i: 0, project: j.project };
});
console.log(`demo: ${files.length} agentes falsos en ${outDir}`);

let round = 0;
const totalRounds = Math.ceil((seconds * 1000) / tickMs);
const timer = setInterval(() => {
  round += 1;
  // Cada ronda mueve un solo agente para que se vea trabajo escalonado
  const f = files[round % files.length];
  f.i = (f.i + 1) % f.steps.length;
  fs.appendFileSync(f.file, line(f.steps[f.i]));
  process.stdout.write(`\r  ronda ${round}/${totalRounds}  ${f.project} -> ${f.steps[f.i][0]}   `);
  if (round >= totalRounds) {
    clearInterval(timer);
    console.log("\ndemo: datos listos (quedan frescos 15 min)");
    process.exit(0);
  }
}, tickMs);
