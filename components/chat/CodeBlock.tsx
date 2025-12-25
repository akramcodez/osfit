'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children?: React.ReactNode;
}

export function CodeBlock({ children, ...props }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  // Extract language from className (e.g., "language-javascript")
  const getLanguage = (): string => {
    if (children && typeof children === 'object' && 'props' in children) {
      const className = (children as any).props?.className || '';
      const match = className.match(/language-(\w+)/);
      return match ? match[1] : '';
    }
    return '';
  };

  // Extract function to get text content from React children
  const getTextContent = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(getTextContent).join('');
    if (node && typeof node === 'object' && 'props' in node) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return getTextContent((node as any).props.children);
    }
    return '';
  };

  const onCopy = async () => {
    const text = getTextContent(children);
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const language = getLanguage();

  return (
    <div className="relative my-4 overflow-hidden rounded-lg border border-white/10 bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/5">
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider font-mono">
          {language || 'CODE'}
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 hover:text-white transition-colors"
        >
          {isCopied ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          <span>{isCopied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      
      {/* Code Content */}
      <div className="p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <pre {...props} className="clean-code-block !bg-transparent p-0 m-0 font-mono text-[13px] leading-6 tab-4">
          {children}
        </pre>
      </div>
    </div>
  );
}
