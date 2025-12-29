'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children?: React.ReactNode;
}

export function CodeBlock({ children, ...props }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const getLanguage = (): string => {
    if (children && typeof children === 'object' && 'props' in children) {
      const className = (children as any).props?.className || '';
      const match = className.match(/language-(\w+)/);
      return match ? match[1] : '';
    }
    return '';
  };

  const getTextContent = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(getTextContent).join('');
    if (node && typeof node === 'object' && 'props' in node) {
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
    <div className="relative my-4 rounded-lg border border-white/10 bg-surface-3 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/5 min-w-0">
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider font-mono truncate">
          {language || 'CODE'}
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 hover:text-white transition-colors flex-shrink-0 ml-2"
        >
          {isCopied ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      
      <div className="p-4 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent w-full">
        <pre {...props} className="clean-code-block !bg-transparent p-0 m-0 font-mono text-[11px] sm:text-[13px] leading-6 tab-4 whitespace-pre min-w-min">
          {children}
        </pre>
      </div>
    </div>
  );
}
