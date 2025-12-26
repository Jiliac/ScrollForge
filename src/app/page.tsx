import { ChatSection } from "@/components/chat";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">LlamaIndex Chat</h1>
      <div className="w-full max-w-3xl flex-1">
        <ChatSection />
      </div>
    </main>
  );
}
