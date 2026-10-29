import type { KeyEvent } from "./wpmCalculator.ts";

/** Runtime validation is required because key events arrive from untrusted JSON. */
export function isValidKeyEvent(value: unknown): value is KeyEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const e = value as Record<string, unknown>;
  if (typeof e.t !== "number" || !Number.isFinite(e.t) || e.t < 0) return false;
  if (e.type === "ins") {
    return typeof e.ch === "string" && Array.from(e.ch).length === 1 &&
      (e.n === undefined);
  }
  if (e.type === "del") {
    return e.ch === undefined &&
      (e.n === undefined || (Number.isInteger(e.n) && Number(e.n) > 0 && Number(e.n) <= 30000));
  }
  return false;
}

/** Rebuild the typed text from the key log. */
export function replayEvents(events: KeyEvent[]): string {
  const st: string[] = [];
  for (const e of events) {
    if (e.type === "ins" && e.ch !== undefined) st.push(e.ch);
    else if (e.type === "del") for (let i = 0; i < (e.n ?? 1) && st.length; i++) st.pop();
  }
  return st.join("");
}

export interface AttemptCheck { tampered: boolean; flagged: boolean; reasons: string[]; elapsedSec: number }

/**
 * tampered: the submitted text does not match the key log, so the result is rejected.
 * flagged: saved, but kept off the leaderboards (impossible speed or time overrun).
 * Elapsed time can never be shorter than the last keystroke.
 */
export function validateAttempt(a: { typed: string; events: KeyEvent[]; elapsedSec: number; durationSec: number }): AttemptCheck {
  const reasons: string[] = [];
  let tampered = false, flagged = false;
  const ev = Array.isArray(a.events) ? a.events : [];
  if (!Array.isArray(a.events)) { tampered = true; reasons.push("Invalid key log."); }
  if (ev.length > 40000) { tampered = true; reasons.push("Too many key events."); }
  if (ev.some((e) => !isValidKeyEvent(e))) {
    tampered = true;
    reasons.push("Malformed key event.");
    return { tampered, flagged, reasons, elapsedSec: 0 };
  }
  if (typeof a.typed !== "string" || replayEvents(ev) !== a.typed) { tampered = true; reasons.push("Typed text does not match the key log."); }
  let prev = 0;
  for (const e of ev) { if (!(e.t >= prev)) { tampered = true; reasons.push("Key times are out of order."); break; } prev = e.t; }
  const lastSec = ev.length ? ev[ev.length - 1].t / 1000 : 0;
  const elapsedSec = Math.min(a.durationSec, Math.max(a.elapsedSec, lastSec));
  if (lastSec > a.durationSec + 5) { flagged = true; reasons.push("Typing continued after time was up."); }
  const chars = Array.from(a.typed).length;
  if (elapsedSec >= 5 && chars / elapsedSec > 18) { flagged = true; reasons.push("Speed above 18 characters a second."); }
  return { tampered, flagged, reasons, elapsedSec };
}
