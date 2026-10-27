import { FINGERS, KB_ROWS, baseKey, fingerFor, needsShift } from "@/lib/lessons";

const colorOf = (k: string) => FINGERS.find((f) => f.chars.includes(k))?.color ?? "#fff";

export default function FingerGuide({ target, flash }: { target: string; flash: boolean }) {
  const base = target ? baseKey(target) : "";
  const finger = target ? fingerFor(target) : null;
  const shift = target ? needsShift(target) : false;
  return (
    <div className="guide" aria-label="Finger placement guide">
      {KB_ROWS.map((row, i) => (
        <div key={row} className="kb-row" style={{ marginLeft: i * 16 }}>
          {row.split("").map((k) => (
            <span key={k} className={`key${k === base ? " on" : ""}${k === base && flash ? " flash" : ""}${"fjFJ".includes(k) ? " bump" : ""}`} style={{ background: colorOf(k) }}>{k}</span>
          ))}
        </div>
      ))}
      <div className="kb-row" style={{ marginLeft: 70 }}>
        <span className={`key wide${target === " " ? " on" : ""}`} style={{ background: colorOf(" ") }}>space</span>
      </div>
      <p className="finger-say" aria-live="polite">
        {target ? <>Press <b>{target === " " ? "space" : target}</b> with your <b>{finger?.name.toLowerCase() ?? "finger"}</b>{shift ? ", holding Shift with the other hand" : ""}.</> : "Ready."}
      </p>
      <div className="legend">{FINGERS.slice(0, 8).map((f) => <span key={f.name}><i style={{ background: f.color }} />{f.name}</span>)}</div>
    </div>
  );
}
