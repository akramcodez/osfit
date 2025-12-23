'use client';

import { Message } from '@/types';
import MessageBubble from './MessageBubble';
import LoadingIndicator from './LoadingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { useEffect, useRef } from 'react';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to OSFIT!</h2>
          <p className="text-gray-600 max-w-md">
            Your multilingual assistant for open-source contribution.
            Select a mode and start chatting!
          </p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex gap-3 mb-4">
              <Avatar className="w-8 h-8">
                <div className="w-full h-full flex items-center justify-center text-sm font-semibold bg-purple-500 text-white">
                  AI
                </div>
              </Avatar>
              <LoadingIndicator />
            </div>
          )}
        </>
      )}
    </ScrollArea>
  );
}
