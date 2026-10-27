import { annotate, type Token } from "@/lib/diff";
import type { WordOp } from "@/lib/wpmCalculator";

const Ref = ({ t }: { t: Token }) => {
  if (t.kind === "ok") return <>{t.ref}</>;
  if (t.kind === "omit") return <mark className="m-omit" title="You skipped this word">{t.ref}</mark>;
  if (t.kind === "half") return <mark className="m-half" title={`Half mistake: you typed "${t.typed}"`}>{t.ref}</mark>;
  if (t.kind === "full") return <mark className="m-full" title={`You typed "${t.typed}"`}>{t.ref}</mark>;
  return null;
};
const Typed = ({ t }: { t: Token }) => {
  if (t.kind === "ok") return <>{t.typed}</>;
  if (t.kind === "omit") return <span className="gap" title={`Missing: ${t.ref}`}>▁▁</span>;
  if (t.kind === "extra") return <mark className="m-extra" title="Extra word, not in the passage">{t.typed}</mark>;
  const cls = t.kind === "half" ? "m-half" : "m-full";
  return <mark className={cls} title={`Should be "${t.ref}"`}>{t.typed}</mark>;
};

/** Reference and typed text side by side, with every mistake marked, then a word-by-word correction list. */
export default function ComparisonView({ ops, hindi }: { ops: WordOp[]; hindi?: boolean }) {
  const toks = annotate(ops);
  const bad = toks.filter((t) => t.kind !== "ok");
  const join = (items: React.ReactNode[]) => items.flatMap((x, i) => (i ? [" ", x] : [x]));
  return (
    <div className="cmp">
      <div className="legend cmp-legend">
        <span><mark className="m-full">wrong word</mark></span><span><mark className="m-half">half mistake (capital or punctuation)</mark></span>
        <span><mark className="m-omit">skipped</mark></span><span><mark className="m-extra">extra word</mark></span>
      </div>
      <div className="cmp-grid">
        <section aria-label="Reference text"><h3>Reference</h3>
          <p className={`cmp-text${hindi ? " hi" : ""}`}>{join(toks.map((t, i) => <Ref key={i} t={t} />))}</p></section>
        <section aria-label="What you typed"><h3>You typed</h3>
          <p className={`cmp-text${hindi ? " hi" : ""}`}>{join(toks.map((t, i) => <Typed key={i} t={t} />))}</p></section>
      </div>
      {bad.length > 0 && (
        <div className="tbl"><h3>Corrections ({bad.length})</h3>
          <table><thead><tr><th>Reference</th><th>You typed</th><th>What happened</th></tr></thead><tbody>
            {bad.slice(0, 40).map((t, i) => (
              <tr key={i}>
                <td className={hindi ? "hi" : ""}>{t.ref ? (t.segs ? t.segs.filter((s) => s.t !== "extra").map((s, k) => s.t === "missing" ? <u key={k} className="d-miss">{s.s}</u> : <span key={k}>{s.s}</span>) : t.ref) : "—"}</td>
                <td className={hindi ? "hi" : ""}>{t.typed ? (t.segs ? t.segs.filter((s) => s.t !== "missing").map((s, k) => s.t === "extra" ? <s key={k} className="d-extra">{s.s}</s> : <span key={k}>{s.s}</span>) : t.typed) : "—"}</td>
                <td>{t.kind === "omit" ? "Skipped word" : t.kind === "extra" ? "Extra word" : t.kind === "half" ? "Half mistake" : t.segs?.some((s) => s.t === "missing") && t.segs?.some((s) => s.t === "extra") ? "Wrong letters" : t.segs?.some((s) => s.t === "missing") ? "Missing letters" : "Extra letters"}</td>
              </tr>))}
          </tbody></table>
          {bad.length > 40 && <p className="hint">Showing the first 40 of {bad.length}.</p>}
        </div>)}
    </div>
  );
}
