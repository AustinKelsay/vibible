"use client";

import { genesis1Verses } from "@/data/genesis-1";

interface Verse {
  number: number;
  text: string;
}

interface ScriptureReaderProps {
  book: string;
  chapter: number;
  verses: Verse[];
}

export function ScriptureReader({
  book = "Genesis",
  chapter = 1,
  verses = genesis1Verses,
}: Partial<ScriptureReaderProps>) {
  return (
    <article className="px-4 md:px-6 py-6 max-w-2xl mx-auto">
      {/* Chapter Header */}
      <header className="mb-8 text-center">
        <p className="text-[var(--muted)] text-sm uppercase tracking-widest mb-2">
          {book}
        </p>
        <h1 className="text-4xl md:text-5xl font-light tracking-tight">
          Chapter {chapter}
        </h1>
      </header>

      {/* Scripture Text */}
      <div className="space-y-4 leading-relaxed text-lg md:text-xl">
        {verses.map((verse) => (
          <p key={verse.number} className="text-pretty">
            <span className="text-[var(--accent)] font-semibold text-sm align-super mr-1">
              {verse.number}
            </span>
            <span className="text-[var(--foreground)]">{verse.text}</span>
          </p>
        ))}
      </div>

      {/* Chapter Navigation */}
      <nav className="flex justify-between items-center mt-12 pt-6 border-t border-[var(--divider)]">
        <button
          className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors duration-[var(--motion-fast)] min-h-[44px] px-3 -ml-3"
          aria-label="Previous chapter"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm">Previous</span>
        </button>

        <span className="text-[var(--muted)] text-sm">
          {chapter} of 50
        </span>

        <button
          className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors duration-[var(--motion-fast)] min-h-[44px] px-3 -mr-3"
          aria-label="Next chapter"
        >
          <span className="text-sm">Next</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </nav>
    </article>
  );
}
