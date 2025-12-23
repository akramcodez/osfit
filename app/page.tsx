import ChatInterface from '@/components/chat/ChatInterface';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">OSFIT</h1>
          <p className="text-gray-600">Your Multilingual Open Source Assistant</p>
        </div>
        <ChatInterface />
      </div>
    </main>
  );
}
