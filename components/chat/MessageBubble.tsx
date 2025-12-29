'use client';

import { Message, FileExplanation } from '@/types';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect, useRef, useMemo } from 'react';

import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';

import { CodeBlock } from '@/components/chat/CodeBlock';

type DisplayItem = Message | FileExplanation;

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

  useEffect(() => {
    if (!isUser && isNew && content && !completedRef.current) {
      const totalLength = content.length;
      
      const targetDuration = 3500;
      const baseChunkSize = Math.max(2, Math.ceil(totalLength / (targetDuration / 25)));
      
      const streamContent = () => {
        setDisplayedLength(prev => {
          if (prev >= totalLength) {
            setIsStreaming(false);
            if (!completedRef.current) {
              completedRef.current = true;
              setTimeout(() => onStreamComplete?.(), 0);
            }
            return totalLength;
          }
          
          const remaining = totalLength - prev;
          const chunkSize = Math.min(baseChunkSize + Math.floor(Math.random() * 3), remaining);
          const newLength = prev + chunkSize;
          
          streamRef.current = setTimeout(streamContent, 16);
          
          return newLength;
        });
      };
      
      streamRef.current = setTimeout(streamContent, 16);
      
      return () => {
        if (streamRef.current) clearTimeout(streamRef.current);
      };
    } else if (!isNew || isUser) {
      setTimeout(() => setDisplayedLength(content.length), 0);
    }
  }, [content, isUser, isNew, onStreamComplete]);

  const displayedContent = useMemo(() => {
    if (displayedLength >= content.length) {
      return content;
    }
    return content.slice(0, displayedLength);
  }, [content, displayedLength]);

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
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="px-1.5 py-0.5 bg-white/10 rounded text-primary text-sm" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return <code className={className} {...props}>{children}</code>;
                  },
                  h1: ({ children }) => (
                    <h1 className="text-xl font-semibold text-white mb-3 mt-4 first:mt-0 tracking-tight">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-semibold text-white mb-2 mt-4 first:mt-0 tracking-tight">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-white mb-2 mt-3 first:mt-0">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-200 leading-relaxed mb-3 last:mb-0">{children}</p>
                  ),
                  a: ({ children, href }) => (
                    <a href={href as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary pl-3 py-1 text-gray-300 bg-surface-3/40 rounded my-3">{children}</blockquote>
                  ),
                  hr: () => <hr className="border-border-subtle my-4" />,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-white">{children}</strong>
                  ),
                  table: ({ children }) => (
                    <div className="my-4 overflow-hidden rounded-lg border border-border-subtle">
                      <table className="w-full text-left text-sm text-gray-200">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-surface-3 text-gray-300">{children}</thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="bg-surface-2">{children}</tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="border-t border-border-subtle">{children}</tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 font-medium">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 align-top">{children}</td>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-outside ml-6 space-y-1 mb-3">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-outside ml-6 space-y-1 mb-3">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-200">{children}</li>
                  ),
                }}
              >
                {displayedContent}
              </ReactMarkdown>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed m-0 p-0 bg-transparent">
                {displayedContent}
                <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse align-middle" />
              </pre>
            )}
            {shouldRenderMarkdown && isStreaming && (
              <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
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
