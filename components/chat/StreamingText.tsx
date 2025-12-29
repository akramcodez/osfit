'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

interface StreamingTextProps {
  content: string;
  speed?: number; 
  onComplete?: () => void;
}

export default function StreamingText({ content, speed = 8, onComplete }: StreamingTextProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const contentRef = useRef(content);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const getChunkSize = (position: number, text: string): number => {
    const remaining = text.length - position;
    if (remaining <= 0) return 0;
    
    const char = text[position];
    const nextChars = text.slice(position, position + 10);
    
    if (/\s/.test(char)) {
      const wordMatch = nextChars.match(/^\s*\S+/);
      if (wordMatch && wordMatch[0].length <= 15) {
        return Math.min(wordMatch[0].length, remaining);
      }
    }
    
    if (text.slice(Math.max(0, position - 3), position).includes('```')) {
      return Math.min(10, remaining);
    }
    
    if (/[.,!?:;]/.test(char)) {
      return 1;
    }
    
    return Math.min(2 + Math.floor(Math.random() * 3), remaining);
  };

  useEffect(() => {
    if (content !== contentRef.current) {
      contentRef.current = content;
      setTimeout(() => {
        setDisplayedLength(0);
        setIsComplete(false);
        lastTimeRef.current = 0;
      }, 0);
    }
  }, [content]);

  useEffect(() => {
    if (displayedLength >= content.length) {
      if (!isComplete && content.length > 0) {
        setTimeout(() => {
          setIsComplete(true);
          onComplete?.();
        }, 0);
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      
      const elapsed = timestamp - lastTimeRef.current;
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

  const displayedContent = useMemo(() => {
    return content.slice(0, displayedLength);
  }, [content, displayedLength]);

  return <>{displayedContent}</>;
}
