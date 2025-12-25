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
}

export default function FileExplainerList({
  explanations,
  isLoading,
  isSessionLoading,
  onModeSelect,
  currentMode,
  language = 'en',
  streamingId,
  onStreamComplete
}: FileExplainerListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
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
  }, [explanations.length, isLoading]);

  // Scroll during streaming
  const lastExplanation = explanations.length > 0 ? explanations[explanations.length - 1] : null;
  const lastContentLength = lastExplanation?.explanation?.length || 0;

  useEffect(() => {
    if (!streamingId) return;

    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: 'smooth'
    });

    const scrollInterval = setInterval(() => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);

    return () => clearInterval(scrollInterval);
  }, [streamingId, lastContentLength]);

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
          // Empty state for File Explainer
          <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4 mt-20">
            <div className="h-16 w-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl flex items-center justify-center mb-6">
              <FileCode className="h-8 w-8 text-[#3ECF8E]" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">File Explainer</h2>
            <p className="text-gray-400 max-w-md mb-8">
              Paste a GitHub file URL and I'll explain the code - its purpose, key functions, logic flow, and dependencies.
            </p>
            
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 max-w-lg w-full">
              <p className="text-xs text-gray-500 mb-2">Example URL:</p>
              <code className="text-sm text-[#3ECF8E] break-all">
                https://github.com/facebook/react/blob/main/packages/react/src/React.js
              </code>
            </div>

            {/* Mode switcher cards */}
            <div className="grid grid-cols-2 gap-4 max-w-lg w-full mt-8">
              <div
                onClick={() => onModeSelect?.('mentor')}
                className={`bg-[#2a2a2a] p-4 rounded-xl border cursor-pointer transition-colors text-left ${
                  currentMode === 'mentor' ? 'border-[#3ECF8E]' : 'border-[#3E3E3E] hover:border-[#4E4E4E]'
                }`}
              >
                <h3 className="text-sm font-medium text-white mb-1">{t('openSourceMentor', language)}</h3>
                <p className="text-xs text-gray-400">{t('getGuidance', language)}</p>
              </div>
              <div
                onClick={() => onModeSelect?.('issue_solver')}
                className={`bg-[#2a2a2a] p-4 rounded-xl border cursor-pointer transition-colors text-left ${
                  currentMode === 'issue_solver' ? 'border-[#3ECF8E]' : 'border-[#3E3E3E] hover:border-[#4E4E4E]'
                }`}
              >
                <h3 className="text-sm font-medium text-white mb-1">{t('issueSolver', language)}</h3>
                <p className="text-xs text-gray-400">{t('solveGitHubIssueDesc', language)}</p>
              </div>
            </div>
          </div>
        ) : (
          // List of file explanations
          <div className="w-full max-w-5xl px-4 flex flex-col">
            {explanations.map((item) => (
              <FileExplainerCard
                key={item.id}
                data={item}
                isNew={item.id === streamingId}
                onStreamComplete={item.id === streamingId ? onStreamComplete : undefined}
              />
            ))}
            {isLoading && (
              <div className="flex gap-4 w-full mb-4">
                <div className="w-8 h-8 rounded-full bg-[#3ECF8E] flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
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
