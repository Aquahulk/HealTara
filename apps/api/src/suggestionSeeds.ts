// Curated basic tokens → specialties and synonyms for bootstrapping suggestions
// Keep short, common, and unambiguous terms. Expand over time.

export type SeedEntry = {
  tokens: string[]; // canonical tokens and common variants
  specialties: string[]; // one or more specialties to suggest
};

export const BASIC_SEEDS: SeedEntry[] = [
  { tokens: ["fever", "viral", "infection", "flu", "cold"], specialties: ["General Medicine"] },
  { tokens: ["cough", "sore throat", "throat"], specialties: ["General Medicine", "ENT"] },
  { tokens: ["ear", "nose", "sinus"], specialties: ["ENT"] },
  { tokens: ["skin", "rash", "acne", "derma"], specialties: ["Dermatology"] },
  { tokens: ["heart", "cardio", "chest pain", "palpitation"], specialties: ["Cardiology"] },
  { tokens: ["diabetes", "sugar", "glucose"], specialties: ["Endocrinology"] },
  { tokens: ["thyroid"], specialties: ["Endocrinology"] },
  { tokens: ["pregnancy", "antenatal", "obgyn"], specialties: ["Obstetrics & Gynecology"] },
  { tokens: ["child", "pediatric", "baby", "infant"], specialties: ["Pediatrics"] },
  { tokens: ["bone", "fracture", "orthopedic", "joint", "knee"], specialties: ["Orthopedics"] },
  { tokens: ["eye", "vision", "ophthalmology"], specialties: ["Ophthalmology"] },
  { tokens: ["dental", "tooth", "dentist", "cavity"], specialties: ["Dentistry"] },
  { tokens: ["mental", "depression", "anxiety", "psychiatry"], specialties: ["Psychiatry"] },
  { tokens: ["neuro", "headache", "migraine", "stroke"], specialties: ["Neurology"] },
  { tokens: ["stomach", "gastric", "acid", "ulcer"], specialties: ["Gastroenterology"] },
  { tokens: ["kidney", "renal", "urology", "urine"], specialties: ["Urology", "Nephrology"] },
  { tokens: ["female", "women health"], specialties: ["Obstetrics & Gynecology"] },
  { tokens: ["male", "andrology"], specialties: ["Urology"] },
];

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

export function mapQueryToSeedSpecialties(query: string): string[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(" ");
  const matched = new Set<string>();
  for (const seed of BASIC_SEEDS) {
    for (const t of tokens) {
      for (const variant of seed.tokens) {
        // simple match: exact or startsWith to catch partial typing
        const v = normalize(variant);
        if (t === v || t.startsWith(v) || v.startsWith(t)) {
          for (const spec of seed.specialties) matched.add(spec);
          break;
        }
      }
    }
  }
  return Array.from(matched);
}

export function seedSuggestions(query: string): string[] {
  const specs = mapQueryToSeedSpecialties(query);
  // format consistent with frontend expectations, e.g., "Cardiology (specialization)"
  return specs.map((s) => `${s} (specialization)`);
}