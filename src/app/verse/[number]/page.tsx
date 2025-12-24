import { redirect } from "next/navigation";

interface VersePageProps {
  params: Promise<{ number: string }>;
}

// Redirect old /verse/[number] routes to new /genesis/1/[number] format
export default async function OldVersePage({ params }: VersePageProps) {
  const { number } = await params;
  const verseNumber = parseInt(number, 10);

  // Validate verse number (Genesis 1 has 31 verses)
  if (!isNaN(verseNumber) && verseNumber >= 1 && verseNumber <= 31) {
    redirect(`/genesis/1/${verseNumber}`);
  }

  // Invalid verse number, go to Genesis 1:1
  redirect("/genesis/1/1");
}
