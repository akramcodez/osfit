'use client';

import { Button } from '@/components/ui/button';
import { MessageSquarePlus, PanelLeftClose, LogOut, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { t, LanguageCode } from '@/lib/translations';
import { supabase } from '@/lib/supabase-auth';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface SidebarProps {
  onNewChat: () => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  currentSessionId?: string;
  onLoadSession?: (id: string) => void;
  refreshTrigger?: number;
  language?: LanguageCode;
  user?: SupabaseUser | null;
  username?: string;
  onLogout?: () => void;
}

export default function Sidebar({ 
  onNewChat, 
  isOpen, 
  toggleSidebar, 
  currentSessionId, 
  onLoadSession, 
  refreshTrigger,
  language = 'en',
  user,
  username,
  onLogout
}: SidebarProps) {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchSessions();
    } else {
      setSessions([]);
    }
  }, [currentSessionId, refreshTrigger, user]);

  const fetchSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/session', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (e) {
      console.error('Failed to fetch sessions', e);
    }
  };

  return (
    <>
      {/* Collapsed state - Menu toggle button */}
      <div 
        className={`absolute top-4 left-4 z-30 transition-all duration-300 ease-out ${
          isOpen ? 'opacity-0 pointer-events-none -translate-x-10' : 'opacity-100 translate-x-0'
        }`}
      >
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          className="text-gray-400 hover:text-white hover:scale-110 active:scale-95 transition-transform duration-150 bg-[#1C1C1C]/80 backdrop-blur-sm"
        >
          <PanelLeftClose className="h-6 w-6 rotate-180" />
        </Button>
      </div>

      {/* Sidebar - Always in DOM, animated with transform */}
      <div 
        className={`h-full bg-[#1C1C1C] flex flex-col border-r border-[#2A2A2A] relative z-20 flex-shrink-0 transition-all duration-300 ease-out ${
          isOpen 
            ? 'w-[260px] translate-x-0 opacity-100' 
            : 'w-0 -translate-x-full opacity-0 overflow-hidden'
        }`}
      >
        <div className="w-[260px] h-full flex flex-col">
          <div className="p-3 flex items-center justify-between">
            <Button 
              onClick={onNewChat}
              variant="ghost" 
              className="flex-1 justify-start gap-3 border border-[#3E3E3E] hover:bg-[#2A2A2A] hover:border-[#3ECF8E]/50 text-sm font-normal text-white px-3 py-5 rounded-lg transition-all duration-200 active:scale-[0.98]"
              disabled={!user}
            >
              <MessageSquarePlus className="h-4 w-4" />
              {t('newChat', language)}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSidebar} 
              className="ml-2 text-gray-400 hover:text-white hover:scale-110 hover:rotate-180 active:scale-95 transition-all duration-300"
            >
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {user ? (
              <>
                <div className="text-xs font-medium text-gray-500 mb-3 px-2">{t('recent', language)}</div>
                <div className="space-y-1">
                  {sessions.map((session, index) => (
                    <div 
                      key={session.id}
                      onClick={() => onLoadSession?.(session.id)}
                      className={`px-3 py-2 text-sm rounded-lg cursor-pointer truncate transition-all duration-150 hover:translate-x-1 active:scale-[0.98] ${
                        currentSessionId === session.id 
                          ? 'bg-[#2A2A2A] text-white font-medium' 
                          : 'text-gray-300 hover:bg-[#2A2A2A] hover:text-white'
                      }`}
                      style={{ 
                        transitionDelay: isOpen ? `${index * 30}ms` : '0ms',
                        opacity: isOpen ? 1 : 0,
                        transform: isOpen ? 'translateX(0)' : 'translateX(-20px)'
                      }}
                    >
                      {session.title ? (
                        session.title
                      ) : (
                        <span className="text-gray-400 italic animate-pulse">{t('newChatLoading', language)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                {/* Gradient icon background */}
                <div className="h-16 w-16 bg-gradient-to-br from-[#3ECF8E]/20 to-[#3ECF8E]/5 rounded-2xl flex items-center justify-center mb-4 border border-[#3ECF8E]/20">
                  <User className="h-8 w-8 text-[#3ECF8E]" />
                </div>
                <h3 className="text-sm font-medium text-white mb-1">Welcome to OSFIT</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Sign in to save your chats and unlock all features
                </p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/10">
            {user ? (
              <>
                {/* User info */}
                <div className="flex items-center gap-3 px-2 py-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#3ECF8E] to-[#2da770] flex items-center justify-center text-xs font-bold text-black shadow-lg shadow-[#3ECF8E]/20">
                    {username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{username}</p>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-sm font-normal text-gray-400 hover:text-white hover:bg-[#2F2F2F] transition-all duration-150 active:scale-[0.98]"
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4" />
                  {t('logOut', language)}
                </Button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-gray-500 text-center">
                  Send a message to get started →
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
