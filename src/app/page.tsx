import { ChatSection } from "@/components/chat";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4">
      <div className="w-full max-w-3xl flex-1">
        <ChatSection />
      </div>
    </main>
  );
}
