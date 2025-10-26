// Condition → Specialty mapping and helpers for smart search

// Normalize tokens: lowercase, trim, strip punctuation
export function normalizeQuery(q: string): string {
  return String(q || '')
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Base mapping for common conditions and symptoms
const baseMap: Record<string, string[]> = {
  dengue: ['Infectious Disease', 'Internal Medicine', 'General Practitioner'],
  malaria: ['Infectious Disease', 'Internal Medicine', 'General Practitioner'],
  typhoid: ['Infectious Disease', 'Internal Medicine', 'General Practitioner'],
  fever: ['General Practitioner', 'Internal Medicine', 'Pediatrics'],
  cough: ['Pulmonology', 'General Practitioner'],
  cold: ['General Practitioner', 'Internal Medicine'],
  flu: ['General Practitioner', 'Internal Medicine'],
  covid: ['Pulmonology', 'Internal Medicine'],
  coronavirus: ['Pulmonology', 'Internal Medicine'],
  asthma: ['Pulmonology'],
  allergy: ['Allergy & Immunology', 'Dermatology'],
  allergies: ['Allergy & Immunology', 'Dermatology'],
  diabetes: ['Endocrinology', 'Internal Medicine'],
  heart: ['Cardiology'],
  cardiac: ['Cardiology'],
  chest: ['Pulmonology'],
  stomach: ['Gastroenterology'],
  gastric: ['Gastroenterology'],
  liver: ['Hepatology', 'Gastroenterology'],
  hepatitis: ['Hepatology', 'Gastroenterology'],
  kidney: ['Nephrology'],
  renal: ['Nephrology'],
  skin: ['Dermatology'],
  dermatology: ['Dermatology'],
  eye: ['Ophthalmology'],
  vision: ['Ophthalmology'],
  bone: ['Orthopedics'],
  ortho: ['Orthopedics'],
  pregnancy: ['Gynecology', 'Obstetrics'],
  gynecology: ['Gynecology', 'Obstetrics'],
  gyne: ['Gynecology', 'Obstetrics'],
  pediatrics: ['Pediatrics'],
  child: ['Pediatrics'],
  infant: ['Pediatrics'],
  newborn: ['Pediatrics'],
};

// Synonyms for conditions → canonical keys present in baseMap
const synonyms: Record<string, string> = {
  coronavirus: 'covid',
  corona: 'covid',
  temperature: 'fever',
  pyrexia: 'fever',
  highfever: 'fever',
  stomachache: 'stomach',
  stomachpain: 'stomach',
  gastritis: 'gastric',
  jaundice: 'liver',
  renalfailure: 'renal',
  breathlessness: 'asthma',
  shortnessofbreath: 'asthma',
  coughing: 'cough',
  runnynose: 'cold',
  sneezing: 'allergy',
  rash: 'skin',
  itch: 'skin',
  pregnant: 'pregnancy',
  gyn: 'gyne',
};

// Phrase-level mappings (multi-word/medical terms → canonical condition tokens)
const phraseMap: Record<string, string> = {
  'broken arm': 'bone',
  'fractured arm': 'bone',
  'broken leg': 'bone',
  'fractured leg': 'bone',
  'broken bone': 'bone',
  'fracture': 'bone',
  'sprain': 'ortho',
  'dislocation': 'ortho',
  // Extended phrases for ortho
  'arm pain': 'bone',
  'leg pain': 'bone',
  'knee pain': 'bone',
  'knee injury': 'bone',
  'wrist fracture': 'bone',
  'hand fracture': 'bone',
  'ankle sprain': 'ortho',
  'shoulder dislocation': 'ortho',
};

function canonicalToken(t: string): string {
  const c = synonyms[t] || t;
  return c;
}

export function detectConditions(tokens: string[], normalizedQuery?: string): string[] {
  const set = new Set<string>();
  // Token-level detection
  for (const t of tokens) {
    const c = canonicalToken(t);
    if (baseMap[c]) set.add(c);
  }
  // Phrase-level detection using normalized query string
  const nq = (normalizedQuery || tokens.join(' ')).trim();
  if (nq) {
    for (const [phrase, canonical] of Object.entries(phraseMap)) {
      if (nq.includes(phrase)) {
        if (baseMap[canonical]) set.add(canonical);
      }
    }
  }
  return Array.from(set);
}

export function mapConditionsToSpecialties(conditions: string[]): string[] {
  const out = new Set<string>();
  for (const c of conditions) {
    for (const spec of (baseMap[c] || [])) out.add(spec);
  }
  return Array.from(out);
}

import { topSpecialtiesFromTokens } from './learningStore';

export function mapQueryToSpecialties(q: string): { normalizedQuery: string; conditions: string[]; specialties: string[] } {
  const normalizedQuery = normalizeQuery(q);
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const conditions = detectConditions(tokens, normalizedQuery);
  const curated = mapConditionsToSpecialties(conditions);
  // Include full normalized query as a "phrase token" to learn multi-word associations
  const tokensPlus = normalizedQuery && normalizedQuery.includes(' ') ? [...tokens, normalizedQuery] : tokens;
  const learned = topSpecialtiesFromTokens(tokensPlus, 5);
  const specialties = Array.from(new Set([...curated, ...learned]));
  return { normalizedQuery, conditions, specialties };
}

export function suggestFromDoctors(q: string, doctors: Array<{ doctorProfile?: { specialization?: string } | null; email?: string }>): string[] {
  const nq = normalizeQuery(q);
  if (!nq) return [];
  const suggestions = new Set<string>();
  for (const d of doctors.slice(0, 50)) {
    const spec = (d.doctorProfile?.specialization || '').toLowerCase();
    const handle = String(d.email || '').split('@')[0].toLowerCase();
    if (spec.includes(nq)) suggestions.add(d.doctorProfile?.specialization || '');
    if (handle.includes(nq)) suggestions.add(`Dr. ${handle}`);
  }
  return Array.from(suggestions).filter(Boolean).slice(0, 10);
}