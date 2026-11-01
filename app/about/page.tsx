const capabilities = [
  {
    number: "01",
    title: "Exam-specific practice",
    description:
      "Prepare in dedicated typing environments built around each exam module’s configured timing, passage display, keyboard rules and scoring profile.",
    detail: "SSC · RRB · Delhi Police · Courts",
  },
  {
    number: "02",
    title: "English and Hindi typing",
    description:
      "Switch between available language modules and practise English or Hindi passages with the appropriate text handling.",
    detail: "English · Hindi (Devanagari)",
  },
  {
    number: "03",
    title: "Performance insights",
    description:
      "Review typing speed, accuracy and saved attempts to understand your progress and identify areas that need more practice.",
    detail: "Results · Analytics · Progress",
  },
  {
    number: "04",
    title: "Passage practice",
    description:
      "Find practice material through exam-specific passage areas and available daily or monthly collections.",
    detail: "Searchable · Organised · Exam-focused",
  },
  {
    number: "05",
    title: "Institute support",
    description:
      "Participating typing institutes can use institute-oriented features to organise learners and review student practice.",
    detail: "Batches · Assignments · Student progress",
  },
  {
    number: "06",
    title: "A focused learning experience",
    description:
      "Use lessons and targeted drills to build typing fundamentals alongside examination-style practice.",
    detail: "Lessons · Drills · Consistent practice",
  },
];

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <span className="about-eyebrow">ABOUT TYPINGSKILLZONE</span>
          <h1>Purpose-built typing practice for competitive exams.</h1>
          <p>
            TypingSkillZone is an independent typing practice platform for
            Indian government examination aspirants. It brings exam-focused
            simulators, language practice, passage resources and performance
            tools together in one place.
          </p>
          <div className="about-hero-actions">
            <a className="about-primary-action" href="/exams">Explore exams</a>
            <a className="about-secondary-action" href="/contact">Contact support</a>
          </div>
        </div>
        <div className="about-hero-panel" aria-label="Platform focus areas">
          <span className="about-panel-label">THE PRACTICE FRAMEWORK</span>
          <div className="about-panel-item">
            <span>01</span>
            <div><strong>Understand the pattern</strong><small>Choose your examination and language</small></div>
          </div>
          <div className="about-panel-item">
            <span>02</span>
            <div><strong>Practise with purpose</strong><small>Use the relevant simulator, lessons and drills</small></div>
          </div>
          <div className="about-panel-item">
            <span>03</span>
            <div><strong>Review your progress</strong><small>Learn from your saved performance history</small></div>
          </div>
          <p className="about-panel-footnote">A structured place to prepare, practise and improve.</p>
        </div>
      </section>

      <section className="about-mission">
        <div>
          <span className="about-eyebrow">OUR MISSION</span>
          <h2>Make typing preparation more structured and accessible.</h2>
        </div>
        <p>
          Typing requirements differ from one recruitment examination to
          another. Our goal is to help learners practise with the relevant
          exam configuration, understand their performance and build skills
          through consistent, focused preparation.
        </p>
      </section>

      <section className="about-capabilities">
        <div className="about-section-heading">
          <span className="about-eyebrow">WHAT YOU CAN DO HERE</span>
          <h2>One platform. Multiple ways to practise.</h2>
          <p>Explore the tools and learning areas available on TypingSkillZone.</p>
        </div>
        <div className="about-capability-grid">
          {capabilities.map((item) => (
            <article className="about-capability-card" key={item.number}>
              <span className="about-capability-number">{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="about-accuracy">
        <div className="about-accuracy-mark" aria-hidden="true">TSZ</div>
        <div>
          <span className="about-eyebrow">EXAM CONFIGURATION MATTERS</span>
          <h2>Practise with the instructions in mind.</h2>
          <p>
            Simulator behaviour and scoring are determined by the exam
            configuration available on the platform. Review the instructions
            shown before each test. Where official patterns are referenced,
            always cross-check the latest recruitment notification issued by
            the relevant authority.
          </p>
        </div>
      </section>

      <section className="about-disclaimer">
        <div>
          <span className="about-eyebrow">IMPORTANT INFORMATION</span>
          <h2>An independent preparation platform</h2>
        </div>
        <p>
          TypingSkillZone is not affiliated with, endorsed by, or connected to
          any government recruitment body, SSC, RRB, Delhi Police, court or
          official examination authority. Examination names and pattern
          references are used only to identify educational practice
          categories. Official notifications and instructions remain the
          authoritative source for recruitment requirements.
        </p>
      </section>

      <section className="about-bottom-cta">
        <div>
          <span className="about-eyebrow">READY TO PRACTISE?</span>
          <h2>Choose your exam and get started.</h2>
          <p>Find the available exam modules and begin a focused practice session.</p>
        </div>
        <a className="about-primary-action" href="/exams">Browse exam modules</a>
      </section>
    </main>
  );
}
