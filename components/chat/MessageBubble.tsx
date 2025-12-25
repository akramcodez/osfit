'use client';

import { Message } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';

import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';

import { CodeBlock } from '@/components/chat/CodeBlock';

interface MessageBubbleProps {
  message: Message;
  isNew?: boolean; // Flag to enable streaming for new messages
  onStreamComplete?: () => void;
}

export default function MessageBubble({ message, isNew = false, onStreamComplete }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [displayedContent, setDisplayedContent] = useState(isUser || !isNew ? message.content : '');
  const [isStreaming, setIsStreaming] = useState(!isUser && isNew && message.content.length > 0);

  useEffect(() => {
    if (!isUser && isNew && message.content) {
      let currentIndex = 0;
      const content = message.content;
      
      // Stream characters with variable speed
      const streamContent = () => {
        if (currentIndex >= content.length) {
          setIsStreaming(false);
          onStreamComplete?.(); // Notify parent that streaming is done
          return;
        }

        // Add 2-4 characters at a time for natural feel
        const chunkSize = Math.min(2 + Math.floor(Math.random() * 3), content.length - currentIndex);
        currentIndex += chunkSize;
        setDisplayedContent(content.slice(0, currentIndex));

        // Variable delay: faster for regular text, pause at punctuation
        const currentChar = content[currentIndex - 1];
        let delay = 8; // Base speed
        if (['.', '!', '?', '\n'].includes(currentChar)) {
          delay = 80; // Pause at sentence ends
        } else if ([',', ';', ':'].includes(currentChar)) {
          delay = 40; // Small pause at commas
        }

        setTimeout(streamContent, delay);
      };

      streamContent();
    } else {
      setDisplayedContent(message.content);
    }
  }, [message.content, isUser, isNew, onStreamComplete]);
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-2 animate-message-in`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        <Card className={`border-0 ${
          isUser 
            ? 'p-3 bg-primary/10 text-primary-foreground text-white' 
            : 'p-0 bg-transparent shadow-none' /** AI: Free floating */
        }`}>
          <div className={`prose max-w-none prose-headings:font-semibold ${
            isUser ? 'prose-p:text-gray-100 prose-a:text-white prose-sm' : 'prose-base prose-invert prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-0'
          }`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: CodeBlock,
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto my-4 border border-white/10 rounded-lg">
                    <table {...props} className="w-full text-left border-collapse" />
                  </div>
                ),
                thead: ({node, ...props}) => (
                  <thead {...props} className="bg-white/5 text-gray-200" />
                ),
                th: ({node, ...props}) => (
                  <th {...props} className="px-4 py-3 border-b border-white/10 font-medium text-sm" />
                ),
                td: ({node, ...props}) => (
                  <td {...props} className="px-4 py-3 border-b border-white/5 text-sm text-gray-300 last:border-0" />
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
            {/* Blinking cursor while streaming */}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-[#3ECF8E] ml-1 animate-pulse" />
            )}
          </div>
        </Card>
        
        <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'flex-row' : 'flex-row-reverse justify-end'}`}>
          {message.mode && (
            <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-gray-500">
              {message.mode.replace('_', ' ')}
            </Badge>
          )}
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
