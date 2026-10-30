export default function ExamResults() {
  return (
    <main className="public-page">
      <span className="public-kicker">Performance & evaluation</span>
      <h1 className="public-title">Exam-based typing results</h1>
      <p className="public-lead">
        Every completed test is evaluated using its selected examination rules. Review your own saved attempts, compare your typing with the reference passage and track your progress securely from your account.
      </p>
      <section className="result-grid" style={{ marginTop: 30 }}>
        <article className="result-card">
          <strong>Net WPM</strong>
          <p>Typing speed calculated using the selected exam’s scoring method.</p>
        </article>
        <article className="result-card">
          <strong>Accuracy</strong>
          <p>See your accuracy and the errors counted under the selected exam rules.</p>
        </article>
        <article className="result-card">
          <strong>Detailed review</strong>
          <p>Compare your typed text with the reference and identify every mistake.</p>
        </article>
      </section>
      <div className="public-actions" style={{ marginTop: 30 }}>
        <a className="site-button" href="/simulators">Explore exam simulators</a>
        <a className="site-button secondary" href="/dashboard">View my results</a>
      </div>
    </main>
  );
}
