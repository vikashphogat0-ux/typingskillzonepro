"use client";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import TypingSimulator, { type SimResult } from "@/components/TypingSimulator";
import Leaderboard from "@/components/Leaderboard";
import { api } from "@/lib/clientApi";

interface SimInfo {
  slug: string;
  name: string;
  language: "en" | "hi";
  duration_sec: number;
  display_mode: string;
  backspace: string;
  scoring: any;
  description?: string;
  participants?: number;
  my_best?: string | null;
}

const MODE_LABELS: Record<string, string> = {
  highlighted: "Highlighted — passage on screen, characters colour as you type",
  unhighlighted: "Unhighlighted — passage on screen, no colour feedback",
  offscreen: "Paper to screen — read the printed passage, type from memory",
};
const examMark = (slug: string) => {
  if (slug.includes("ssc-chsl")) return { mark: "SSC", tone: "violet", family: "Staff Selection Commission" };
  if (slug.includes("ssc-cgl")) return { mark: "CGL", tone: "blue", family: "Combined Graduate Level" };
  if (slug.includes("rrb") || slug.includes("railway")) return { mark: "RRB", tone: "orange", family: "Railway Recruitment" };
  if (slug.includes("delhi-police")) return { mark: "DP", tone: "red", family: "Delhi Police" };
  if (slug.includes("court")) return { mark: "HC", tone: "teal", family: "Court Typing" };
  if (slug.includes("bsf")) return { mark: "BSF", tone: "green", family: "Border Security Force" };
  return { mark: "TSZ", tone: "blue", family: "Typing practice" };
};

const BS_LABELS: Record<string, string> = {
  full: "Full backspace — delete anywhere in your typed text",
  word: "Current word only — backspace cannot cross a space",
  disabled: "Disabled — no corrections allowed",
};

export default function SimulatorPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [sim, setSim] = useState<SimInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"rules" | "leaderboard">("rules");

  // test state
  const [testState, setTestState] = useState<"idle" | "starting" | "running" | "done">("idle");
  const [testData, setTestData] = useState<any>(null);
  const [startErr, setStartErr] = useState("");

  useEffect(() => {
    if (!slug) return;
    api(`/api/simulators/${slug}`)
      .then(r => {
        if (r.ok) setSim(r.data);
        else setError(r.data.error ?? "Simulator not found.");
      })
      .catch(() => setError("Network error. Please refresh."))
      .finally(() => setLoading(false));
  }, [slug]);

  const startTest = async () => {
    setStartErr("");
    setTestState("starting");
    const r = await api("/api/tests/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (!r.ok) {
      setTestState("idle");
      if (r.status === 401) {
        setStartErr("Sign in to use exam simulators.");
      } else if (r.status === 402) {
        setStartErr(r.data.error ?? "Daily limit reached. Upgrade to Pro for unlimited tests.");
      } else {
        setStartErr(r.data.error ?? "Could not start the test. Try again.");
      }
      return;
    }
    setTestData(r.data);
    setTestState("running");
  };

  const onFinish = useCallback(async (result: SimResult) => {
    setTestState("done");
    try { sessionStorage.setItem("tsz:last", JSON.stringify(result)); } catch {}
    const res = await api("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...result, testId: testData?.testId }),
    }).then(r => r.data).catch(() => null);
    router.push(res?.id ? `/results/${res.id}` : "/dashboard");
  }, [router, testData]);

  if (loading) return <div className="page"><p>Loading…</p></div>;
  if (error || !sim) return (
    <div className="page">
      <h1>Simulator not found</h1>
      <p>{error}</p>
      <a href="/simulators" className="go alt">Back to simulators</a>
    </div>
  );

  // Running state — show full-screen simulator
  if (testState === "running" && testData) {
    return (
      <div className="page">
        <TypingSimulator
          key={testData.testId}
          passage={testData.reference}
          lang={testData.lang}
          durationSec={testData.durationSec}
          mode={testData.mode}
          backspace={testData.backspace}
          profile={testData.profile}
          onFinish={onFinish}
        />
      </div>
    );
  }

  const scoring = sim.scoring ?? {};
  const isQualifying = scoring.qualifyingWpm !== undefined;

  return (
    <div className="page">
      <nav className="crumbs">
        <a href="/">Home</a> / <a href="/simulators">Explore exam options</a> / {sim.name}
      </nav>

      <section className="sim-detail-hero">
        <div className={`exam-emblem ${examMark(sim.slug).tone}`}><span>{examMark(sim.slug).mark}</span><small>EXAM PREP</small></div>
        <div>
          <div className="eyebrow">{examMark(sim.slug).family}</div>
          <h1>{sim.name}</h1>
          <p>{sim.language === "hi" ? "हिंदी (Hindi)" : "English"} · {Math.max(1, Math.round(sim.duration_sec / 60))} minutes · {sim.participants ?? 0} ranked participants{sim.my_best ? ` · your best ${sim.my_best} net WPM` : ""}</p>
          {sim.description && <p>{sim.description}</p>}
        </div>
      </section>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "rules"} onClick={() => setTab("rules")}>
          Exam Rules &amp; Setup
        </button>
        <button role="tab" aria-selected={tab === "leaderboard"} onClick={() => setTab("leaderboard")}>
          Leaderboard
        </button>
      </div>

      {tab === "rules" && (
        <>
          <div className="sim-rules-box">
            <h2>Exam pattern &amp; scoring setup</h2>

            <table className="rules-table">
              <tbody>
                <tr>
                  <th>Duration</th>
                  <td>{Math.round(sim.duration_sec / 60)} minutes ({sim.duration_sec} seconds)</td>
                </tr>
                <tr>
                  <th>Language</th>
                  <td>{sim.language === "hi" ? "हिंदी (Hindi / Devanagari)" : "English"}</td>
                </tr>
                <tr>
                  <th>Display mode</th>
                  <td>{MODE_LABELS[sim.display_mode] ?? sim.display_mode}</td>
                </tr>
                <tr>
                  <th>Backspace policy</th>
                  <td>{BS_LABELS[sim.backspace] ?? sim.backspace}</td>
                </tr>
                <tr>
                  <th>Speed unit</th>
                  <td>
                    {scoring.unit === "keystrokes"
                      ? "Key depressions (every keystroke including backspace counted)"
                      : "Words per minute (5 characters = 1 word)"}
                  </td>
                </tr>
                <tr>
                  <th>Net speed formula</th>
                  <td>
                    {scoring.netMethod === "penalty"
                      ? "Net WPM = Gross WPM − (full errors + 0.5 × half errors) ÷ minutes"
                      : "Net WPM = Gross WPM × accuracy %"}
                  </td>
                </tr>
                <tr>
                  <th>Full mistake</th>
                  <td>Wrong word, extra word, or missed word — costs {scoring.fullErrorWeight ?? 1} error unit</td>
                </tr>
                <tr>
                  <th>Half mistake</th>
                  <td>
                    {[
                      scoring.halfRules?.caseOnly ? "Capital/small letter difference" : null,
                      scoring.halfRules?.punctuationOnly ? "Punctuation difference" : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "None"}
                    {" "}— costs {scoring.halfErrorWeight ?? 0.5} error unit
                  </td>
                </tr>
                {isQualifying && (
                  <tr>
                    <th>Qualifying speed</th>
                    <td>
                      <strong>{scoring.qualifyingWpm} net WPM</strong>
                      {scoring.unit === "keystrokes"
                        ? ` (= ${Math.round(scoring.qualifyingWpm * 5 * 60)} key depressions per hour)`
                        : ""}
                    </td>
                  </tr>
                )}
                {scoring.maxErrorPercent !== undefined && (
                  <tr>
                    <th>Maximum errors</th>
                    <td>{scoring.maxErrorPercent}% of typed words</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="mode-explainer">
              {sim.display_mode === "highlighted" && (
                <div className="mode-note">
                  <strong>Highlighted mode:</strong> The passage is shown above. As you type, characters turn{" "}
                  <span style={{ color: "#1f7a4d", background: "#e3f4ea", padding: "0 3px" }}>green</span> for correct and{" "}
                  <span style={{ color: "#c0182b", background: "#fde7ea", padding: "0 3px" }}>red</span> for wrong.
                  The current word is <span style={{ background: "#f6d365", padding: "0 3px" }}>highlighted</span>.
                </div>
              )}
              {sim.display_mode === "unhighlighted" && (
                <div className="mode-note">
                  <strong>Unhighlighted mode:</strong> The passage is shown above in plain text — no colour feedback while
                  you type. Compare after you submit.
                </div>
              )}
              {sim.display_mode === "offscreen" && (
                <div className="mode-note">
                  <strong>Paper to screen mode:</strong> The passage is shown above <em>before</em> the test. Once you
                  start typing the passage scrolls away. Type what you read — just like a real exam where you copy
                  from a printed sheet.
                </div>
              )}
            </div>

            {startErr && (
              <p className="err" role="alert">
                {startErr}{" "}
                {startErr.includes("Sign in") && <a href={`/login?next=/simulators/${slug}`}>Sign in</a>}
                {startErr.includes("Pro") && <a href="/pricing">Upgrade to Pro</a>}
              </p>
            )}

            <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button
                className="go"
                onClick={startTest}
                disabled={testState === "starting"}
                aria-busy={testState === "starting"}
              >
                {testState === "starting" ? "Preparing test…" : "Start this exam"}
              </button>
              <a href="/simulators" className="go alt">Explore exam options</a>
            </div>

            <p className="hint" style={{ marginTop: 12 }}>
              Rules are configured for this exam so attempts can be compared consistently.
              Always verify your exam&apos;s exact rules from the official recruitment notification.
            </p>
          </div>
        </>
      )}

      {tab === "leaderboard" && slug && <Leaderboard slug={slug} />}
    </div>
  );
}
