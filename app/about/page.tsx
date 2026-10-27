export default function AboutPage() {
  return (
    <div className="page">
      <h1>About TypingSkillZone</h1>

      <section>
        <h2>Our Mission</h2>
        <p>TypingSkillZone is an independent typing practice platform designed specifically for Indian government exam aspirants. We help students prepare for typing tests conducted by SSC, RRB, Delhi Police, Courts, and various state recruitment bodies.</p>
      </section>

      <section>
        <h2>What We Offer</h2>
        <ul>
          <li><strong>Exam-Specific Simulators:</strong> Practice typing tests that follow exact exam rules including timing, display modes, backspace policies, and scoring methods.</li>
          <li><strong>English & Hindi Support:</strong> Full support for both languages with proper Unicode handling for Hindi Devanagari script.</li>
          <li><strong>Real-Time Analytics:</strong> Track your speed, accuracy, and improvement over time with detailed performance metrics.</li>
          <li><strong>Centralized Passage Library:</strong> Daily fresh passages with a searchable archive for targeted practice.</li>
          <li><strong>Institution Management:</strong> Typing centers can manage batches, assign tests, and track student progress.</li>
        </ul>
      </section>

      <section>
        <h2>Accuracy You Can Trust</h2>
        <p>Our scoring engine implements the actual calculation methods used in official examinations. Each simulator's rules are verified against official notifications where possible. We continuously update our profiles as new exam patterns are announced.</p>
      </section>

      <section>
        <h2>Disclaimer</h2>
        <p className="hint">TypingSkillZone is an independent preparation platform and is not affiliated with, endorsed by, or connected to any government recruitment body, SSC, RRB, or any official examination authority. All exam names and patterns are referenced for educational purposes. Always verify exam details from official notifications.</p>
      </section>
    </div>
  );
}
