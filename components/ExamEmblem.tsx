"use client";

import { useState } from "react";

type Props = { slug: string; mark: string; short: string; family: string; tone: string };

const assetBySlug = (slug: string): string | null => {
  const s = slug.toLowerCase();
  // Remote artwork is optional. The local text emblem remains visible if a host
  // changes a filename, blocks hotlinking, or returns an unsupported image.
  if (s.includes("delhi-police") || s.includes("dp-hcm")) {
    return "https://commons.wikimedia.org/wiki/Special:FilePath/Delhi_Police_Logo.png";
  }
  if (s.includes("bsf")) return "https://commons.wikimedia.org/wiki/Special:FilePath/BSF_Logo.svg";
  if (s.includes("cisf")) return "https://commons.wikimedia.org/wiki/Special:FilePath/CISF_LOGO.svg";
  if (s.includes("ssc")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Staff_Selection_Commission_Logo.svg";
  if (s.includes("crpf")) return "https://commons.wikimedia.org/wiki/Special:FilePath/CRPF_Logo.svg";
  if (s.includes("railway") || s.includes("rrb")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Indian_Railways.svg";
  if (s.includes("supreme-court")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Emblem_of_the_Supreme_Court_of_India_2025.svg";
  if (s.includes("army-agniveer")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Indian_Army_Insignia.svg";
  if (s.includes("cbse")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Cbse_name.png";
  if (s.includes("aiims")) return "https://commons.wikimedia.org/wiki/Special:FilePath/All_India_Institute_of_Medical_Sciences,_New_Delhi_Logo.svg";
  if (s.includes("kvs")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Kendriya_Vidyalaya_Sangathan_logo.svg";
  if (s.includes("epfo")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Employees%27_Provident_Fund_Organisation_Logo.png";
  if (s.includes("nvs")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Navodaya_Vidyalaya_Samiti_logo.png";
  if (s.includes("dsssb")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Government_of_Delhi_Logo.png";
  if (s.includes("bihar") || s.includes("bssc") || s.includes("beltron") || s.includes("bpsc") || s.includes("bceceb") || s.includes("jeevika")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Emblem_of_India.svg";
  if (s.includes("upsssc") || s.includes("uppsc") || s.includes("up-police") || s.includes("uppcl") || s.includes("bhu")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Emblem_of_Uttar_Pradesh.svg";
  if (s.includes("high-court") || s.includes("allahabad-hc") || s.includes("mp-high-court") || s.includes("rajasthan-high-court") || s.includes("chhattisgarh-high-court") || s.includes("telangana-high-court") || s.includes("andhra-pradesh-high-court") || s.includes("gujarat-high-court")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Emblem_of_India.svg";
  if (s.includes("crpf")) return "https://commons.wikimedia.org/wiki/Special:FilePath/CRPF_Logo.svg";
  if (s.includes("itbp")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Indo-Tibetan_Border_Police_Logo.svg";
  if (s.includes("ssb")) return "https://commons.wikimedia.org/wiki/Special:FilePath/Sashastra_Seema_Bal_Logo.png";
  if (s.includes("cisf")) return "https://commons.wikimedia.org/wiki/Special:FilePath/CISF_LOGO.svg";
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
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="exam-card-fallback" aria-hidden="true">
          <strong>{mark}</strong>
          <small>{short}</small>
        </span>
      )}
    </div>
  );
}
