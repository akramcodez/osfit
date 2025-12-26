'use client';

import { Button } from '@/components/ui/button';
import { MessageSquarePlus, PanelLeftClose, LogOut, User, Trash2 } from 'lucide-react';
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
  onDeleteSession?: (id: string) => void;
  refreshTrigger?: number;
  language?: LanguageCode;
  user?: SupabaseUser | null;
  username?: string;
  onLogout?: () => void;
  onAuthRequest?: (mode: 'signin' | 'signup') => void;
  onShowUserSettings?: () => void;
  hideToggleButton?: boolean;
}

export default function Sidebar({ 
  onNewChat, 
  isOpen, 
  toggleSidebar, 
  currentSessionId, 
  onLoadSession, 
  onDeleteSession,
  refreshTrigger,
  language = 'en',
  user,
  username,
  onLogout,
  onAuthRequest,
  onShowUserSettings,
  hideToggleButton = false
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
      console.log('[SIDEBAR] Auth session:', session?.access_token ? 'Has token' : 'No token');
      const res = await fetch('/api/session', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await res.json();
      console.log('[SIDEBAR] Sessions response:', data);
      if (data.sessions) {
        setSessions(data.sessions);
        console.log('[SIDEBAR] Set sessions count:', data.sessions.length);
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
          isOpen || hideToggleButton ? 'opacity-0 pointer-events-none -translate-x-10' : 'opacity-100 translate-x-0'
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
                  {sessions.length === 0 ? (
                    <></>
                  ) : (
                    sessions.map((session, index) => (
                      <div 
                        key={session.id}
                        className={`group flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-all duration-150 hover:translate-x-1 active:scale-[0.98] ${
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
                        <span 
                          className="truncate flex-1"
                          onClick={() => onLoadSession?.(session.id)}
                        >
                          {session.title || `${session.mode || 'chat'}: ${new Date(session.created_at).toLocaleDateString()}`}
                        </span>
                        {onDeleteSession && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all duration-150"
                            title="Delete session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="h-12 w-12 bg-[#1A1A1A] rounded-xl flex items-center justify-center mb-3 border border-[#2A2A2A]">
                  <User className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-white mb-1">Welcome to OSFIT</h3>
                <p className="text-xs text-gray-500">
                  Sign in to save your chats
                </p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/10">
            {user ? (
              <>
                {/* User info - clickable to open settings */}
                <button 
                  onClick={onShowUserSettings}
                  className="w-full flex items-center gap-3 px-2 py-2 mb-2 rounded-lg hover:bg-[#2A2A2A] transition-colors cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-full bg-[#3ECF8E] flex items-center justify-center text-xs font-bold text-black">
                    {username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-white truncate">{username}</p>
                  </div>
                </button>
                
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
                <Button 
                  size="sm"
                  className="w-full bg-[#166534] border border-[#22c55e] text-white hover:bg-[#15803d] text-xs font-medium h-8 transition-colors"
                  onClick={() => onAuthRequest?.('signup')}
                >
                  Sign Up
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full border-[#2A2A2A] bg-transparent text-gray-400 hover:text-white hover:border-[#4A4A4A] text-xs h-8 transition-colors"
                  onClick={() => onAuthRequest?.('signin')}
                >
                  Sign In
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
