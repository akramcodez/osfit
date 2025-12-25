'use client';

import { Message, FileExplanation } from '@/types';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect, useRef, useMemo } from 'react';

import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';

import { CodeBlock } from '@/components/chat/CodeBlock';

// Union type for display items
type DisplayItem = Message | FileExplanation;

// Helper to get content from either type
function getContent(item: DisplayItem): string {
  if ('content' in item) return item.content;
  if ('explanation' in item) return item.explanation || '';
  return '';
}

interface MessageBubbleProps {
  message: DisplayItem;
  isNew?: boolean;
  onStreamComplete?: () => void;
}

export default function MessageBubble({ message, isNew = false, onStreamComplete }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const content = getContent(message);
  const [displayedLength, setDisplayedLength] = useState(isUser || !isNew ? content.length : 0);
  const [isStreaming, setIsStreaming] = useState(!isUser && isNew && content.length > 0);
  const streamRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef<boolean>(false);

  // Fast streaming - complete in ~1-2 seconds max
  useEffect(() => {
    if (!isUser && isNew && content && !completedRef.current) {
      const totalLength = content.length;
      
      // Calculate speed to finish in ~3-4 seconds (like ChatGPT/Gemini)
      const targetDuration = 3500; // ms
      const baseChunkSize = Math.max(2, Math.ceil(totalLength / (targetDuration / 25)));
      
      const streamContent = () => {
        setDisplayedLength(prev => {
          if (prev >= totalLength) {
            setIsStreaming(false);
            if (!completedRef.current) {
              completedRef.current = true;
              // Defer callback to avoid setState during render
              setTimeout(() => onStreamComplete?.(), 0);
            }
            return totalLength;
          }
          
          // Variable chunk size for natural feel
          const remaining = totalLength - prev;
          const chunkSize = Math.min(baseChunkSize + Math.floor(Math.random() * 3), remaining);
          const newLength = prev + chunkSize;
          
          // Continue streaming
          streamRef.current = setTimeout(streamContent, 16); // 60fps
          
          return newLength;
        });
      };
      
      streamRef.current = setTimeout(streamContent, 16);
      
      return () => {
        if (streamRef.current) clearTimeout(streamRef.current);
      };
    } else if (!isNew || isUser) {
      setDisplayedLength(content.length);
    }
  }, [content, isUser, isNew, onStreamComplete]);

  // Memoize displayed content to reduce re-renders
  const displayedContent = useMemo(() => {
    if (displayedLength >= content.length) {
      return content;
    }
    return content.slice(0, displayedLength);
  }, [content, displayedLength]);

  // For streaming, show plain text to avoid layout jumps
  // Once complete, render full markdown
  const shouldRenderMarkdown = !isStreaming || displayedLength >= content.length;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-2 animate-message-in`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        <Card className={`border-0 ${
          isUser 
            ? 'p-3 bg-primary/10 text-primary-foreground text-white' 
            : 'p-0 bg-transparent shadow-none'
        }`}>
          <div 
            className={`prose max-w-none prose-headings:font-semibold ${
              isUser 
                ? 'prose-p:text-gray-100 prose-a:text-white prose-sm' 
                : 'prose-base prose-invert prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-0'
            }`}
            style={{ minHeight: isStreaming ? '1.5em' : 'auto' }}
          >
            {shouldRenderMarkdown ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  pre: CodeBlock,
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto my-4 rounded-lg border border-[#3E3E3E]">
                      <table {...props} className="w-full text-left border-collapse" />
                    </div>
                  ),
                  thead: ({node, ...props}) => (
                    <thead {...props} className="bg-[#2A2A2A] text-gray-200 border-b border-[#3E3E3E]" />
                  ),
                  tr: ({node, ...props}) => (
                    <tr {...props} className="border-b border-[#2A2A2A] last:border-0" />
                  ),
                  th: ({node, ...props}) => (
                    <th {...props} className="px-4 py-3 font-medium text-sm text-white border-r border-[#3E3E3E] last:border-r-0" />
                  ),
                  td: ({node, ...props}) => (
                    <td {...props} className="px-4 py-3 text-sm text-gray-300 border-r border-[#2A2A2A] last:border-r-0" />
                  ),
                  ul: ({node, ...props}) => (
                    <ul {...props} className="list-disc pl-6 my-4 space-y-1" />
                  ),
                  ol: ({node, ...props}) => (
                    <ol {...props} className="list-decimal pl-6 my-4 space-y-1" />
                  ),
                  li: ({node, ...props}) => (
                    <li {...props} className="pl-1" />
                  )
                }}
              >
                {displayedContent}
              </ReactMarkdown>
            ) : (
              // While streaming: show plain text with whitespace preserved
              <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed m-0 p-0 bg-transparent">
                {displayedContent}
                <span className="inline-block w-2 h-4 bg-[#3ECF8E] ml-1 animate-pulse align-middle" />
              </pre>
            )}
            {/* Cursor after markdown complete */}
            {shouldRenderMarkdown && isStreaming && (
              <span className="inline-block w-2 h-4 bg-[#3ECF8E] ml-1 animate-pulse" />
            )}
          </div>
        </Card>
        
        <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'flex-row' : 'flex-row-reverse justify-end'}`}>
          <span className="text-[10px] text-gray-600">
            {new Date(message.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
