import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 dark:border-zinc-800 p-4">
        <h1 className="text-xl font-semibold text-center">AI Chat</h1>
      </header>
      <main className="flex-1 flex flex-col">
        <Chat />
      </main>
    </div>
  );
}
