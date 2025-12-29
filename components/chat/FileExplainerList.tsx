'use client';

import { FileExplanation, AssistantMode } from '@/types';
import FileExplainerCard from './FileExplainerCard';
import LoadingIndicator from './LoadingIndicator';
import Spinner from '@/components/ui/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef } from 'react';
import { t, LanguageCode } from '@/lib/translations';
import { FileCode } from 'lucide-react';

interface FileExplainerListProps {
  explanations: FileExplanation[];
  isLoading?: boolean;
  isSessionLoading?: boolean;
  onModeSelect?: (mode: AssistantMode) => void;
  currentMode?: AssistantMode;
  language?: LanguageCode;
  streamingId?: string | null;
  onStreamComplete?: () => void;
  onDelete?: (id: string) => Promise<void> | void;
}

export default function FileExplainerList({
  explanations,
  isLoading,
  isSessionLoading,
  onModeSelect,
  currentMode,
  language = 'en',
  streamingId,
  onStreamComplete,
  onDelete
}: FileExplainerListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const hasInitialScrolledForStreamRef = useRef<string | null>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const currentScrollTop = scrollContainer.scrollTop;
      
      const isAtBottom = scrollHeight - currentScrollTop - clientHeight < 50;
      isUserScrollingRef.current = !isAtBottom;
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = (container: Element) => {
    isProgrammaticScrollRef.current = true;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 500);
  };

  useEffect(() => {
    isUserScrollingRef.current = false;
    hasInitialScrolledForStreamRef.current = null;
    
    const timeoutId = setTimeout(() => {
      const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollToBottom(scrollContainer);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [currentMode]);

  useEffect(() => {
    if (isUserScrollingRef.current) return;

    const timeoutId = setTimeout(() => {
      const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollToBottom(scrollContainer);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [explanations.length]);

  useEffect(() => {
    if (!streamingId) {
      hasInitialScrolledForStreamRef.current = null;
      return;
    }
    
    if (hasInitialScrolledForStreamRef.current === streamingId || isUserScrollingRef.current) return;

    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    hasInitialScrolledForStreamRef.current = streamingId;
    scrollToBottom(scrollContainer);
  }, [streamingId]);

  if (isSessionLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <ScrollArea className="w-full h-full" ref={scrollRef}>
      <div className="flex flex-col items-center w-full py-4 pb-48">
        {explanations.length === 0 ? (
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
                    <div className={`absolute inset-0 transition-opacity duration-300 ${
                        currentMode === 'issue_solver' 
                            ? 'bg-primary opacity-100' 
                            : 'bg-gradient-to-r from-primary via-secondary to-primary animate-gradient opacity-50 group-hover:opacity-70'
                    }`}></div>
                    
                    <div className="relative h-full bg-secondary rounded-[11px] p-5 z-10 flex flex-col justify-center">
                         <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-white">{t('solveGitHubIssue', language)}</h3>
                        </div>
                        <p className="text-sm text-gray-300">{t('solveGitHubIssueDesc', language)}</p>
                    </div>
                </div>
                 <div 
                    onClick={() => onModeSelect?.('file_explainer')}
                    className={`bg-secondary p-4 rounded-xl border hover:bg-border-strong cursor-pointer transition-colors text-left ${
                      currentMode === 'file_explainer' ? 'border-primary' : 'border-border-strong'
                    }`}
                >
                    <h3 className="text-sm font-medium text-white mb-1">{t('explainCodeFile', language)}</h3>
                    <p className="text-xs text-gray-400">{t('explainCodeFileDesc', language)}</p>
                </div>
                 <div 
                    onClick={() => onModeSelect?.('mentor')}
                    className={`bg-secondary p-4 rounded-xl border hover:bg-border-strong cursor-pointer transition-colors text-left ${
                      currentMode === 'mentor' ? 'border-primary' : 'border-border-strong'
                    }`}
                >
                    <h3 className="text-sm font-medium text-white mb-1">{t('openSourceMentor', language)}</h3>
                    <p className="text-xs text-gray-400">{t('getGuidance', language)}</p>
                </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-5xl px-4 flex flex-col">
            {explanations.map((item) => (
              <FileExplainerCard
                key={item.id}
                data={item}
                isNew={item.id === streamingId}
                onStreamComplete={item.id === streamingId ? onStreamComplete : undefined}
                onDelete={onDelete}
                uiLanguage={language}
              />
            ))}
            {isLoading && (
              <div className="flex gap-4 w-full mb-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
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
