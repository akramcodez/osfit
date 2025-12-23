'use client';

import { useState, useEffect } from 'react';
import { Message, AssistantMode } from '@/types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModeSelector from './ModeSelector';
import { Card } from '@/components/ui/card';

export default function ChatInterface() {
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMode, setCurrentMode] = useState<AssistantMode>('idle');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    const response = await fetch('/api/session', { method: 'POST' });
    const { session } = await response.json();
    setSessionId(session.id);
    
    // Load existing messages if any
    loadMessages(session.id);
  };

  const loadMessages = async (sessionId: string) => {
    const response = await fetch(`/api/chat?session_id=${sessionId}`);
    const { messages } = await response.json();
    setMessages(messages || []);
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
          language: 'en', // TODO: Add language selector in Phase 3
          conversationHistory: messages.slice(-5)
        })
      });

      const { response: aiResponse, error } = await processResponse.json();

      if (error) {
        throw new Error(error);
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse,
        mode: currentMode,
        metadata: {},
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
          mode: currentMode
        })
      });
    } catch (error: unknown) {
      console.error('Error processing message:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        session_id: sessionId,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        mode: currentMode,
        metadata: {},
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto my-8">
      <ModeSelector currentMode={currentMode} onModeChange={setCurrentMode} />
      <MessageList messages={messages} />
      <MessageInput onSend={handleSendMessage} disabled={isLoading} />
    </Card>
  );
}
