// ─── Camelot Wheel Logic ──────────────────────────────────────────────────────

export const CAMELOT_TO_STANDARD: Record<string, string> = {
  "1A": "Ab/G#m", "1B": "B",
  "2A": "Eb/D#m", "2B": "F#/Gb",
  "3A": "Bb/A#m", "3B": "Db/C#",
  "4A": "F",      "4B": "Ab/G#",
  "5A": "C",      "5B": "Eb/D#",
  "6A": "G",      "6B": "Bb/A#",
  "7A": "D",      "7B": "F",
  "8A": "Am",     "8B": "C",
  "9A": "Em",     "9B": "G",
  "10A": "Bm",    "10B": "D",
  "11A": "F#m",   "11B": "A",
  "12A": "Dbm",   "12B": "E",
};

export const STANDARD_TO_CAMELOT: Record<string, string> = Object.fromEntries(
  Object.entries(CAMELOT_TO_STANDARD).map(([c, s]) => [s, c])
);

// Returns compatible Camelot keys (same number ±1, same letter, adjacent letter)
export function getCompatibleKeys(camelotKey: string): string[] {
  const match = camelotKey.match(/^(\d+)([AB])$/);
  if (!match) return [];

  const num = parseInt(match[1]);
  const letter = match[2];
  const opposite = letter === "A" ? "B" : "A";

  const wrap = (n: number) => ((n - 1 + 12) % 12) + 1;

  return [
    camelotKey,                        // same key
    `${wrap(num - 1)}${letter}`,       // -1 semitone same mode
    `${wrap(num + 1)}${letter}`,       // +1 semitone same mode
    `${num}${opposite}`,               // parallel key (relative major/minor)
  ];
}

// BPM compatibility check (within 6% = mixable)
export function isBpmCompatible(bpm1: number, bpm2: number): boolean {
  const ratio = bpm1 / bpm2;
  return (ratio >= 0.94 && ratio <= 1.06) ||
         (ratio >= 1.88 && ratio <= 2.12) || // 2x
         (ratio >= 0.47 && ratio <= 0.53);   // 0.5x
}

export function formatKey(
  camelot: string | null,
  standard: string | null,
  notation: "camelot" | "standard"
): string {
  if (notation === "camelot") return camelot ?? "—";
  return standard ?? "—";
}
