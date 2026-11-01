"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateScore, norm, type KeyEvent, type Lang, type ScoreResult, type ScoringProfile } from "@/lib/wpmCalculator";
import { checkEdit, type BackspaceMode } from "@/lib/backspacePolicy";
import { isExamInputAllowed } from "@/lib/keyboardPolicy";
import { usesRrbCbtstPhases, type DisplayMode } from "@/lib/presets";
import { formatRkcPassage } from "@/lib/rkc-passage-format";

export interface SimResult {
  reference: string;
  typed: string;
  elapsedSec: number;
  durationSec: number;
  events: KeyEvent[];
  score: ScoreResult;
  profileId: string;
}

interface Props {
  passage: string;
  lang: Lang;
  durationSec: number;
  mode: DisplayMode;
  practiceMode?: "highlighted" | "unhighlighted" | "exam";
  backspace: BackspaceMode;
  profile: ScoringProfile;
  fontSizePt?: number;
  passageLayout?: string;
  passageFontFamily?: string;
  passageAlignment?: string;
  passageLineSpacing?: number;
  passageParagraphSpacing?: number;
  printPageSize?: string;
  examName?: string;
  enterKeyPolicy?: "newline" | "blocked";
  tabKeyPolicy?: "blocked" | "insert";
  onFinish: (r: SimResult) => void;
}

const fmt = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/** One word of the passage. Memoised so a keystroke only re-renders the word being typed. */
const Word = memo(function Word({ text, typed, active }: { text: string; typed: string; active: boolean }) {
  const ref = Array.from(text), got = Array.from(typed);
  return (
    <span className={active ? "w cur" : "w"} data-cur={active ? "1" : undefined}>
      {ref.map((c, i) => (
        <span key={i} className={i < got.length ? (got[i] === c ? "ok" : "bad") : ""}>{c}</span>
      ))}
    </span>
  );
});

export default function TypingSimulator({ passage, lang, durationSec, mode, practiceMode = "exam", backspace, profile, fontSizePt = 12, passageLayout = "continuous", passageFontFamily = "system", passageAlignment = "left", passageLineSpacing = 1.5, passageParagraphSpacing = 8, printPageSize = "A4", examName = "Typing practice", enterKeyPolicy = "newline", tabKeyPolicy = "blocked", onFinish }: Props) {
  // Practice mode is a presentation override only. The exam preset remains authoritative for all rules.
  const displayMode: DisplayMode = practiceMode === "exam" ? mode : practiceMode;
  const reference = useMemo(() => norm(formatRkcPassage(passage, passageLayout)), [passage, passageLayout]);
  const refChars = useMemo(() => Array.from(reference), [reference]);
  const tokens = useMemo(() => {
    let pos = 0;
    return (reference.match(/\S+|\s+/g) ?? []).map((t) => {
      const len = Array.from(t).length;
      const tok = { text: t, start: pos, len, space: /^\s/.test(t) };
      pos += len;
      return tok;
    });
  }, [reference]);

  const [value, setValue] = useState("");
  const [left, setLeft] = useState(durationSec);
  const hasRrbPhases = usesRrbCbtstPhases(profile.id);
  const [phase, setPhase] = useState<"warmup" | "break" | "test">(hasRrbPhases ? "warmup" : "test");
  const [phaseLeft, setPhaseLeft] = useState(60);
  const phaseStartRef = useRef<number | null>(hasRrbPhases ? Date.now() : null);
  const [done, setDone] = useState(false);
  const valueRef = useRef("");
  const events = useRef<KeyEvent[]>([]);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const composingRef = useRef(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    const elapsed = startRef.current ? (Date.now() - startRef.current) / 1000 : 0;
    const typed = valueRef.current;
    const score = calculateScore({ reference, typed, elapsedSec: elapsed, durationSec, profile, keyEvents: events.current });
    onFinish({ reference, typed, elapsedSec: Math.min(elapsed, durationSec), durationSec, events: events.current, score, profileId: profile.id });
  }, [reference, durationSec, profile, onFinish]);

  // RRB CBTST has a one-minute warm-up, a one-minute break, then the scored 10-minute test.
  // Warm-up text/events are discarded so they never affect the submitted result.
  useEffect(() => {
    const id = setInterval(() => {
      if (doneRef.current) return;
      if (phase !== "test") {
        if (phaseStartRef.current === null) phaseStartRef.current = Date.now();
        const rem = 60 - (Date.now() - phaseStartRef.current) / 1000;
        setPhaseLeft(rem);
        if (rem <= 0) {
          if (phase === "warmup") {
            valueRef.current = "";
            setValue("");
            events.current = [];
            startRef.current = null;
            phaseStartRef.current = Date.now();
            setPhaseLeft(60);
            setPhase("break");
          } else {
            phaseStartRef.current = null;
            setLeft(durationSec);
            setPhaseLeft(0);
            setPhase("test");
          }
        }
        return;
      }
      if (startRef.current === null) return;
      const rem = durationSec - (Date.now() - startRef.current) / 1000;
      setLeft(rem);
      if (rem <= 0) finish();
    }, 200);
    return () => clearInterval(id);
  }, [durationSec, finish, phase]);

  useEffect(() => { taRef.current?.focus(); }, []);

  // keep the active word in view
  useEffect(() => {
    const box = boxRef.current, cur = box?.querySelector<HTMLElement>("[data-cur]");
    if (box && cur && (cur.offsetTop < box.scrollTop || cur.offsetTop + cur.offsetHeight > box.scrollTop + box.clientHeight - 24))
      box.scrollTop = Math.max(0, cur.offsetTop - 40);
  }, [value]);

  const commitInput = (candidate: string, input: HTMLTextAreaElement) => {
    if (doneRef.current || phase === "break") return;
    const prev = valueRef.current;
    // Normalize committed IME output to the same NFC form used by passage
    // comparison and scoring. This avoids logging decomposed equivalents as
    // extra keystrokes when an input method emits canonically equivalent text.
    const normalizedCandidate = candidate.normalize("NFC");
    const res = checkEdit(prev, normalizedCandidate, backspace);
    if (!res.ok) { input.value = prev; setValue(prev); return; }
    // Enforce Enter/Tab rules at the committed-input boundary too. Keydown
    // handlers alone can be bypassed by IME, mobile keyboards or synthetic input.
    if (!isExamInputAllowed(prev, res.value, enterKeyPolicy, tabKeyPolicy)) {
      input.value = prev;
      setValue(prev);
      return;
    }
    const next = res.value;
    if (next === prev) { setValue(next); return; }
    if (startRef.current === null) startRef.current = Date.now();
    const t = Date.now() - startRef.current;
    const a = Array.from(prev), b = Array.from(next);
    let cp = 0;
    while (cp < a.length && cp < b.length && a[cp] === b[cp]) cp++;
    if (a.length > cp) events.current.push({ t, type: "del", n: a.length - cp });
    b.slice(cp).forEach((ch) => events.current.push({ t, type: "ins", ch }));
    valueRef.current = next;
    setValue(next);
    if (phase === "test" && b.length >= refChars.length) finish();
  };

  // IME composition can emit several provisional Hindi/Indic strings. Show them
  // while composing, but record only the committed final text as typing events.
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (composingRef.current) {
      setValue(e.target.value);
      return;
    }
    commitInput(e.target.value, e.currentTarget);
  };
  const onCompositionStart = () => { composingRef.current = true; };
  const onCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    composingRef.current = false;
    commitInput(e.currentTarget.value, e.currentTarget);
  };

  // exam rules: caret stays at the end, no arrow keys, no paste, no drag
  const lockCaret = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget, n = t.value.length;
    if (t.selectionStart !== n || t.selectionEnd !== n) t.setSelectionRange(n, n);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)) e.preventDefault();
    if (e.key === "Tab") {
      if (tabKeyPolicy === "blocked") {
        e.preventDefault();
      } else {
        // Treat Tab as passage input when the template explicitly permits it; never move focus away.
        e.preventDefault();
        const input = e.currentTarget;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        input.setRangeText("\t", start, end, "end");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    if (e.key === "Enter" && enterKeyPolicy === "blocked") e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && ["a", "v", "x", "z", "y"].includes(e.key.toLowerCase())) e.preventDefault();
  };
  const printReference = () => {
    const target = window.open("", "_blank");
    if (!target) {
      window.alert("Allow pop-ups for this site to print the passage or save it as PDF.");
      return;
    }
    const escaped = reference.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const printSize = Math.max(8, Math.min(24, fontSizePt));
    const fontFamily = passageFontFamily === "serif" ? "Georgia, serif" : passageFontFamily === "mono" ? "monospace" : "Arial, sans-serif";
    const alignment = passageAlignment === "justify" ? "justify" : passageAlignment === "center" ? "center" : "left";
    const pageSize = printPageSize === "Letter" ? "Letter" : printPageSize === "Legal" ? "Legal" : "A4";
    target.document.open();
    target.document.write(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${examName.replace(/</g, "&lt;").replace(/>/g, "&gt;")} passage</title><style>body{font-family:${fontFamily};max-width:850px;margin:36px auto;padding:0 24px;color:#172033;line-height:${passageLineSpacing};text-align:${alignment}}h1{font-size:16pt;margin-bottom:8px}p{white-space:${passageLayout === "continuous" ? "normal" : "pre-wrap"};font-size:${printSize}pt}@page{size:${pageSize};margin:20mm}@media print{body{margin:0;max-width:none}}</style></head><body><h1>${examName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h1><p>${escaped}</p></body></html>`);
    target.document.close();
    target.focus();
    target.print();
  };

  const block = (e: React.SyntheticEvent) => e.preventDefault();

  const typedChars = Array.from(value);
  const activeIdx = typedChars.length;

  return (
    <section className="sim tsz-exam-screen" aria-label="Typing test">
      <header className="tsz-exam-screen-header">
        <div className="tsz-exam-screen-brand"><span className="tsz-exam-screen-mark">TS</span><div><strong>TypingSkillZone</strong><small>{examName}</small></div></div>
        <div className="tsz-exam-screen-status"><span className="tsz-live-dot" /> {phase === "warmup" ? "WARM-UP" : phase === "break" ? "BREAK" : done ? "COMPLETED" : "LIVE TEST"}</div>
      </header>
      <div className="tsz-exam-screen-meta">
        <span><small>LANGUAGE</small><strong>{lang === "hi" ? "Hindi" : "English"}</strong></span>
        <span><small>DURATION</small><strong>{Math.round(durationSec / 60)} minutes</strong></span>
        <span><small>WORDS TYPED</small><strong>{typedChars.filter((c, i) => /\s/u.test(c) && i > 0).length + (typedChars.length ? 1 : 0)}</strong></span>
        <span><small>CORRECTION</small><strong>{backspace === "full" ? "Full backspace" : backspace === "word" ? "Word only" : "Disabled"}</strong></span>
      </div>
      <div className="sim-bar">
        <div className={(phase === "test" ? left : phaseLeft) < 30 ? "clock low" : "clock"} role="timer" aria-live="off">{fmt(phase === "test" ? left : phaseLeft)}</div>
        <div className="meter" aria-hidden><i style={{ width: `${refChars.length ? Math.min(100, (typedChars.length / refChars.length) * 100) : 0}%` }} /></div>
        <div className="rules">
          {displayMode === "highlighted" ? "Highlighted" : displayMode === "unhighlighted" ? "Unhighlighted" : "Paper to screen"} ·{" "}
          {backspace === "full" ? "Backspace on" : backspace === "word" ? "Backspace in current word" : "Backspace off"}
        </div>
      </div>

      {hasRrbPhases && phase !== "test" && <div className="mode-note" role="status"><strong>{phase === "warmup" ? "RRB CBTST warm-up" : "Break before scored test"}</strong><p>{phase === "warmup" ? "Practise for one minute. This typing is not scored and will be cleared automatically." : "Your one-minute break is in progress. The scored 10-minute test starts automatically when it ends."}</p></div>}
      {displayMode === "offscreen" && <div className="offscreen-print-tools"><p>The passage is hidden during this exam mode. Print it or choose “Save as PDF” before typing, then return here to start.</p><button type="button" className="go alt" onClick={printReference}>Print passage / Save as PDF</button></div>}
      <div className={`sheet ${lang === "hi" ? "hi" : ""} ${displayMode} layout-${passageLayout}`} ref={boxRef} lang={lang} tabIndex={-1} onClick={() => taRef.current?.focus()} style={{ fontSize: `${Math.max(8, Math.min(24, fontSizePt))}pt`, whiteSpace: passageLayout === "continuous" ? "normal" : "pre-wrap", fontFamily: passageFontFamily === "serif" ? "Georgia, serif" : passageFontFamily === "mono" ? "monospace" : undefined, textAlign: passageAlignment === "justify" ? "justify" : passageAlignment === "center" ? "center" : "left", lineHeight: Math.max(1.1, Math.min(2.5, passageLineSpacing)), ["--passage-paragraph-spacing" as any]: `${Math.max(0, Math.min(32, passageParagraphSpacing))}px` }}>
        {displayMode === "highlighted"
          ? tokens.map((tk, i) => {
              const slice = typedChars.slice(tk.start, tk.start + tk.len).join("");
              const active = !tk.space && activeIdx >= tk.start && activeIdx <= tk.start + tk.len && !done;
              return tk.space ? <span key={i} style={tk.text.includes("\n\n") ? { display: "block", marginBottom: `${Math.max(0, Math.min(32, passageParagraphSpacing))}px` } : undefined}>{tk.text}</span> : <Word key={i} text={tk.text} typed={slice} active={active} />;
            })
          : displayMode === "unhighlighted"
            ? <span className="plain">{reference.split(/\n{2,}/u).map((paragraph, index) => <span key={index} style={{ display: "block", marginBottom: `${Math.max(0, Math.min(32, passageParagraphSpacing))}px` }}>{paragraph}</span>)}</span>
            : <div className="offscreen-placeholder">Paper-to-screen mode · passage hidden</div>}
      </div>

      <textarea
        ref={taRef}
        className="entry"
        value={value}
        lang={lang}
        readOnly={done || phase === "break"}
        onChange={onChange}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        onKeyDown={onKeyDown}
        onSelect={lockCaret}
        onClick={lockCaret}
        onPaste={block}
        onCut={block}
        onDrop={block}
        onDragStart={block}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        placeholder={phase === "warmup" ? "Warm-up only — this text will be cleared before the scored test." : phase === "break" ? "Break in progress — please wait for the scored test." : displayMode === "offscreen" ? "Type the printed passage here. The timer starts with your first key." : "Start typing. The timer starts with your first key."}
        aria-label="Type here"
        rows={displayMode === "offscreen" ? 8 : 4}
      />
      {done && <p className="note">Time is up or the passage is complete. Calculating your result.</p>}
    </section>
  );
}
