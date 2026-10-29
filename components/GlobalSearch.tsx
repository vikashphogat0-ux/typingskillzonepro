"use client";
import { useEffect, useRef } from "react";
export default function GlobalSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  return <form className="global-search" action="/library" role="search">
    <span aria-hidden="true">⌕</span>
    <input ref={inputRef} name="q" type="search" placeholder="Search exams, passages, or Passage ID..." aria-label="Search exams, passages, or Passage ID" />
    <kbd>Ctrl K</kbd>
  </form>;
}
