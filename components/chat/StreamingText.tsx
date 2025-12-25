'use client';

import { useState, useEffect, useRef } from 'react';

interface StreamingTextProps {
  content: string;
  speed?: number; // milliseconds per character
  onComplete?: () => void;
}

export default function StreamingText({ content, speed = 15, onComplete }: StreamingTextProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const contentRef = useRef(content);

  useEffect(() => {
    // Reset when content changes
    if (content !== contentRef.current) {
      contentRef.current = content;
      indexRef.current = 0;
      setDisplayedContent('');
      setIsComplete(false);
    }

    if (indexRef.current >= content.length) {
      if (!isComplete) {
        setIsComplete(true);
        onComplete?.();
      }
      return;
    }

    const timer = setTimeout(() => {
      // Add characters in chunks for faster streaming (3-5 chars at a time)
      const chunkSize = Math.min(3, content.length - indexRef.current);
      const nextChunk = content.slice(indexRef.current, indexRef.current + chunkSize);
      indexRef.current += chunkSize;
      setDisplayedContent(prev => prev + nextChunk);
    }, speed);

    return () => clearTimeout(timer);
  }, [content, displayedContent, speed, onComplete, isComplete]);

  return <>{displayedContent}</>;
}
