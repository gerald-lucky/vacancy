import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Fuzzy match a Claude-extracted park name to a park slug from the database.
 * Returns the best matching park id or null.
 */
export function matchParkName(
  extractedName: string,
  parks: { id: string; name: string; slug: string }[]
): string | null {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normalized = normalize(extractedName);

  // Exact match first
  for (const park of parks) {
    if (normalize(park.name) === normalized) return park.id;
  }

  // Substring match (extracted name contains park name or vice versa)
  for (const park of parks) {
    const pn = normalize(park.name);
    if (normalized.includes(pn) || pn.includes(normalized)) return park.id;
  }

  // Word overlap scoring
  const extractedWords = new Set(normalized.split(" "));
  let bestScore = 0;
  let bestId: string | null = null;

  for (const park of parks) {
    const parkWords = normalize(park.name).split(" ");
    const overlap = parkWords.filter((w) => extractedWords.has(w)).length;
    const score = overlap / Math.max(parkWords.length, extractedWords.size);
    if (score > bestScore) {
      bestScore = score;
      bestId = park.id;
    }
  }

  return bestScore > 0.4 ? bestId : null;
}

export function formatPct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function getNextFriday(from: Date = new Date()): Date {
  const day = from.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const next = new Date(from);
  next.setDate(from.getDate() + daysUntilFriday);
  return next;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
