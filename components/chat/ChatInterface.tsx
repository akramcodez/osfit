'use client';

import { useState, useEffect, useRef } from 'react';
import { Message, AssistantMode } from '@/types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModeSelector from './ModeSelector';
import LanguageSelector from './LanguageSelector';
import Sidebar from './Sidebar';
import ErrorToast from '@/components/ErrorToast';

export default function ChatInterface() {
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMode, setCurrentMode] = useState<AssistantMode>('mentor');
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [refreshSidebarTrigger, setRefreshSidebarTrigger] = useState(0);

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    try {
      const response = await fetch('/api/session', { method: 'POST' });
      const { session } = await response.json();
      setSessionId(session.id);
      setMessages([]); // Start clean for new session
    } catch (err) {
      console.error('Failed to initialize session:', err);
      setError('Failed to start session. Please refresh the page.');
    }
  };

  const loadSession = async (existingSessionId: string) => {
    setSessionId(existingSessionId);
    setMessages([]); // Clear current view while loading
    // In a real app we might fetch the mode for this session too
    await loadMessages(existingSessionId);
  };

  const loadMessages = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/chat?session_id=${id}`);
      const { messages: existingMessages } = await response.json();
      if (existingMessages && existingMessages.length > 0) {
        setMessages(existingMessages);
        // Optionally detect mode from last message or session metadata
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!sessionId) return;
    
    // Optimistic UI update
    const userMessage: Message = {
      id: Date.now().toString(),
      session_id: sessionId,
      role: 'user',
      content,
      mode: currentMode,
      metadata: {},
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError('');

    try {
         // Save user message (fire and forget for UI speed)
         await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            role: 'user',
            content,
            mode: currentMode
          })
        });
        
        // Trigger sidebar refresh to show this session now that it has messages
        setRefreshSidebarTrigger(prev => prev + 1);

      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          mode: currentMode,
          language: currentLanguage,
          conversationHistory: messages.slice(-5)
        })
      });

      const { response: aiResponse, error: apiError } = await processResponse.json();

      if (apiError) throw new Error(apiError);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse,
        mode: currentMode,
        metadata: { language: currentLanguage },
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          role: 'assistant',
          content: aiResponse,
          mode: currentMode,
          metadata: { language: currentLanguage }
        })
      });
    } catch (err: unknown) {
      console.error('Error processing:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error processing request';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to switch mode from landing page
  const handleModeSelect = (mode: AssistantMode) => {
    setCurrentMode(mode);
  };

  return (
    <div className="flex w-full h-screen bg-[#1C1C1C] text-white overflow-hidden font-sans">
      {error && <ErrorToast message={error} onClose={() => setError('')} />}
      
      <Sidebar 
        onNewChat={initSession} 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        currentSessionId={sessionId}
        onLoadSession={loadSession}
        refreshTrigger={refreshSidebarTrigger}
      />

      <main className="flex-1 flex flex-col h-full relative">
        {/* Top Header */}
        <div className="h-14 flex items-center justify-between px-4 fixed top-0 left-0 right-0 md:static z-20 bg-[#1C1C1C] md:bg-transparent">
             {!isSidebarOpen && <div className="w-8"></div>} 
             
             {/* Left aligned Language Selector */}
             <div className="flex-1 flex justify-start pl-4 md:pl-0">
                 {/* Left spacer/content */}
             </div>

             <div className="flex-1 flex justify-center">
                 {/* Center spacer */}
             </div>
             
             <div className="flex-1 flex justify-end pr-4 md:pr-0 gap-3">
                 <ModeSelector 
                    currentMode={currentMode} 
                    onModeChange={setCurrentMode}
                    currentLanguage={currentLanguage}
                    onLanguageChange={setCurrentLanguage}
                />
                <LanguageSelector 
                    currentLanguage={currentLanguage}
                    onLanguageChange={setCurrentLanguage}
                />
             </div> 
        </div>

        <div className="flex-1 overflow-hidden relative w-full flex flex-col items-center">
            <MessageList 
                messages={messages} 
                isLoading={isLoading} 
                onModeSelect={handleModeSelect} 
                currentMode={currentMode}
            />
        </div>

        <div className="w-full flex justify-center p-4 bg-[#1C1C1C]">
            <MessageInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </main>
    </div>
  );
}
