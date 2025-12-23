'use client';

import { useState, useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ModeSelector } from './ModeSelector';
import type { Message, AssistantMode, ChatSession } from '@/types';

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [mode, setMode] = useState<AssistantMode>('idle');
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, []);

  async function initSession() {
    try {
      const response = await fetch('/api/session', { method: 'POST' });
      const data = await response.json();
      setSession(data.session);
      
      // Add welcome message
      const welcomeMessage: Message = {
        id: 'welcome',
        session_id: data.session.id,
        role: 'assistant',
        content: `👋 Welcome to OSFIT! I'm your open-source assistant.

I can help you with:
• **Issue Solver** - Understand and solve GitHub issues
• **File Explainer** - Explain code files
• **Open Source Mentor** - Guidance on contributing

What would you like help with today?`,
        mode: 'idle',
        created_at: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }

  async function sendMessage(content: string) {
    if (!session || !content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      session_id: session.id,
      role: 'user',
      content,
      mode,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          message: content,
          mode,
          language,
        }),
      });

      const data = await response.json();
      
      if (data.message) {
        const assistantMessage: Message = {
          id: data.message.id || `assistant-${Date.now()}`,
          session_id: session.id,
          role: 'assistant',
          content: data.message.content,
          mode,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ModeSelector 
        mode={mode} 
        onModeChange={setMode}
        language={language}
        onLanguageChange={setLanguage}
      />
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
