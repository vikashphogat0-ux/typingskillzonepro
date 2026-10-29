"use client";
import { useState } from "react";

type Props = { slug: string; mark: string; short: string; family: string; tone: string };

const assetBySlug = (slug: string): string | null => {
  const s = slug.toLowerCase();
  // Delhi Police emblem source: Wikimedia Commons file credited to Delhi Police.
  if (s.includes("delhi-police") || s.includes("dp-hcm")) {
    return "https://commons.wikimedia.org/wiki/Special:FilePath/Delhi_Police_Logo.png";
  }
  if (s.includes("bsf")) return "https://commons.wikimedia.org/wiki/Special:FilePath/BSF_Logo.svg";
  if (s.includes("cisf")) return "https://commons.wikimedia.org/wiki/Special:FilePath/CISF_LOGO.svg";
  if (s.includes("ssc")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Staff_Selection_Commission_Logo.svg";
  if (s.includes("crpf")) return "https://commons.wikimedia.org/wiki/Special:FilePath/CRPF_Logo.svg";
  if (s.includes("railway") || s.includes("rrb")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Indian_Railways.svg";
  return null;
};

export default function ExamEmblem({ slug, mark, short, family, tone }: Props) {
  const [failed, setFailed] = useState(false);
  const src = assetBySlug(slug);
  return (
    <div className={`exam-card-emblem ${tone}`} role="img" aria-label={`${family} emblem`}>
      {src && !failed ? (
        <img
          src={src}
          alt={`${family} emblem`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="exam-card-fallback">
          {mark}
          <small style={{ display: "block", fontSize: 10, marginTop: 5, fontWeight: 600 }}>{short}</small>
        </span>
      )}
    </div>
  );
}
