'use client';

import { Button } from '@/components/ui/button';
import Spinner from '@/components/ui/spinner';
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
  onDeleteSession?: (id: string) => Promise<void> | void;
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
  const [translatedTitles, setTranslatedTitles] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSessions();
    } else {
      setSessions([]);
    }
  }, [currentSessionId, refreshTrigger, user]);

  useEffect(() => {
    const translateTitles = async () => {
      if (!sessions.length || language === 'en') {
        setTranslatedTitles({});
        setIsTranslating(false);
        return;
      }

      setIsTranslating(true);
      const translations: Record<string, string> = {};
      for (const session of sessions) {
        const title = session.title || `${session.mode || 'chat'}: ${new Date(session.created_at).toLocaleDateString()}`;
        try {
          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: title, targetLanguage: language }),
          });
          const data = await res.json();
          translations[session.id] = data.translated || title;
        } catch {
          translations[session.id] = title;
        }
      }
      setTranslatedTitles(translations);
      setIsTranslating(false);
    };

    translateTitles();
  }, [sessions, language]);

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
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={toggleSidebar}
        />
      )}

      <div 
        className={`fixed md:relative top-0 bottom-0 left-0 z-50 md:z-20 h-full bg-background flex flex-col border-border-subtle transition-[width,transform,opacity] duration-300 ease-in-out overflow-hidden shadow-2xl md:shadow-none will-change-[width,transform] ${
          isOpen 
            ? 'w-[280px] md:w-[260px] opacity-100 translate-x-0 border-r' 
            : 'w-0 opacity-0 -translate-x-full md:opacity-0 md:translate-x-0 border-r-0'
        }`}
      >
        <div className="w-[280px] md:w-[260px] h-full flex flex-col">
          <div className="p-3 flex items-center justify-between">
            <Button 
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 768) toggleSidebar();
              }}
              variant="ghost" 
              className="flex-1 justify-start gap-3 border border-border-strong hover:bg-secondary hover:border-primary/50 text-xs sm:text-sm font-normal text-white px-3 py-5 rounded-lg transition-all duration-200 active:scale-[0.98]"
              disabled={!user}
            >
              <MessageSquarePlus className="h-4 w-4" />
              {t('newChat', language)}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSidebar} 
              className="ml-2 text-gray-400 hover:text-white hover:scale-110 active:scale-95 transition-all duration-300"
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
                        className={`group flex items-center justify-between px-3 py-2 text-xs sm:text-sm rounded-lg cursor-pointer transition-all duration-150 hover:translate-x-1 active:scale-[0.98] ${
                          currentSessionId === session.id 
                            ? 'bg-secondary text-white font-medium' 
                            : 'text-gray-300 hover:bg-secondary hover:text-white'
                        }`}
                        style={{ 
                          transitionDelay: isOpen ? `${index * 30}ms` : '0ms',
                          opacity: isOpen ? 1 : 0,
                          transform: isOpen ? 'translateX(0)' : 'translateX(-20px)'
                        }}
                      >
                        <span 
                          className="truncate flex-1"
                          onClick={() => {
                            onLoadSession?.(session.id);
                            if (window.innerWidth < 768) toggleSidebar();
                          }}
                        >
                          {isTranslating && language !== 'en' ? (
                            <span className="inline-block h-4 w-24 bg-gray-700/50 rounded animate-pulse" />
                          ) : (
                            translatedTitles[session.id] || session.title || `${session.mode || 'chat'}: ${new Date(session.created_at).toLocaleDateString()}`
                          )}
                        </span>
                        {onDeleteSession && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (deletingSessionId) return;
                              
                              setDeletingSessionId(session.id);
                              try {
                                await onDeleteSession(session.id);
                              } catch (error) {
                                console.error('Delete failed:', error);
                              } finally {
                                setDeletingSessionId(null);
                              }
                            }}
                            className={`p-1 rounded transition-all duration-150 ${
                                deletingSessionId === session.id 
                                ? 'opacity-100 cursor-wait' 
                                : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                            }`}
                            title={t('deleteSession', language) || 'Delete session'}
                            disabled={!!deletingSessionId}
                          >
                            {deletingSessionId === session.id ? (
                                <Spinner size="sm" className="text-red-500" />
                            ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="h-12 w-12 bg-surface-1 rounded-xl flex items-center justify-center mb-3 border border-border-subtle">
                  <User className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-xs sm:text-sm font-medium text-white mb-1">{t('welcomeToOsfit', language) || 'Welcome to OSFIT'}</h3>
                <p className="text-xs text-gray-500">
                  {t('signInToSave', language) || 'Sign in to save your chats'}
                </p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/10">
            {user ? (
              <>
                <button 
                  onClick={onShowUserSettings}
                  className="w-full flex items-center gap-3 px-2 py-2 mb-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer group"
                >
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-black">
                    {username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0 text-left" onClick={() => {
                    onShowUserSettings?.();
                    if (window.innerWidth < 768) toggleSidebar();
                  }}>
                    <p className="text-xs sm:text-sm font-medium text-white truncate">{username}</p>
                  </div>
                  <div className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary/20 transition-colors">
                    API Keys
                  </div>
                </button>
                
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-sm font-normal text-gray-400 hover:text-white hover:bg-secondary/80 transition-all duration-150 active:scale-[0.98]"
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
                  className="w-full bg-success-dark border border-success text-white hover:bg-success-dark/90 text-xs font-medium h-8 transition-colors"
                  onClick={() => onAuthRequest?.('signup')}
                >
                  {t('signUp', language) || 'Sign Up'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full border-border-subtle bg-transparent text-gray-400 hover:text-white hover:border-border-strong text-xs h-8 transition-colors"
                  onClick={() => onAuthRequest?.('signin')}
                >
                  {t('signIn', language) || 'Sign In'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
