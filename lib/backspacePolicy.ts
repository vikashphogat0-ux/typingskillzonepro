export type BackspaceMode = "full" | "word" | "disabled";

/**
 * Decide whether a text change is allowed. The simulator keeps the caret at the end,
 * so a change is either an insertion at the end or a removal from the end.
 *  - full:     any deletion is allowed.
 *  - word:     deletion is allowed only inside the word being typed (not past a space).
 *  - disabled: no deletion at all.
 * Anything that is not a pure append or pure trim (paste in the middle, replace selection) is rejected.
 */
export function checkEdit(prev: string, next: string, mode: BackspaceMode): { ok: boolean; value: string } {
  const a = Array.from(prev), b = Array.from(next);
  let cp = 0;
  while (cp < a.length && cp < b.length && a[cp] === b[cp]) cp++;
  const removed = a.slice(cp), added = b.slice(cp);
  if (removed.length === 0) return { ok: true, value: next }; // pure append
  if (added.length > 0) return { ok: false, value: prev }; // replaced text, not allowed
  if (mode === "disabled") return { ok: false, value: prev };
  if (mode === "word" && removed.some((c) => /\s/.test(c))) return { ok: false, value: prev };
  return { ok: true, value: next };
}
