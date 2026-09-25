const { app, BrowserWindow, Tray, Menu, nativeImage } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const fs = require("fs");

const PORT = 3000;
const URL = `http://localhost:${PORT}/pixel-agents`;
let mainWindow = null;
let tray = null;
let serverProcess = null;
let isQuitting = false;

function findNode() {
  const candidates = [
    path.join(process.env.PROGRAMFILES || "C:\\Program Files", "nodejs", "node.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "nodejs", "node.exe"),
    "node",
  ];
  for (const c of candidates) {
    try { if (c === "node" || fs.existsSync(c)) return c; } catch {}
  }
  return "node";
}

function startServer() {
  const isDev = !app.isPackaged;
  let cmd, args, cwd;

  if (isDev) {
    cwd = path.join(__dirname, "..");
    cmd = process.execPath;
    args = [path.join(cwd, "node_modules", "next", "dist", "bin", "next"), "dev", "--port", String(PORT)];
  } else {
    cwd = process.resourcesPath;
    cmd = findNode();
    args = [path.join(cwd, "standalone", "server.js")];
    // Set HOST so standalone server binds to localhost
    process.env.HOST = "127.0.0.1";
    // Ensure NODE_PATH includes standalone node_modules
    process.env.NODE_PATH = path.join(cwd, "standalone", "node_modules");
  }

  serverProcess = spawn(cmd, args, {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1" },
  });

  serverProcess.on("error", (err) => {
    if (mainWindow) mainWindow.setTitle("ERROR: " + err.message);
  });

  serverProcess.on("exit", (code) => {
    if (!isQuitting) setTimeout(startServer, 2000);
  });
}

function waitForServer(timeoutMs = 60000) {
  return new Promise((resolve) => {
    const start = Date.now();
    function check() {
      http.get(`http://127.0.0.1:${PORT}/pixel-agents`, (res) => {
        resolve(true);
      }).on("error", () => {
        if (Date.now() - start > timeoutMs) resolve(false);
        else setTimeout(check, 500);
      });
    }
    check();
  });
}

const LOADING_HTML = "data:text/html," + encodeURIComponent(
  '<html><body style="background:#0a0a0f;color:#fbbf24;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:monospace">' +
  '<div style="text-align:center"><div style="font-size:48px">🏢</div><h1>Pixel Office</h1><p style="color:rgba(255,255,255,0.5)">Starting server...</p></div>' +
  "</body></html>"
);

const ERROR_HTML = "data:text/html," + encodeURIComponent(
  '<html><body style="background:#1a1a2e;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:monospace">' +
  '<div style="text-align:center"><h1>Pixel Office</h1><p>Server failed to start. Check if port 3000 is free.</p></div>' +
  "</body></html>"
);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
      title: "Pixel Office - Starting...",
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  // Safety net: never leave the user staring at nothing — force show after 3s
  setTimeout(() => { if (mainWindow && !mainWindow.isVisible()) mainWindow.show(); }, 3000);
  // If a page fails to load, ready-to-show never fires — show error page instead
  mainWindow.webContents.on("did-fail-load", () => {
    if (mainWindow && mainWindow.webContents.getURL() !== ERROR_HTML) {
      mainWindow.loadURL(ERROR_HTML);
      if (!mainWindow.isVisible()) mainWindow.show();
    }
  });
  // Show loading screen immediately
  mainWindow.loadURL(LOADING_HTML);

  mainWindow.on("close", (e) => {
    if (!isQuitting) { e.preventDefault(); mainWindow.hide(); }
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

function createTray() {
  const iconPath = path.join(__dirname, "..", "public", "pixel-office.ico");
  let icon;
  try { icon = nativeImage.createFromPath(iconPath); } catch { icon = nativeImage.createEmpty(); }
  tray = new Tray(icon);
  tray.setToolTip("Pixel Office");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: "separator" },
    { label: "Quit", click: () => { isQuitting = true; app.quit(); } },
  ]));
  tray.on("double-click", () => { mainWindow?.show(); mainWindow?.focus(); });
}

// Single instance: focus the existing window instead of piling up processes
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    startServer();
    createWindow();
    createTray();

    const ready = await waitForServer();
    if (mainWindow) {
      mainWindow.setTitle("Pixel Office - Agent Visualizer");
      mainWindow.loadURL(ready ? URL : ERROR_HTML);
      if (!mainWindow.isVisible()) mainWindow.show();
    }
  });
}

app.on("window-all-closed", () => {});
app.on("before-quit", () => {
  isQuitting = true;
  serverProcess?.kill("SIGTERM");
});
