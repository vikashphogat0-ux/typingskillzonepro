"use client";

import { useMemo, useState } from "react";

const categories = ["All", "Practice & exams", "Results & account", "Plans & payments", "Institutes", "Support"] as const;
type Category = (typeof categories)[number];

const items: { question: string; answer: string; category: Exclude<Category, "All">; keywords: string }[] = [
  {
    question: "How do I start practising?",
    answer: "Open the exam catalogue, choose an available examination module and language, review its instructions, then launch the simulator or available practice option.",
    category: "Practice & exams",
    keywords: "start begin simulator exam catalogue test",
  },
  {
    question: "Are English and Hindi tests available?",
    answer: "Language availability depends on the exam modules currently listed in the catalogue. Check the language options on the exam you want to practise.",
    category: "Practice & exams",
    keywords: "english hindi language devanagari",
  },
  {
    question: "How is typing speed calculated?",
    answer: "Speed and accuracy are calculated using the scoring profile configured for the selected exam. Read the on-screen instructions before starting because rules can differ between exams.",
    category: "Practice & exams",
    keywords: "wpm speed accuracy score calculation",
  },
  {
    question: "Can I use backspace during a test?",
    answer: "Backspace and other keyboard behaviour depend on the selected simulator's exam configuration. The applicable instructions are shown before the test begins.",
    category: "Practice & exams",
    keywords: "backspace keyboard delete correction rules",
  },
  {
    question: "Where can I find daily or monthly passages?",
    answer: "Open the relevant exam simulator and use the passage area available for that exam. Passage access and language options can vary by module.",
    category: "Practice & exams",
    keywords: "passage daily monthly library archive download",
  },
  {
    question: "Can I review previous attempts?",
    answer: "Sign in and open Results & Analytics or your dashboard to review saved attempts and the performance information available to your account.",
    category: "Results & account",
    keywords: "results history dashboard attempts analytics",
  },
  {
    question: "I cannot sign in or access my account. What should I do?",
    answer: "Check that you are using the email address associated with your account. If the issue continues, contact support and describe the page, error message and approximate time it occurred. Never send your password.",
    category: "Results & account",
    keywords: "login sign in password account access verification",
  },
  {
    question: "How do I purchase a student plan?",
    answer: "Sign in, open the pricing page, review the current plan details and enter the requested payment contact information. Checkout begins only after the server creates a payment session.",
    category: "Plans & payments",
    keywords: "pricing subscription student plan buy purchase cashfree",
  },
  {
    question: "What if my payment is successful but my plan has not updated?",
    answer: "Do not immediately pay again. The pricing page checks payment confirmation and provides a way to refresh your subscription status. If access remains unchanged, contact support with your order reference; do not share card, UPI PIN or OTP details.",
    category: "Plans & payments",
    keywords: "payment successful pending order cashfree subscription not activated",
  },
  {
    question: "Do you offer institute accounts?",
    answer: "Institute access and features depend on the available institute registration and approval process. Visit the institute section for the current registration route and plan information.",
    category: "Institutes",
    keywords: "institute typing centre school batch registration",
  },
  {
    question: "How can I contact support?",
    answer: "Use the Contact page for account access, exam settings, payment or technical issues. Include the affected page and a clear description so the team can investigate.",
    category: "Support",
    keywords: "help contact support technical feedback",
  },
];

export default function FAQs() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const searchable = `${item.question} ${item.answer} ${item.keywords}`.toLowerCase();
      return matchesCategory && (!normalized || searchable.includes(normalized));
    });
  }, [category, query]);

  return (
    <main className="help-page">
      <section className="help-hero">
        <span className="public-kicker">TYPINGSKILLZONE HELP CENTRE</span>
        <h1>How can we help?</h1>
        <p>Find clear guidance on exam practice, keyboard rules, results, subscriptions and institute access.</p>
        <label className="help-search">
          <span className="sr-only">Search help articles</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a question, topic or keyword…"
          />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
        </label>
        <div className="help-hero-note">Search the help centre or browse by topic below.</div>
      </section>

      <section className="help-content" aria-label="Frequently asked questions">
        <div className="help-category-row" aria-label="Filter questions by category">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? "help-category active" : "help-category"}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="help-results-heading">
          <div>
            <span className="public-kicker">QUICK ANSWERS</span>
            <h2>{category === "All" ? "Frequently asked questions" : category}</h2>
          </div>
          <span className="help-result-count" aria-live="polite">{filteredItems.length} {filteredItems.length === 1 ? "answer" : "answers"}</span>
        </div>

        {filteredItems.length ? (
          <div className="help-question-list">
            {filteredItems.map((item) => {
              const isOpen = openQuestion === item.question;
              return (
                <article className={isOpen ? "help-question is-open" : "help-question"} key={item.question}>
                  <button
                    type="button"
                    className="help-question-toggle"
                    aria-expanded={isOpen}
                    onClick={() => setOpenQuestion(isOpen ? null : item.question)}
                  >
                    <span><small>{item.category}</small><strong>{item.question}</strong></span>
                    <span className="help-question-icon" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && <div className="help-answer"><p>{item.answer}</p></div>}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="help-empty" role="status">
            <strong>No matching answers found</strong>
            <p>Try a different keyword or clear the selected topic.</p>
            <button type="button" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</button>
          </div>
        )}
      </section>

      <section className="help-contact-panel">
        <div>
          <span className="public-kicker">NEED MORE HELP?</span>
          <h2>Talk to the support team.</h2>
          <p>For account, exam configuration, payment or technical issues, send us the details of what happened.</p>
        </div>
        <a className="site-button" href="/contact">Contact support</a>
      </section>
    </main>
  );
}
