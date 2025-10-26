import fs from 'fs';
import path from 'path';

// Lightweight learning store: token → specialty → weight
export type Weights = Record<string, Record<string, number>>;

const dataDir = path.resolve(__dirname, '../uploads');
const weightsFile = path.join(dataDir, 'learningWeights.json');
const metaFile = path.join(dataDir, 'learningWeights.meta.json');

// Caps and decay settings
const MAX_WEIGHT = 50; // prevent runaway influence of any single association
const DECAY_FACTOR = 0.98; // gentle decay to reduce stale associations
const DECAY_INTERVAL_MS = 12 * 60 * 60 * 1000; // every 12 hours

let weights: Weights = {};
let lastDecay = 0;

function ensureDir() {
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch (_) {}
}

function load() {
  ensureDir();
  try {
    const txt = fs.readFileSync(weightsFile, 'utf8');
    weights = JSON.parse(txt);
  } catch (_) {
    weights = {};
  }
  try {
    const metaTxt = fs.readFileSync(metaFile, 'utf8');
    const meta = JSON.parse(metaTxt);
    lastDecay = Number(meta.lastDecay || 0) || 0;
  } catch (_) {
    lastDecay = 0;
  }
}

function save() {
  ensureDir();
  try {
    fs.writeFileSync(weightsFile, JSON.stringify(weights, null, 2), 'utf8');
  } catch (_) {}
  try {
    fs.writeFileSync(metaFile, JSON.stringify({ lastDecay }, null, 2), 'utf8');
  } catch (_) {}
}

function maybeApplyDecay() {
  const now = Date.now();
  if (now - lastDecay < DECAY_INTERVAL_MS) return;
  // Apply soft decay and cleanup tiny weights
  for (const token of Object.keys(weights)) {
    const map = weights[token];
    for (const spec of Object.keys(map)) {
      const decayed = map[spec] * DECAY_FACTOR;
      if (decayed < 0.05) {
        delete map[spec];
      } else {
        map[spec] = decayed;
      }
    }
    if (Object.keys(map).length === 0) {
      delete weights[token];
    }
  }
  lastDecay = now;
  save();
}

load();

export function incrementTokenSpecialty(token: string, specialty: string, delta = 1): void {
  const t = token.trim().toLowerCase();
  const s = specialty.trim();
  if (!t || !s) return;
  maybeApplyDecay();
  if (!weights[t]) weights[t] = {};
  const cur = weights[t][s] || 0;
  const next = cur + delta;
  weights[t][s] = next > MAX_WEIGHT ? MAX_WEIGHT : next;
  save();
}

export function getSpecialtyScoresForTokens(tokens: string[]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const raw of tokens) {
    const t = raw.trim().toLowerCase();
    if (!t) continue;
    const map = weights[t];
    if (!map) continue;
    for (const spec of Object.keys(map)) {
      scores[spec] = (scores[spec] || 0) + map[spec];
    }
  }
  return scores;
}

export function topSpecialtiesFromTokens(tokens: string[], limit = 5): string[] {
  const scores = getSpecialtyScoresForTokens(tokens);
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, limit).map(([spec]) => spec);
}

export function getAllWeights(): Weights {
  return weights;
}