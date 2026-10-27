import { randomInt } from "node:crypto";

export type Role = "owner" | "teacher" | "student";
export const isStaff = (r?: Role | null) => r === "owner" || r === "teacher";
export const canManageTeam = (r?: Role | null) => r === "owner";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
export const genJoinCode = (len = 8) => Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const normalizeJoinCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export interface InstitutionInput { name: string; city?: string; state?: string; phone?: string; address?: string; contactEmail?: string }
export function validateInstitution(i: InstitutionInput): string[] {
  const e: string[] = [];
  if ((i.name ?? "").trim().length < 3 || i.name.length > 100) e.push("Institute name must be 3 to 100 characters.");
  if (!(i.city ?? "").trim()) e.push("Add the city.");
  if (!(i.state ?? "").trim()) e.push("Add the state.");
  if (!/^\+?[0-9 \-]{10,15}$/.test((i.phone ?? "").trim())) e.push("Enter a valid phone number.");
  if (i.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.contactEmail)) e.push("Contact email looks wrong.");
  return e;
}

/** CSV with a byte-order mark for Excel. Cells starting with = + - @ are neutralised so a student name cannot run as a formula. */
export function csvCell(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const toCsv = (rows: (string | number | null | undefined)[][]) => "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
