'use client';

import { useState, useEffect } from 'react';
import { Message, AssistantMode } from '@/types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModeSelector from './ModeSelector';
import ErrorToast from '@/components/ErrorToast';
import { Card } from '@/components/ui/card';

export default function ChatInterface() {
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMode, setCurrentMode] = useState<AssistantMode>('idle');
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    try {
      const response = await fetch('/api/session', { method: 'POST' });
      const { session } = await response.json();
      setSessionId(session.id);
      
      // Add welcome message
      const welcomeMessage: Message = {
        id: 'welcome',
        session_id: session.id,
        role: 'assistant',
        content: `Hello! I'm OSFIT, your multilingual open-source assistant. 🌍

I can help you with:
- 🔍 **Issue Solver**: Understand and solve GitHub issues
- 📄 **File Explainer**: Explain code files in any repository
- 🎓 **Mentor**: Get guidance on open-source contribution

Select a mode above and let's get started!`,
        mode: 'idle',
        metadata: {},
        created_at: new Date().toISOString()
      };
      
      setMessages([welcomeMessage]);
      
      // Load existing messages if any
      loadMessages(session.id);
    } catch (err) {
      console.error('Failed to initialize session:', err);
      setError('Failed to start session. Please refresh the page.');
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat?session_id=${sessionId}`);
      const { messages: existingMessages } = await response.json();
      if (existingMessages && existingMessages.length > 0) {
        setMessages(existingMessages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!sessionId) return;

    // Add user message to UI immediately
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

    // Save user message to database
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

    try {
      // Process with AI
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

      if (apiError) {
        throw new Error(apiError);
      }

      // Add assistant response
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
      
      // Save assistant message to database
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
      console.error('Error processing message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && <ErrorToast message={error} onClose={() => setError('')} />}
      <Card className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto my-8 shadow-lg">
        <ModeSelector 
          currentMode={currentMode} 
          onModeChange={setCurrentMode}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
        />
        <MessageList messages={messages} isLoading={isLoading} />
        <MessageInput onSend={handleSendMessage} disabled={isLoading} />
      </Card>
    </>
  );
}
