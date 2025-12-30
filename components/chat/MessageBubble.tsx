'use client';

import { Message, FileExplanation } from '@/types';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';

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
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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

  const shouldRenderMarkdown = true; // Always render markdown, even during streaming

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-2 animate-message-in overflow-hidden`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[calc(100vw-2rem)] md:max-w-[85%] min-w-0`}>
        <Card className={`border-0 overflow-hidden ${
          isUser 
            ? 'px-3 py-2 md:px-4 md:py-2.5 bg-primary/10 text-primary-foreground text-white inline-block' 
            : 'p-0 bg-transparent shadow-none w-full'
        }`}>
          <div 
            className={`prose max-w-none prose-headings:font-semibold overflow-hidden ${
              isUser 
                ? 'prose-p:text-gray-100 prose-a:text-white prose-sm md:prose-base prose-p:break-words prose-strong:break-words prose-p:my-0 prose-p:leading-normal' 
                : 'prose-sm md:prose-base prose-invert prose-p:leading-relaxed prose-p:break-words prose-strong:break-words prose-li:break-words'
            }`}
            style={{ 
              minHeight: isStreaming ? '1.5em' : 'auto',
              maxWidth: '100%',
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
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
                        <code className="px-1.5 py-0.5 bg-white/10 rounded text-primary text-sm break-all" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return <code className={`${className} whitespace-pre-wrap break-words`} {...props}>{children}</code>;
                  },
                  h1: ({ children }) => (
                    <h1 className="text-lg sm:text-xl font-semibold text-white mb-3 mt-4 first:mt-0 tracking-tight">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base sm:text-lg font-semibold text-white mb-2 mt-4 first:mt-0 tracking-tight">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-white mb-2 mt-3 first:mt-0">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-200 leading-relaxed mb-3 last:mb-0 break-words overflow-wrap-anywhere">{children}</p>
                  ),
                  a: ({ children, href }) => (
                    <a href={href as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary pl-3 py-1 text-gray-300 rounded my-3">{children}</blockquote>
                  ),
                  hr: () => <hr className="border-border-subtle my-4" />,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-white break-words">{children}</strong>
                  ),
                  table: ({ children }) => (
                    <div className="my-4 w-full overflow-x-auto rounded-lg border border-border-subtle">
                      <table className="w-full text-left text-sm text-gray-200 table-fixed">{children}</table>
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
                    <li className="text-gray-200 break-words">{children}</li>
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
        
        <div className={`relative z-12 flex items-center gap-2 mt-1 px-1 ${isUser ? 'flex-row' : 'flex-row-reverse justify-end'}`}>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-surface-2 transition-colors group/copy cursor-pointer"
              title={isCopied ? 'Copied!' : 'Copy markdown'}
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-gray-600 group-hover/copy:text-gray-400 transition-colors" />
              )}
            </button>
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
