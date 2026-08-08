import { Counter } from "../app/user/counter";

/**
 * Generates a custom unique ID with the given prefix.
 * Format: PREFIX-YYYYNNNNN
 *   PREFIX  — e.g. "CUS", "PRJ", "PAY", "CERT"
 *   YYYY    — current year (4 digits)
 *   NNNNN   — zero-padded sequential number (5 digits, resets per year)
 *
 * Examples:
 *   CUS-20260001, PRJ-20260001, PAY-20260001, CERT-20260001
 *
 * Uses an atomic MongoDB counter per (prefix + year) so IDs are
 * collision-free even under concurrent requests.
 */
export async function generateCustomId(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `${prefix.toLowerCase()}-seq-${year}`;

  const doc = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seq = doc?.seq ?? 1;
  const padded = String(seq).padStart(5, "0");
  return `${prefix}-${year}${padded}`;
}
