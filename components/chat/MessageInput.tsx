'use client';

import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, Mic } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="w-full max-w-3xl relative mb-2">
      <div className="relative flex items-end w-full p-3 bg-[#2F2F2F] rounded-2xl border border-white/10 shadow-lg focus-within:border-white/20 transition-colors">
        
        {/* Attachment Icon (Visual Only) */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white mb-1 mr-2 rounded-full">
            <Paperclip className="h-5 w-5" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyPress}
          placeholder="Message OSFIT..."
          className="flex-1 min-h-[24px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-white placeholder:text-gray-400 resize-none py-2"
          rows={1}
          disabled={disabled}
        />

        <div className="flex items-center gap-1 ml-2 mb-0.5">
           {/* Mic Icon (Visual Only) - could be real later */}
            {!input.trim() && (
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-white rounded-full bg-black/50 hover:bg-black/70">
                    <Mic className="h-4 w-4" />
                </Button>
            )}

            <Button 
            onClick={handleSend} 
            disabled={disabled || !input.trim()}
            size="icon"
            className={`h-8 w-8 rounded-lg transition-all duration-200 ${
                input.trim() 
                ? 'bg-white text-black hover:bg-gray-200' 
                : 'bg-transparent text-gray-500 cursor-not-allowed'
            }`}
            >
            <Send className="h-4 w-4" />
            </Button>
        </div>
      </div>
      <div className="text-center mt-2">
        <p className="text-xs text-gray-500">OSFIT can make mistakes. Consider checking important information.</p>
      </div>
    </div>
  );
}
