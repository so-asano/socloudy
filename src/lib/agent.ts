import { AtpAgent, type AtpSessionData, type AtpSessionEvent } from "@atproto/api";

const SESSION_KEY = "verycloudy.session";
const SERVICE_KEY = "verycloudy.service";
const DEFAULT_SERVICE = "https://bsky.social";

export function loadSession(): AtpSessionData | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AtpSessionData;
  } catch {
    return null;
  }
}

function saveSession(session: AtpSessionData | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export function getService(): string {
  return localStorage.getItem(SERVICE_KEY) ?? DEFAULT_SERVICE;
}

export function setService(service: string) {
  localStorage.setItem(SERVICE_KEY, service);
}

function createAgent(service: string): AtpAgent {
  return new AtpAgent({
    service,
    persistSession: (_evt: AtpSessionEvent, session?: AtpSessionData) => {
      saveSession(session ?? null);
    },
  });
}

/**
 * Shared agent for the whole app. The agent owns the live session;
 * `persistSession` keeps localStorage in sync so refresh/reopen stays logged in.
 * Exported as `let` so it can be swapped when the user logs into a different PDS —
 * ESM live bindings mean importers see the new instance.
 */
let currentService = getService();
export let agent = createAgent(currentService);

/** Point the app at a different PDS (the agent's service is immutable once built). */
export function switchService(service: string) {
  if (service === currentService) return;
  currentService = service;
  setService(service);
  agent = createAgent(service);
}

/** Rehydrate the agent from a stored session on app boot. Returns true on success. */
export async function resumeSession(): Promise<boolean> {
  const session = loadSession();
  if (!session) return false;
  try {
    await agent.resumeSession(session);
    return true;
  } catch {
    saveSession(null);
    return false;
  }
}
