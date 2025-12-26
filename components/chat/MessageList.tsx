'use client';

import { Message, AssistantMode, FileExplanation } from '@/types';
import MessageBubble from './MessageBubble';
import LoadingIndicator from './LoadingIndicator';
import Spinner from '@/components/ui/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef } from 'react';
import { t, LanguageCode } from '@/lib/translations';

// Union type for display items
type DisplayItem = Message | FileExplanation;

// Helper to get content from either type
function getContent(item: DisplayItem): string {
  if ('content' in item) return item.content;
  if ('explanation' in item) return item.explanation || '';
  return '';
}

interface MessageListProps {
  messages: DisplayItem[];
  isLoading?: boolean;
  isSessionLoading?: boolean;
  onModeSelect?: (mode: any) => void;
  currentMode?: AssistantMode;
  language?: LanguageCode;
  streamingMessageId?: string | null;
  onStreamComplete?: () => void;
}

export default function MessageList({ 
  messages, 
  isLoading, 
  isSessionLoading,
  onModeSelect, 
  currentMode, 
  language = 'en',
  streamingMessageId,
  onStreamComplete
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolledForStreamRef = useRef<string | null>(null);

  // Scroll to bottom when mode changes (component mounts/switches)
  useEffect(() => {
    hasInitialScrolledForStreamRef.current = null; // Reset tracking on mode change
    
    const timeoutId = setTimeout(() => {
      const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 200); // Increased delay to ensure data has loaded

    return () => clearTimeout(timeoutId);
  }, [currentMode]);

  // Auto-scroll to bottom when messages change or loading
  useEffect(() => {
    // Small delay to ensure DOM has updated
    const timeoutId = setTimeout(() => {
      const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [messages.length, isLoading]);

  // Scroll once when streaming starts - no continuous scrolling
  useEffect(() => {
    // Reset tracking when streaming ends
    if (!streamingMessageId) {
      hasInitialScrolledForStreamRef.current = null;
      return;
    }
    
    // Skip if already scrolled for this streaming message
    if (hasInitialScrolledForStreamRef.current === streamingMessageId) return;

    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    // Mark as scrolled for this streaming message
    hasInitialScrolledForStreamRef.current = streamingMessageId;
    
    // Single scroll when streaming starts
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: 'smooth'
    });
  }, [streamingMessageId]);

  // Show centered spinner when loading a session
  if (isSessionLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <ScrollArea className="w-full h-full" ref={scrollRef}>
      <div className="flex flex-col items-center w-full py-4 pb-48 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4 mt-20">
            <div className="h-12 w-12 bg-white text-black rounded-full flex items-center justify-center text-2xl font-bold mb-6">
                OS
            </div>
            <h2 className="text-2xl font-semibold text-white mb-8">{t('howCanIHelp', language)}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full">
                <div 
                    onClick={() => onModeSelect?.('issue_solver')}
                    className={`col-span-1 md:col-span-2 relative overflow-hidden group p-[1px] rounded-xl cursor-pointer transition-transform duration-300 hover:scale-[1.01]`}
                >
                    {/* Border Background: Wavy gradient when idle, Solid Green when selected */}
                    <div className={`absolute inset-0 transition-opacity duration-300 ${
                        currentMode === 'issue_solver' 
                            ? 'bg-[#3ECF8E] opacity-100' 
                            : 'bg-gradient-to-r from-[#3ECF8E] via-[#2a2a2a] to-[#3ECF8E] animate-gradient opacity-50 group-hover:opacity-70'
                    }`}></div>
                    
                    {/* Inner content container */}
                    <div className="relative h-full bg-[#2a2a2a] rounded-[11px] p-5 z-10 flex flex-col justify-center">
                         <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-white">{t('solveGitHubIssue', language)}</h3>
                        </div>
                        <p className="text-sm text-gray-300">{t('solveGitHubIssueDesc', language)}</p>
                    </div>
                </div>
                 <div 
                    onClick={() => onModeSelect?.('file_explainer')}
                    className={`bg-[#2a2a2a] p-4 rounded-xl border hover:bg-[#3E3E3E] cursor-pointer transition-colors text-left ${
                      currentMode === 'file_explainer' ? 'border-[#3ECF8E]' : 'border-[#3E3E3E]'
                    }`}
                >
                    <h3 className="text-sm font-medium text-white mb-1">{t('explainCodeFile', language)}</h3>
                    <p className="text-xs text-gray-400">{t('explainCodeFileDesc', language)}</p>
                </div>
                 <div 
                    onClick={() => onModeSelect?.('mentor')}
                    className={`bg-[#2a2a2a] p-4 rounded-xl border hover:bg-[#3E3E3E] cursor-pointer transition-colors text-left ${
                      currentMode === 'mentor' ? 'border-[#3ECF8E]' : 'border-[#3E3E3E]'
                    }`}
                >
                    <h3 className="text-sm font-medium text-white mb-1">{t('openSourceMentor', language)}</h3>
                    <p className="text-xs text-gray-400">{t('getGuidance', language)}</p>
                </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl px-4 flex flex-col space-y-6 pb-4">
            {messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message} 
                isNew={message.id === streamingMessageId}
                onStreamComplete={message.id === streamingMessageId ? onStreamComplete : undefined}
              />
            ))}
            {isLoading && (
              <div className="flex gap-4 w-full">
                <div className="w-8 h-8 rounded-full bg-[#3ECF8E] flex items-center justify-center text-xs font-bold text-black flex-shrink-0 mt-1">
                    OS
                </div>
                <div className="pt-2">
                    <LoadingIndicator />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
