export default function TermsPage() {
  return (
    <div className="page">
      <h1>Terms of Service</h1>
      <p className="hint">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using TypingSkillZone, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
      </section>

      <section>
        <h2>2. Description of Service</h2>
        <p>TypingSkillZone provides online typing practice and examination simulation services for educational purposes. The platform is not affiliated with any government recruitment body.</p>
      </section>

      <section>
        <h2>3. User Accounts</h2>
        <ul>
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You must provide accurate information during registration.</li>
          <li>You may not create multiple accounts to circumvent limitations.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
        </ul>
      </section>

      <section>
        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Attempt to manipulate scores, rankings, or test results.</li>
          <li>Use automated scripts or bots to interact with the platform.</li>
          <li>Share login credentials with others.</li>
          <li>Upload malicious content or passages.</li>
          <li>Impersonate other users or institutions.</li>
          <li>Reverse engineer or attempt to extract source code.</li>
        </ul>
      </section>

      <section>
        <h2>5. Intellectual Property</h2>
        <p>All content on TypingSkillZone, including software, design, and original content, is protected by copyright. Exam names and patterns referenced are the property of their respective organizations.</p>
      </section>

      <section>
        <h2>6. Subscriptions and Payments</h2>
        <ul>
          <li>Pro subscriptions are one-time purchases with no automatic renewal.</li>
          <li>All payments are processed securely via Cashfree (India) or Stripe (international).</li>
          <li>Refund requests are evaluated on a case-by-case basis.</li>
          <li>We reserve the right to modify pricing with notice to existing subscribers.</li>
        </ul>
      </section>

      <section>
        <h2>7. Disclaimers</h2>
        <ul>
          <li>Exam simulators are for practice only and may not exactly match official examinations.</li>
          <li>Always verify exam details from official notifications.</li>
          <li>We do not guarantee any specific exam results or job placement.</li>
          <li>Service availability may be affected by maintenance or technical issues.</li>
        </ul>
      </section>

      <section>
        <h2>8. Limitation of Liability</h2>
        <p>TypingSkillZone shall not be liable for any indirect, incidental, or consequential damages arising from use of the service.</p>
      </section>

      <section>
        <h2>9. Changes to Terms</h2>
        <p>We may update these terms periodically. Continued use after changes constitutes acceptance.</p>
      </section>

      <section>
        <h2>10. Governing Law</h2>
        <p>These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in India.</p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>For questions about these terms, contact us through our <a href="/contact">contact form</a>.</p>
      </section>
    </div>
  );
}
