'use client';

import { Message, AssistantMode, FileExplanation } from '@/types';
import MessageBubble from './MessageBubble';
import LoadingIndicator from './LoadingIndicator';
import Spinner from '@/components/ui/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef } from 'react';
import { t, LanguageCode } from '@/lib/translations';

type DisplayItem = Message | FileExplanation;

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

  useEffect(() => {
    hasInitialScrolledForStreamRef.current = null;
    
    const timeoutId = setTimeout(() => {
      const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [currentMode]);

  useEffect(() => {
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

  useEffect(() => {
    if (!streamingMessageId) {
      hasInitialScrolledForStreamRef.current = null;
      return;
    }
    
    if (hasInitialScrolledForStreamRef.current === streamingMessageId) return;

    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    hasInitialScrolledForStreamRef.current = streamingMessageId;
    
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: 'smooth'
    });
  }, [streamingMessageId]);

  if (isSessionLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <ScrollArea className="w-full h-full" ref={scrollRef}>
      <div className="flex flex-col items-center w-full py-4 pb-12 space-y-6 px-3 md:px-4 overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-3 md:px-4 max-w-full">
            <div className="h-12 w-12 sm:h-16 sm:w-16 bg-white text-black rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mb-6 sm:mb-8 shadow-xl flex-shrink-0 aspect-square">
                OS
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white mb-6 sm:mb-8 max-w-sm md:max-w-none">{t('howCanIHelp', language)}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-3xl w-full">
                <div 
                    onClick={() => onModeSelect?.('issue_solver')}
                    className={`col-span-1 md:col-span-2 group p-5 rounded-2xl cursor-pointer transition-all duration-300 border h-full flex flex-col justify-center ${
                      currentMode === 'issue_solver' 
                        ? 'bg-primary/10 border-primary ring-1 ring-primary/50' 
                        : 'bg-secondary border-border-subtle hover:border-primary/50 hover:bg-secondary/80'
                    }`}
                >
                     <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-white">{t('solveGitHubIssue', language)}</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 text-left">{t('solveGitHubIssueDesc', language)}</p>
                </div>

                 <div 
                    onClick={() => onModeSelect?.('file_explainer')}
                    className={`bg-secondary p-4 rounded-xl border cursor-pointer transition-all duration-200 text-left h-full ${
                      currentMode === 'file_explainer' ? 'border-primary bg-primary/5' : 'border-border-subtle hover:border-primary/50 hover:bg-secondary/80'
                    }`}
                >
                    <h3 className="text-xs sm:text-sm font-medium text-white mb-2">{t('explainCodeFile', language)}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{t('explainCodeFileDesc', language)}</p>
                </div>

                 <div 
                    onClick={() => onModeSelect?.('mentor')}
                    className={`bg-secondary p-4 rounded-xl border cursor-pointer transition-all duration-200 text-left h-full ${
                      currentMode === 'mentor' ? 'border-primary bg-primary/5' : 'border-border-subtle hover:border-primary/50 hover:bg-secondary/80'
                    }`}
                >
                    <h3 className="text-xs sm:text-sm font-medium text-white mb-2">{t('openSourceMentor', language)}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{t('getGuidance', language)}</p>
                </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl flex flex-col space-y-6 pb-4 overflow-hidden">
            {messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message} 
                isNew={message.id === streamingMessageId}
                onStreamComplete={message.id === streamingMessageId ? onStreamComplete : undefined}
              />
            ))}
            {isLoading && (
              <div className="flex gap-2 md:gap-4 w-full px-2 md:px-0">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center text-[10px] md:text-xs font-bold text-black flex-shrink-0 mt-1">
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
