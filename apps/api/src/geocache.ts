import fs from 'fs';
import path from 'path';

type GeoEntry = {
  query: string;
  lat: number;
  lon: number;
  ts: number;
};

const storePath = path.resolve(__dirname, '../uploads/geocache.json');

function load(): Record<string, GeoEntry> {
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function save(data: Record<string, GeoEntry>) {
  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

export function getGeocache(query: string): GeoEntry | null {
  const all = load();
  const key = query.trim().toLowerCase();
  return all[key] || null;
}

export function setGeocache(query: string, lat: number, lon: number) {
  const all = load();
  const key = query.trim().toLowerCase();
  all[key] = { query, lat, lon, ts: Date.now() };
  save(all);
}

