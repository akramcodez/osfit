'use client';

import { Button } from '@/components/ui/button';
import { MessageSquarePlus, PanelLeftClose, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  onNewChat: () => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ onNewChat, isOpen, toggleSidebar, currentSessionId, onLoadSession, refreshTrigger }: SidebarProps & { currentSessionId?: string, onLoadSession?: (id: string) => void, refreshTrigger?: number }) {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    fetchSessions();
  }, [currentSessionId, refreshTrigger]); // Refresh when session or trigger changes

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/session');
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (e) {
      console.error('Failed to fetch sessions', e);
    }
  };

  if (!isOpen) {
    return (
      <div className="absolute top-4 left-4 z-20 md:static md:p-2 bg-[#1C1C1C]">
         <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-gray-400 hover:text-white">
            <PanelLeftClose className="h-6 w-6 rotate-180" />
         </Button>
      </div>
    );
  }

  return (
    <div className="w-[260px] h-full bg-[#1C1C1C] flex flex-col border-r border-[#2A2A2A] relative z-10 flex-shrink-0 transition-all duration-300">
      <div className="p-3 flex items-center justify-between">
         <Button 
            onClick={onNewChat}
            variant="ghost" 
            className="flex-1 justify-start gap-3 border border-[#3E3E3E] hover:bg-[#2A2A2A] text-sm font-normal text-white px-3 py-5 rounded-lg transition-colors"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </Button>
          
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="ml-2 text-gray-400 hover:text-white">
            <PanelLeftClose className="h-5 w-5" />
          </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="text-xs font-medium text-gray-500 mb-3 px-2">Recent</div>
        <div className="space-y-1">
            {sessions.map((session) => (
              <div 
                key={session.id}
                onClick={() => onLoadSession?.(session.id)}
                className={`px-3 py-2 text-sm rounded-lg cursor-pointer truncate transition-colors ${
                  currentSessionId === session.id 
                    ? 'bg-[#2A2A2A] text-white' 
                    : 'text-gray-300 hover:bg-[#2A2A2A] hover:text-white'
                }`}
              >
                {/* Use ID snippet or date as title for now since we don't store titles yet */}
                Chat {session.id.substring(0, 8)}
              </div>
            ))}
        </div>
      </div>

      <div className="p-3 border-t border-white/10">
        <Button variant="ghost" className="w-full justify-start gap-3 text-sm font-normal text-white hover:bg-[#2F2F2F]">
            <div className="h-6 w-6 rounded-sm bg-green-600 flex items-center justify-center text-[10px] font-bold">
                OS
            </div>
            Upgrade plan
        </Button>
         <Button variant="ghost" className="w-full justify-start gap-3 text-sm font-normal text-white hover:bg-[#2F2F2F] mt-1">
            <LogOut className="h-4 w-4" />
            Log out
        </Button>
      </div>
    </div>
  );
}
