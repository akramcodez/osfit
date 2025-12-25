'use client';

import { useState, useEffect } from 'react';
import { Message, AssistantMode } from '@/types';
import { LanguageCode } from '@/lib/translations';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModeSelector from './ModeSelector';
import LanguageSelector from './LanguageSelector';
import Sidebar from './Sidebar';
import ErrorToast from '@/components/ErrorToast';
import AuthDialog from '@/components/auth/AuthDialog';
import { supabase, onAuthStateChange, getUsername, getSession } from '@/lib/supabase-auth';
import { User } from '@supabase/supabase-js';

export default function ChatInterface() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMode, setCurrentMode] = useState<AssistantMode>('mentor');
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [refreshSidebarTrigger, setRefreshSidebarTrigger] = useState(0);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { session } = await getSession();
      setUser(session?.user || null);
      setIsAuthLoading(false);
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((authUser) => {
      setUser(authUser);
      if (authUser) {
        // User just logged in, refresh sessions
        setRefreshSidebarTrigger(prev => prev + 1);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize session when user is authenticated
  useEffect(() => {
    if (user && !sessionId) {
      initSession();
    }
  }, [user]);

  const initSession = async () => {
    if (!user) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/session', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const { session: newSession } = await response.json();
      setSessionId(newSession.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to initialize session:', err);
      setError('Failed to start session. Please refresh the page.');
    }
  };

  const loadSession = async (existingSessionId: string) => {
    setSessionId(existingSessionId);
    setMessages([]);
    await loadMessages(existingSessionId);
  };

  const loadMessages = async (id: string) => {
    try {
      setIsSessionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/chat?session_id=${id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const { messages: existingMessages } = await response.json();
      if (existingMessages && existingMessages.length > 0) {
        setMessages(existingMessages);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    // If not authenticated, show auth dialog and save pending message
    if (!user) {
      setPendingMessage(content);
      setShowAuthDialog(true);
      return;
    }

    if (!sessionId) {
      await initSession();
      // Wait a bit for session to be created
      setTimeout(() => handleSendMessage(content), 100);
      return;
    }
    
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
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = { 'Authorization': `Bearer ${session?.access_token}` };
      
      // Save user message
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          session_id: sessionId,
          role: 'user',
          content,
          mode: currentMode
        })
      });
      
      setRefreshSidebarTrigger(prev => prev + 1);

      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          message: content,
          mode: currentMode,
          language: currentLanguage,
          conversationHistory: messages.slice(-5),
          sessionId: sessionId
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

      setStreamingMessageId(assistantMessage.id);
      setMessages(prev => [...prev, assistantMessage]);
      
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          session_id: sessionId,
          role: 'assistant',
          content: aiResponse,
          mode: currentMode,
          metadata: { language: currentLanguage }
        })
      });
      
      setRefreshSidebarTrigger(prev => prev + 1);
    } catch (err: unknown) {
      console.error('Error processing:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error processing request';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    // If there was a pending message, send it after auth
    if (pendingMessage) {
      setTimeout(() => {
        handleSendMessage(pendingMessage);
        setPendingMessage('');
      }, 500);
    }
  };

  const handleModeSelect = (mode: AssistantMode) => {
    setCurrentMode(mode);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSessionId('');
    setMessages([]);
  };

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="flex w-full h-screen bg-[#1C1C1C] items-center justify-center">
        <div className="h-8 w-8 border-2 border-white/20 border-t-[#3ECF8E] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen bg-[#1C1C1C] text-white overflow-hidden font-sans">
      {error && <ErrorToast message={error} onClose={() => setError('')} />}
      
      <AuthDialog 
        isOpen={showAuthDialog} 
        onClose={() => setShowAuthDialog(false)}
        onSuccess={handleAuthSuccess}
      />
      
      <Sidebar 
        onNewChat={initSession} 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        currentSessionId={sessionId}
        onLoadSession={loadSession}
        refreshTrigger={refreshSidebarTrigger}
        language={currentLanguage as LanguageCode}
        user={user}
        username={user ? getUsername(user) : undefined}
        onLogout={handleLogout}
        onAuthRequest={() => setShowAuthDialog(true)}
      />

      <main className="flex-1 flex flex-col h-full relative">
        {/* Top Header */}
        <div className="h-14 flex items-center justify-between px-4 fixed top-0 left-0 right-0 md:static z-20 bg-[#1C1C1C] md:bg-transparent">
             {!isSidebarOpen && <div className="w-8"></div>} 
             
             <div className="flex-1 flex justify-start pl-4 md:pl-0">
             </div>

             <div className="flex-1 flex justify-center">
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

        {/* Main Content Area */}
        <div className="flex-1 relative w-full h-full flex flex-col">
            
            <div className="absolute inset-0 pb-32">
                <MessageList 
                    messages={messages} 
                    isLoading={isLoading} 
                    isSessionLoading={isSessionLoading}
                    onModeSelect={handleModeSelect} 
                    currentMode={currentMode}
                    language={currentLanguage as LanguageCode}
                    streamingMessageId={streamingMessageId}
                    onStreamComplete={() => setStreamingMessageId(null)}
                />
            </div>

            <div className="absolute bottom-0 left-0 right-0 w-full flex justify-center p-4 bg-gradient-to-t from-[#1C1C1C] from-50% via-[#1C1C1C]/80 to-transparent pt-20 pb-6 z-10">
                <MessageInput onSend={handleSendMessage} disabled={isLoading} language={currentLanguage as LanguageCode} mode={currentMode} />
            </div>
        </div>
      </main>
    </div>
  );
}
