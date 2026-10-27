export default function PrivacyPage() {
  return (
    <div className="page">
      <h1>Privacy Policy</h1>
      <p className="hint">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <section>
        <h2>Information We Collect</h2>
        <ul>
          <li><strong>Account Information:</strong> Name, email address, and password (securely hashed) when you create an account.</li>
          <li><strong>Typing Test Data:</strong> Your test attempts, scores, passages used, and keystroke patterns for scoring and anti-cheat purposes.</li>
          <li><strong>Usage Analytics:</strong> Pages visited, features used, and general site interactions to improve our service.</li>
          <li><strong>Payment Information:</strong> Transaction records via Cashfree. We do not store your card details.</li>
        </ul>
      </section>

      <section>
        <h2>How We Use Your Information</h2>
        <ul>
          <li>Provide typing practice services and store your test history.</li>
          <li>Calculate and verify your test scores accurately.</li>
          <li>Display your progress and analytics in your dashboard.</li>
          <li>Generate anonymized leaderboards for competitive practice.</li>
          <li>Send essential account notifications (email verification, password reset).</li>
          <li>Prevent fraud and ensure fair scoring.</li>
        </ul>
      </section>

      <section>
        <h2>Data Sharing</h2>
        <p>We do not sell your data. We may share:</p>
        <ul>
          <li>With institution administrators: Student names, emails, and test results for students who join their institute.</li>
          <li>With payment processors: Only necessary transaction data via Cashfree.</li>
          <li>Anonymized leaderboards: Names (if opted in) and scores publicly on simulator pages.</li>
        </ul>
      </section>

      <section>
        <h2>Your Rights</h2>
        <ul>
          <li>Access and download your personal data.</li>
          <li>Request correction of inaccurate information.</li>
          <li>Request account deletion (note: this may affect institution records and historical test data).</li>
          <li>Opt out of public leaderboards in your profile settings.</li>
        </ul>
      </section>

      <section>
        <h2>Data Security</h2>
        <p>We implement industry-standard security measures including encrypted connections (HTTPS), secure password hashing, and database access controls. However, no online service is 100% secure.</p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>For privacy-related inquiries, contact us through our <a href="/contact">contact form</a>.</p>
      </section>
    </div>
  );
}
