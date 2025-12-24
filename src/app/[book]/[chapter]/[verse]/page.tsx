import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { HeroImage } from "@/components/hero-image";
import { ScriptureDetails } from "@/components/scripture-details";
import { ScriptureReader } from "@/components/scripture-reader";
import { Header } from "@/components/header";
import { BookMenu } from "@/components/book-menu";
import { BOOK_BY_SLUG } from "@/data/bible-structure";
import { getVerse } from "@/lib/bible-api";
import { parseVerseUrl, getNavigationUrls } from "@/lib/navigation";

interface VersePageProps {
  params: Promise<{
    book: string;
    chapter: string;
    verse: string;
  }>;
}

export default async function VersePage({ params }: VersePageProps) {
  const { book, chapter, verse } = await params;

  // Parse and validate the URL
  const location = parseVerseUrl(book, chapter, verse);
  if (!location) {
    redirect("/genesis/1/1");
  }

  const bookData = BOOK_BY_SLUG[book.toLowerCase()];
  if (!bookData) {
    redirect("/genesis/1/1");
  }

  // Fetch verse data from API
  const verseData = await getVerse(book, location.chapter, location.verse);
  if (!verseData) {
    redirect("/genesis/1/1");
  }

  // Calculate navigation URLs
  const { prevUrl, nextUrl } = getNavigationUrls(location);
  const totalVerses = bookData.chapters[location.chapter - 1];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Hero Image */}
        <HeroImage
          verseText={verseData.text}
          caption={verseData.text}
          verseNumber={location.verse}
          totalVerses={totalVerses}
          prevUrl={prevUrl}
          nextUrl={nextUrl}
        />

        {/* Scripture Reader */}
        <div className="flex-1 py-8">
          <ScriptureReader
            book={bookData.name}
            chapter={location.chapter}
            verse={{ number: location.verse, text: verseData.text }}
            verseNumber={location.verse}
            totalVerses={totalVerses}
            prevUrl={prevUrl}
            nextUrl={nextUrl}
          />
        </div>

        {/* Scripture Details */}
        <div className="max-w-2xl mx-auto w-full">
          <ScriptureDetails
            book={bookData.name}
            chapter={location.chapter}
            verseRange={String(location.verse)}
            imageAttribution={{
              title: "Scripture Illustration",
              artist: "AI Generated",
              source: "Vibible",
            }}
          />
        </div>
      </main>

      {/* Chat - Fixed at Bottom */}
      <div className="sticky bottom-0 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <Chat
          context={{
            book: bookData.name,
            chapter: location.chapter,
            verseRange: String(location.verse),
            heroCaption: verseData.text,
            verses: [{ number: location.verse, text: verseData.text }],
          }}
        />
      </div>

      {/* Book Menu */}
      <BookMenu />
    </div>
  );
}
