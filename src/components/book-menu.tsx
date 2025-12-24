"use client";

import { useState } from "react";
import Link from "next/link";
import { X, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { BIBLE_BOOKS, BibleBook } from "@/data/bible-structure";
import { useNavigation } from "@/context/navigation-context";

type MenuView = "books" | "chapters";

export function BookMenu() {
  const { isMenuOpen, closeMenu } = useNavigation();
  const [expandedTestament, setExpandedTestament] = useState<"old" | "new">(
    "old"
  );
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [view, setView] = useState<MenuView>("books");

  const oldTestament = BIBLE_BOOKS.filter((b) => b.testament === "old");
  const newTestament = BIBLE_BOOKS.filter((b) => b.testament === "new");

  const handleBookSelect = (book: BibleBook) => {
    setSelectedBook(book);
    setView("chapters");
  };

  const handleBack = () => {
    setView("books");
    setSelectedBook(null);
  };

  const handleChapterSelect = () => {
    closeMenu();
    setView("books");
    setSelectedBook(null);
  };

  const toggleTestament = (testament: "old" | "new") => {
    setExpandedTestament(testament);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMenu}
      />

      {/* Slide-out Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-[var(--background)] z-50 transform transition-transform duration-300 ease-out ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--divider)]">
          {view === "chapters" && selectedBook ? (
            <>
              <button
                onClick={handleBack}
                className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                aria-label="Back to books"
              >
                <ArrowLeft size={20} strokeWidth={1.5} />
              </button>
              <h2 className="text-lg font-semibold flex-1 text-center pr-8">
                {selectedBook.name}
              </h2>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Select Passage</h2>
              <button
                onClick={closeMenu}
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                aria-label="Close menu"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-60px)]">
          {view === "books" ? (
            <>
              {/* Old Testament Section */}
              <button
                onClick={() => toggleTestament("old")}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface)] transition-colors"
              >
                {expandedTestament === "old" ? (
                  <ChevronDown
                    size={18}
                    strokeWidth={1.5}
                    className="text-[var(--muted)]"
                  />
                ) : (
                  <ChevronRight
                    size={18}
                    strokeWidth={1.5}
                    className="text-[var(--muted)]"
                  />
                )}
                <span className="font-medium">Old Testament</span>
                <span className="text-sm text-[var(--muted)] ml-auto">
                  39 books
                </span>
              </button>
              {expandedTestament === "old" && (
                <div className="pb-2">
                  {oldTestament.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => handleBookSelect(book)}
                      className="w-full flex items-center justify-between px-4 py-2.5 pl-10 text-left hover:bg-[var(--surface)] transition-colors"
                    >
                      <span>{book.name}</span>
                      <span className="text-sm text-[var(--muted)]">
                        {book.chapters.length} ch
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* New Testament Section */}
              <button
                onClick={() => toggleTestament("new")}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface)] transition-colors border-t border-[var(--divider)]"
              >
                {expandedTestament === "new" ? (
                  <ChevronDown
                    size={18}
                    strokeWidth={1.5}
                    className="text-[var(--muted)]"
                  />
                ) : (
                  <ChevronRight
                    size={18}
                    strokeWidth={1.5}
                    className="text-[var(--muted)]"
                  />
                )}
                <span className="font-medium">New Testament</span>
                <span className="text-sm text-[var(--muted)] ml-auto">
                  27 books
                </span>
              </button>
              {expandedTestament === "new" && (
                <div className="pb-2">
                  {newTestament.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => handleBookSelect(book)}
                      className="w-full flex items-center justify-between px-4 py-2.5 pl-10 text-left hover:bg-[var(--surface)] transition-colors"
                    >
                      <span>{book.name}</span>
                      <span className="text-sm text-[var(--muted)]">
                        {book.chapters.length} ch
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Chapter Grid */
            selectedBook && (
              <div className="p-4">
                <p className="text-sm text-[var(--muted)] mb-4">
                  Select a chapter
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from(
                    { length: selectedBook.chapters.length },
                    (_, i) => i + 1
                  ).map((chapter) => (
                    <Link
                      key={chapter}
                      href={`/${selectedBook.slug}/${chapter}/1`}
                      onClick={handleChapterSelect}
                      className="flex items-center justify-center h-11 rounded-lg bg-[var(--surface)] hover:bg-[var(--divider)] transition-colors text-sm font-medium"
                    >
                      {chapter}
                    </Link>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
