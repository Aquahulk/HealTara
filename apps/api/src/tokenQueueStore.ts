import fs from 'fs';
import path from 'path';

type TokenEntry = {
  token: number;
  appointmentId: number;
  patientId: number;
  time: string;
};

type QueueState = {
  currentToken: number;
  tokens: TokenEntry[];
};

const dataDir = path.resolve(__dirname, '../uploads');
const storeFile = path.join(dataDir, 'tokenQueues.json');

function ensureDir() {
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
}

function load(): Record<string, QueueState> {
  ensureDir();
  try {
    const txt = fs.readFileSync(storeFile, 'utf8');
    return JSON.parse(txt) || {};
  } catch {
    return {};
  }
}

function save(obj: Record<string, QueueState>) {
  ensureDir();
  try { fs.writeFileSync(storeFile, JSON.stringify(obj, null, 2), 'utf8'); } catch {}
}

export function getQueueKey(doctorId: number, dateStr: string): string {
  return `${doctorId}:${dateStr}`;
}

export function getQueue(doctorId: number, dateStr: string): QueueState | null {
  const all = load();
  const key = getQueueKey(doctorId, dateStr);
  const q = all[key];
  return q || null;
}

export function setQueue(doctorId: number, dateStr: string, state: QueueState) {
  const all = load();
  const key = getQueueKey(doctorId, dateStr);
  all[key] = state;
  save(all);
}

export function setCurrentToken(doctorId: number, dateStr: string, currentToken: number) {
  const all = load();
  const key = getQueueKey(doctorId, dateStr);
  const q = all[key];
  if (q) {
    q.currentToken = currentToken;
    save(all);
  } else {
    all[key] = { currentToken, tokens: [] };
    save(all);
  }
}
