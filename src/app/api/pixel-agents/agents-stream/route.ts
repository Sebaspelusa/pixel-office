import { NextResponse } from "next/server";
import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";

// OpenCode adaptation: instead of tailing Claude Code .jsonl files,
// poll the OpenCode SQLite database (~/.local/share/opencode/opencode.db).
// Event contract (snapshot / agent_update / agent_end) is unchanged so the
// DeskCanvas + OfficeCanvas frontend works without modifications.
const DB_PATH =
  process.env.OPENCODE_DB ??
  path.join(os.homedir(), ".local", "share", "opencode", "opencode.db");
const POLL_MS = 600;
const IDLE_MS = 10_000;
const MAX_AGENTS = 6;

export type AgentRole = "main" | "sub";

export type MultiAgentState =
  | "idle"
  | "reading"
  | "editing"
  | "running"
  | "searching"
  | "thinking"
  | "waiting"
  | "spawning";

export interface AgentUpdateEvent {
  agentId: string;
  role: AgentRole;
  sessionId: string;
  state: MultiAgentState;
  tool?: string;
  detail?: string;
  timestamp: string;
  agentType?: string;
}

interface SessionRow {
  id: string;
  title: string;
  agent: string;
  slug: string | null;
  time_updated: number;
}

interface PartRow {
  id: string;
  session_id: string;
  message_id: string;
  time_created: number;
  data: string;
}

let db: DatabaseSync | null = null;
function getDb(): DatabaseSync | null {
  try {
    if (!db) db = new DatabaseSync(DB_PATH, { readOnly: true });
    return db;
  } catch {
    return null;
  }
}

function msToIso(ms: number): string {
  try {
    return new Date(ms).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function getRecentSessions(limit: number): SessionRow[] {
  const d = getDb();
  if (!d) return [];
  try {
    return d
      .prepare(
        `SELECT id, title, agent, slug, time_updated FROM session
         WHERE (time_archived IS NULL OR time_archived = 0)
         ORDER BY time_updated DESC LIMIT ?`
      )
      .all(limit) as unknown as SessionRow[];
  } catch {
    return [];
  }
}

function getLatestPart(sessionId: string): PartRow | null {
  const d = getDb();
  if (!d) return null;
  try {
    const row = d
      .prepare(
        `SELECT id, session_id, message_id, time_created, data FROM part
         WHERE session_id = ? ORDER BY time_created DESC, rowid DESC LIMIT 1`
      )
      .get(sessionId) as unknown as PartRow | undefined;
    return row ?? null;
  } catch {
    return null;
  }
}

function getMessageRole(messageId: string): string | null {
  const d = getDb();
  if (!d) return null;
  try {
    const row = d
      .prepare(`SELECT data FROM message WHERE id = ?`)
      .get(messageId) as unknown as { data: string } | undefined;
    if (!row) return null;
    const data = JSON.parse(row.data) as { role?: string };
    return data.role ?? null;
  } catch {
    return null;
  }
}

function toolToState(tool: string): MultiAgentState {
  const t = tool.toLowerCase();
  if (t === "read") return "reading";
  if (t === "edit" || t === "write" || t === "patch") return "editing";
  if (t === "bash" || t === "execute") return "running";
  if (t === "grep" || t === "glob" || t === "codesearch") return "searching";
  if (t === "webfetch" || t === "websearch") return "searching";
  if (t === "task" || t === "subagent") return "spawning";
  return "running";
}

function toolDetail(tool: string, state: Record<string, unknown>): string {
  try {
    const input = (state.input ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    if (tool === "read" || tool === "edit" || tool === "write") {
      const p = str(input.filePath ?? input.path ?? input.file ?? "");
      return p.split(/[/\\]/).pop()?.slice(0, 40) ?? tool;
    }
    if (tool === "bash") return str(input.command ?? input.cmd).slice(0, 80);
    if (tool === "grep" || tool === "glob")
      return str(input.pattern ?? input.query).slice(0, 60);
    if (tool === "webfetch" || tool === "websearch")
      return str(input.url ?? input.query).slice(0, 60);
    if (tool === "task" || tool === "subagent")
      return str(input.description ?? input.prompt).slice(0, 60);
    return JSON.stringify(input).slice(0, 60);
  } catch {
    return tool;
  }
}

interface ParsedPart {
  state: MultiAgentState;
  tool?: string;
  detail?: string;
  timestamp: string;
}

function parsePart(part: PartRow): ParsedPart | null {
  try {
    const d = JSON.parse(part.data) as {
      type?: string;
      tool?: string;
      text?: string;
      state?: Record<string, unknown>;
    };
    const ts = msToIso(part.time_created);
    if (d.type === "tool" && d.tool) {
      const st = (d.state ?? {}) as { status?: string };
      const state = toolToState(d.tool);
      return { state, tool: d.tool, detail: toolDetail(d.tool, d.state ?? {}), timestamp: ts };
    }
    if (d.type === "text" && typeof d.text === "string" && d.text.trim()) {
      const role = getMessageRole(part.message_id);
      if (role === "user") return { state: "waiting", detail: d.text.slice(0, 60), timestamp: ts };
      return { state: "thinking", detail: d.text.slice(0, 60), timestamp: ts };
    }
    if (d.type === "reasoning") return { state: "thinking", timestamp: ts };
    if (d.type === "step-finish") return { state: "idle", timestamp: ts };
    return null;
  } catch {
    return null;
  }
}

interface TrackedSession {
  sessionId: string;
  agentId: string;
  role: AgentRole;
  agentType?: string;
  title: string;
  lastPartId: string | null;
  lastSeen: number;
  idleSent: boolean;
  misses: number; // consecutive polls absent (grace before agent_end)
}

function shortTitle(title: string): string {
  return (title || "agent").slice(0, 24);
}

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const tracked = new Map<string, TrackedSession>();
      // Stable main: assigned once to the newest session, never stolen by
      // recency flips (reassigning caused permanent frontend ghosts).
      // Reset only when the main session itself expires (after agent_end).
      let mainSessionId: string | null = null;

      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      }

      function emitUpdate(ts: TrackedSession, parsed: ParsedPart) {
        send("agent_update", {
          agentId: ts.agentId,
          role: ts.role,
          sessionId: ts.sessionId,
          state: parsed.state,
          tool: parsed.tool,
          detail: parsed.detail ?? shortTitle(ts.title),
          timestamp: parsed.timestamp,
          agentType: ts.agentType,
        } satisfies AgentUpdateEvent);
      }

      function refreshSessions(): SessionRow[] {
        const sessions = getRecentSessions(MAX_AGENTS);
        const now = Date.now();
        // Lock "main" to the newest session only when unset (stable IDs).
        if (mainSessionId === null && sessions.length > 0) {
          mainSessionId = sessions[0].id;
        }
        sessions.forEach((s) => {
          const isMain = s.id === mainSessionId;
          if (!tracked.has(s.id)) {
            tracked.set(s.id, {
              sessionId: s.id,
              agentId: isMain ? "main" : `sub-${s.id.slice(-6)}`,
              role: isMain ? "main" : "sub",
              agentType: s.agent || undefined,
              title: s.title || "agent",
              lastPartId: null,
              lastSeen: now,
              idleSent: false,
              misses: 0,
            });
          } else {
            const t = tracked.get(s.id)!;
            t.title = s.title || t.title;
            if (s.agent) t.agentType = s.agent;
          }
        });
        return sessions;
      }

      function snapshot() {
        const sessions = refreshSessions();
        const now = Date.now();
        const entries: AgentUpdateEvent[] = [];
        for (const s of sessions) {
          // Only show sessions active in the last 15 min
          if (now - s.time_updated > 15 * 60_000) continue;
          const t = tracked.get(s.id)!;
          const part = getLatestPart(s.id);
          let state: MultiAgentState = "idle";
          let tool: string | undefined;
          let detail: string | undefined;
          let ts = msToIso(s.time_updated);
          if (part) {
            t.lastPartId = part.id;
            const parsed = parsePart(part);
            if (parsed) {
              state = parsed.state;
              tool = parsed.tool;
              detail = parsed.detail;
              ts = parsed.timestamp;
              // A finished tool from a while ago means the agent is composing
              if (now - part.time_created > IDLE_MS && (state === "reading" || state === "editing" || state === "running" || state === "searching")) {
                state = "thinking";
              }
            }
          }
          t.lastSeen = now;
          entries.push({
            agentId: t.agentId,
            role: t.role,
            sessionId: s.id,
            state,
            tool,
            detail: detail ?? shortTitle(t.title),
            timestamp: ts,
            agentType: t.agentType,
          });
        }
        send("snapshot", entries);
      }

      function poll() {
        if (closed) return;
        try {
          const sessions = refreshSessions();
          const now = Date.now();
          // DB hiccup (empty read): hold last-known state, evict nothing
          if (sessions.length === 0) return;
          const liveIds = new Set(sessions.map((s) => s.id));
          // Grace: evict only after 5 consecutive misses so recency flips
          // don't make seated agents run off and back on in loops
          for (const [id, t] of tracked) {
            if (!liveIds.has(id)) {
              t.misses += 1;
              if (t.misses >= 5) {
                send("agent_end", { agentId: t.agentId });
                tracked.delete(id);
                if (id === mainSessionId) mainSessionId = null;
              }
            }
          }
          for (const s of sessions) {
            tracked.get(s.id)!.misses = 0;
            if (now - s.time_updated > 15 * 60_000) continue;
            const t = tracked.get(s.id)!;
            const part = getLatestPart(s.id);
            if (part && part.id !== t.lastPartId) {
              t.lastPartId = part.id;
              t.lastSeen = now;
              t.idleSent = false;
              const parsed = parsePart(part);
              if (parsed) emitUpdate(t, parsed);
              continue;
            }
            // Idle agents stay seated indefinitely: they only leave (fade out)
            // when their session drops out of the recent list (misses above).
            if (part) {
              const age = now - part.time_created;
              if (age > IDLE_MS && !t.idleSent) {
                // Settle into idle once after activity ends
                emitUpdate(t, { state: "idle", timestamp: msToIso(part.time_created) });
                t.idleSent = true;
              }
            }
          }
        } catch {
          /* outer guard */
        }
      }

      function heartbeat() {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            closed = true;
          }
        }
      }

      snapshot();
      const intervalId = setInterval(poll, POLL_MS);
      const heartbeatId = setInterval(heartbeat, 15_000);
      (controller as unknown as { _cleanup: () => void })._cleanup = () => {
        closed = true;
        clearInterval(intervalId);
        clearInterval(heartbeatId);
      };
    },
    cancel(controller) {
      const c = controller as unknown as { _cleanup?: () => void };
      if (c._cleanup) c._cleanup();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
