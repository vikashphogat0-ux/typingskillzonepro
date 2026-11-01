"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/clientApi";
import ExamEmblem from "@/components/ExamEmblem";

type Exam = {
  slug: string;
  name: string;
  language: "en" | "hi" | string;
  duration_sec: number;
  description?: string;
};

const popularTerms = ["BSF", "Delhi Police", "SSC CGL", "SSC CHSL", "RRB", "DSSSB", "Court", "CISF", "CRPF"];

function examIdentity(slug: string) {
  const value = slug.toLowerCase();
  if (value.includes("delhi-police") || value.includes("dp-hcm")) return { mark: "DP", short: "HCM", family: "Delhi Police", tone: "red" };
  if (value.includes("bsf")) return { mark: "BSF", short: "HCM", family: "Border Security Force", tone: "green" };
  if (value.includes("cisf")) return { mark: "CISF", short: "HCM", family: "Central Industrial Security Force", tone: "blue" };
  if (value.includes("crpf")) return { mark: "CRPF", short: "HCM", family: "Central Reserve Police Force", tone: "red" };
  if (value.includes("ssc")) return { mark: "SSC", short: value.includes("chsl") ? "CHSL" : value.includes("cgl") ? "CGL" : "SSC", family: "Staff Selection Commission", tone: "violet" };
  if (value.includes("rrb") || value.includes("railway")) return { mark: "RRB", short: "RRB", family: "Railway Recruitment Board", tone: "orange" };
  if (value.includes("dsssb")) return { mark: "DSSSB", short: "LDC", family: "Delhi Subordinate Services Selection Board", tone: "violet" };
  if (value.includes("court") || value.includes("jja") || value.includes("clerk")) return { mark: "HC", short: "COURT", family: "Court Recruitment", tone: "teal" };
  if (value.includes("ibps")) return { mark: "IBPS", short: "DEST", family: "Institute of Banking Personnel Selection", tone: "blue" };
  if (value.includes("supreme-court")) return { mark: "SCI", short: "JCA", family: "Supreme Court of India", tone: "gold" };
  if (value.includes("patna")) return { mark: "P&H", short: "HC", family: "Patna High Court", tone: "teal" };
  if (value.includes("allahabad")) return { mark: "AHC", short: "RO / ARO", family: "Allahabad High Court", tone: "teal" };
  if (value.includes("delhi-high-court")) return { mark: "DHC", short: "PA / JJA", family: "Delhi High Court", tone: "teal" };
  if (value.includes("bombay")) return { mark: "BHC", short: "HC", family: "Bombay High Court", tone: "teal" };
  if (value.includes("jharkhand")) return { mark: "JHC", short: "HC", family: "Jharkhand High Court", tone: "teal" };
  if (value.includes("punjab-haryana")) return { mark: "PHHC", short: "HC", family: "Punjab & Haryana High Court", tone: "teal" };
  if (value.includes("calcutta")) return { mark: "CHC", short: "HC", family: "Calcutta High Court", tone: "teal" };
  if (value.includes("mp-high-court")) return { mark: "MPHC", short: "JABALPUR", family: "Madhya Pradesh High Court", tone: "teal" };
  if (value.includes("rajasthan")) return { mark: "RHC", short: "JJA / LDC", family: "Rajasthan High Court", tone: "teal" };
  if (value.includes("chhattisgarh")) return { mark: "CGHC", short: "HC", family: "Chhattisgarh High Court", tone: "teal" };
  if (value.includes("telangana")) return { mark: "TGH", short: "HC", family: "Telangana High Court", tone: "teal" };
  if (value.includes("andhra-pradesh-high-court")) return { mark: "APHC", short: "HC", family: "Andhra Pradesh High Court", tone: "teal" };
  if (value.includes("gujarat")) return { mark: "GHC", short: "ASSISTANT", family: "Gujarat High Court", tone: "teal" };
  if (value.includes("bihar") || value.includes("bssc") || value.includes("beltron") || value.includes("bpsc") || value.includes("jeevika") || value.includes("bceceb")) return { mark: "BR", short: "BIHAR", family: "Bihar State Recruitment", tone: "orange" };
  if (value.includes("upsssc") || value.includes("uppsc") || value.includes("up-police") || value.includes("uppcl") || value.includes("bhu")) return { mark: "UP", short: "UTTAR PRADESH", family: "Uttar Pradesh Recruitment", tone: "orange" };
  if (value.includes("dsssb")) return { mark: "DSSSB", short: "DELHI", family: "Delhi Subordinate Services Selection Board", tone: "violet" };
  if (value.includes("dda")) return { mark: "DDA", short: "ASO / JSA", family: "Delhi Development Authority", tone: "violet" };
  if (value.includes("du-nta")) return { mark: "DU", short: "NTA", family: "University of Delhi", tone: "blue" };
  if (value.includes("jnu")) return { mark: "JNU", short: "NTA", family: "Jawaharlal Nehru University", tone: "blue" };
  if (value.includes("cbse")) return { mark: "CBSE", short: "BOARD", family: "Central Board of Secondary Education", tone: "blue" };
  if (value.includes("aiims")) return { mark: "AIIMS", short: "CRE", family: "All India Institute of Medical Sciences", tone: "blue" };
  if (value.includes("epfo")) return { mark: "EPFO", short: "SSA", family: "Employees' Provident Fund Organisation", tone: "blue" };
  if (value.includes("kvs")) return { mark: "KVS", short: "JSA", family: "Kendriya Vidyalaya Sangathan", tone: "blue" };
  if (value.includes("nvs")) return { mark: "NVS", short: "JSA", family: "Navodaya Vidyalaya Samiti", tone: "blue" };
  if (value.includes("emrs")) return { mark: "EMRS", short: "STAFF", family: "Eklavya Model Residential Schools", tone: "blue" };
  if (value.includes("wbpsc")) return { mark: "WBPSC", short: "CLERK", family: "West Bengal Public Service Commission", tone: "blue" };
  if (value.includes("ccras")) return { mark: "CCRAS", short: "SKILL", family: "Central Council for Research in Ayurvedic Sciences", tone: "blue" };
  if (value.includes("luvas")) return { mark: "LUVAS", short: "HISAR", family: "Lala Lajpat Rai University of Veterinary and Animal Sciences", tone: "blue" };
  if (value.includes("skau")) return { mark: "SKAU", short: "KURUKSHETRA", family: "Shri Krishna AYUSH University", tone: "blue" };
  if (value.includes("army-agniveer")) return { mark: "IA", short: "AGNIVEER", family: "Indian Army", tone: "green" };
  if (value.includes("ssb")) return { mark: "SSB", short: "HCM", family: "Sashastra Seema Bal", tone: "green" };
  if (value.includes("itbp")) return { mark: "ITBP", short: "HCM", family: "Indo-Tibetan Border Police", tone: "green" };
  return { mark: "TSZ", short: "PRACTICE", family: "TypingSkillZone", tone: "blue" };
}

export default function ExamsPage() {
  const [items, setItems] = useState<Exam[]>([]);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/api/templates")
      .then(result => {
        if (!active) return;
        if (result.ok && Array.isArray(result.data)) setItems(result.data);
        else setError(result.data?.error || "The exam catalogue is temporarily unavailable.");
      })
      .catch(() => { if (active) setError("Unable to connect to the exam catalogue. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter(exam => {
      const matchesLanguage = language === "all" || exam.language === language;
      const matchesQuery = !term || exam.name.toLowerCase().includes(term) || exam.slug.toLowerCase().includes(term) || (exam.description || "").toLowerCase().includes(term);
      return matchesLanguage && matchesQuery;
    });
  }, [items, query, language]);

  const clearFilters = () => { setQuery(""); setLanguage("all"); };

  return (
    <main className="exam-catalogue">
      <section className="exam-catalogue-heading">
        <div className="exam-catalogue-eyebrow"><span /> EXAMINATION DIRECTORY</div>
        <h1>All exams</h1>
        <p>Find your recruitment examination and open its dedicated typing practice modules.</p>

        <div className="exam-catalogue-toolbar">
          <label className="exam-catalogue-search">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search exams by name or keyword…" aria-label="Search exams by name or keyword" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
          </label>
          <label className="exam-catalogue-language">
            <span className="sr-only">Filter by language</span>
            <select value={language} onChange={event => setLanguage(event.target.value)}>
              <option value="all">All languages</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
        </div>

        <div className="exam-catalogue-stats" aria-label="Exam catalogue summary">
          <div><strong>{items.length}</strong><span>Total modules</span></div>
          <div><strong>{items.filter(exam => exam.language === "en").length}</strong><span>English modules</span></div>
          <div><strong>{items.filter(exam => exam.language === "hi").length}</strong><span>Hindi modules</span></div>
          <div><strong>{filtered.length}</strong><span>Matching results</span></div>
        </div>

        <div className="exam-popular">
          <div className="exam-popular-label">POPULAR EXAMS</div>
          <div className="exam-popular-list">
            {popularTerms.map(term => (
              <button type="button" className={query.toLowerCase() === term.toLowerCase() ? "is-active" : ""} key={term} onClick={() => setQuery(term)}>{term}</button>
            ))}
            {(query || language !== "all") && <button type="button" className="exam-filter-clear" onClick={clearFilters}>Clear filters</button>}
          </div>
        </div>
      </section>

      <section className="exam-catalogue-results" aria-live="polite">
        <div className="exam-results-heading">
          <div><span className="exam-results-kicker">AVAILABLE PRACTICE MODULES</span><h2>{query ? "Search results" : "Choose your examination"}</h2></div>
          {!loading && !error && <span className="exam-results-count">{filtered.length} {filtered.length === 1 ? "exam" : "exams"}</span>}
        </div>
        {loading ? <div className="exam-catalogue-state"><span className="loading-pulse" /> Loading examinations…</div> :
          error ? <div className="exam-catalogue-state" role="alert"><strong>Exam catalogue unavailable</strong><p>{error}</p><button type="button" onClick={() => { setLoading(true); setError(""); api("/api/templates").then(result => { if (result.ok && Array.isArray(result.data)) setItems(result.data); else setError(result.data?.error || "Unable to load exams."); }).catch(() => setError("Connection issue. Please try again.")).finally(() => setLoading(false)); }}>Try again</button></div> :
          filtered.length === 0 ? <div className="exam-catalogue-state"><strong>No matching examinations found</strong><p>Try another keyword or clear the selected filters.</p><button type="button" onClick={clearFilters}>Show all exams</button></div> :
          <div className="exam-catalogue-grid">
            {filtered.map(exam => {
              const identity = examIdentity(exam.slug);
              return (
                <article className="exam-catalogue-card" key={exam.slug}>
                  <div className="exam-catalogue-card-top">
                    <ExamEmblem slug={exam.slug} mark={identity.mark} short={identity.short} family={identity.family} tone={identity.tone} />
                    <div className="exam-catalogue-card-org"><span>{identity.family}</span><small>Recruitment examination</small></div>
                    <span className="exam-catalogue-language-tag">{exam.language === "hi" ? "हिंदी" : "ENGLISH"}</span>
                  </div>
                  <div className="exam-catalogue-card-body">
                    <h3>{exam.name}</h3>
                    <p>{exam.description || "Dedicated typing practice with an examination-specific passage and scoring profile."}</p>
                  </div>
                  <div className="exam-catalogue-card-meta">
                    <span><b>{exam.language === "hi" ? "हि" : "EN"}</b>{exam.language === "hi" ? "Hindi typing" : "English typing"}</span>
                    <i />
                    <span><b>◷</b>{Math.max(1, Math.round((exam.duration_sec || 600) / 60))} minutes</span>
                  </div>
                  <div className="exam-catalogue-card-actions">
                    <a className="exam-details-link" href={"/exams/" + exam.slug}>View exam details <span aria-hidden="true">↗</span></a>
                    <a className="exam-start-link" href={"/simulators/" + exam.slug}>Start simulator <span aria-hidden="true">→</span></a>
                  </div>
                </article>
              );
            })}
          </div>}
      </section>

      <p className="exam-catalogue-disclaimer">Official emblems are displayed where a usable organisation asset is available. Other cards use a clearly labelled text emblem. TypingSkillZone is an independent practice platform; always verify examination rules against the latest official recruitment notification.</p>
    </main>
  );
}
