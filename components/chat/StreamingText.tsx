'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

interface StreamingTextProps {
  content: string;
  speed?: number; // base milliseconds per chunk
  onComplete?: () => void;
}

export default function StreamingText({ content, speed = 8, onComplete }: StreamingTextProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const contentRef = useRef(content);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Calculate chunk size based on content type for natural reading
  const getChunkSize = (position: number, text: string): number => {
    const remaining = text.length - position;
    if (remaining <= 0) return 0;
    
    const char = text[position];
    const nextChars = text.slice(position, position + 10);
    
    // At word boundaries, take whole words for natural feel
    if (/\s/.test(char)) {
      const wordMatch = nextChars.match(/^\s*\S+/);
      if (wordMatch && wordMatch[0].length <= 15) {
        return Math.min(wordMatch[0].length, remaining);
      }
    }
    
    // For code blocks, stream faster
    if (text.slice(Math.max(0, position - 3), position).includes('```')) {
      return Math.min(10, remaining);
    }
    
    // For punctuation, pause slightly by taking single char
    if (/[.,!?:;]/.test(char)) {
      return 1;
    }
    
    // Default: stream 2-5 characters
    return Math.min(2 + Math.floor(Math.random() * 3), remaining);
  };

  useEffect(() => {
    // Reset when content changes
    if (content !== contentRef.current) {
      contentRef.current = content;
      setDisplayedLength(0);
      setIsComplete(false);
    }

    if (displayedLength >= content.length) {
      if (!isComplete) {
        setIsComplete(true);
        onComplete?.();
      }
      return;
    }

    // Use requestAnimationFrame for smoother animation
    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      
      const elapsed = timestamp - lastTimeRef.current;
      
      // Dynamic speed: faster at start, slightly slower near punctuation
      const dynamicSpeed = speed;
      
      if (elapsed >= dynamicSpeed) {
        lastTimeRef.current = timestamp;
        const chunkSize = getChunkSize(displayedLength, content);
        setDisplayedLength(prev => Math.min(prev + chunkSize, content.length));
      }
      
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [content, displayedLength, speed, onComplete, isComplete]);

  // Memoize the displayed content to prevent unnecessary re-renders
  const displayedContent = useMemo(() => {
    return content.slice(0, displayedLength);
  }, [content, displayedLength]);

  return <>{displayedContent}</>;
}
