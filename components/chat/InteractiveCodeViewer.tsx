'use client';

import { useState, useMemo } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

interface InteractiveCodeViewerProps {
  code: string;
  language: string;
  selectedLine: number | null;
  onLineClick: (lineNumber: number, lineContent: string) => void;
  isLoading?: boolean;
}

export default function InteractiveCodeViewer({
  code,
  language,
  selectedLine,
  onLineClick,
  isLoading = false
}: InteractiveCodeViewerProps) {
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  // Split code into lines and highlight
  const highlightedLines = useMemo(() => {
    const lines = code.split('\n');
    
    // Try to highlight the full code first for better context
    let highlighted: string;
    try {
      // Check if language is registered, fallback to plaintext if not
      const langToUse = language && hljs.getLanguage(language) ? language : 'plaintext';
      highlighted = hljs.highlight(code, { language: langToUse }).value;
    } catch {
      highlighted = hljs.highlightAuto(code).value;
    }
    
    // Split highlighted code by newlines while preserving HTML
    const highlightedLines = highlighted.split('\n');
    
    return lines.map((rawLine, index) => ({
      number: index + 1,
      raw: rawLine,
      highlighted: highlightedLines[index] || rawLine
    }));
  }, [code, language]);

  const handleLineClick = (lineNum: number, lineContent: string) => {
    if (!isLoading) {
      onLineClick(lineNum, lineContent);
    }
  };

  return (
    <div className="font-mono text-sm overflow-auto max-h-[500px] app-scroll">
      <table className="w-full border-collapse">
        <tbody>
          {highlightedLines.map((line) => {
            const isSelected = selectedLine === line.number;
            const isHovered = hoveredLine === line.number;
            
            return (
              <tr
                key={line.number}
                className={`
                  group cursor-pointer transition-colors duration-150
                  ${isSelected 
                    ? 'bg-[#3ECF8E]/20 border-l-2 border-[#3ECF8E]' 
                    : isHovered 
                      ? 'bg-white/5' 
                      : 'hover:bg-white/5'
                  }
                  ${isLoading ? 'cursor-wait opacity-70' : ''}
                `}
                onClick={() => handleLineClick(line.number, line.raw)}
                onMouseEnter={() => setHoveredLine(line.number)}
                onMouseLeave={() => setHoveredLine(null)}
              >
                {/* Line number */}
                <td 
                  className={`
                    w-12 px-3 py-0.5 text-right select-none
                    ${isSelected 
                      ? 'text-[#3ECF8E] font-semibold' 
                      : 'text-gray-500 group-hover:text-gray-400'
                    }
                  `}
                >
                  {line.number}
                </td>
                
                {/* Code content */}
                <td className="px-4 py-0.5 whitespace-pre">
                  <code 
                    className="hljs"
                    dangerouslySetInnerHTML={{ __html: line.highlighted || '&nbsp;' }}
                  />
                </td>
                
                {/* Click indicator on hover */}
                <td className="w-8 px-2">
                  {(isHovered && !isSelected && !isLoading) && (
                    <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      ▶
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-[#3ECF8E] text-xs">◀</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Empty state for very short files */}
      {highlightedLines.length === 0 && (
        <div className="text-gray-500 text-center py-8">
          No code to display
        </div>
      )}
    </div>
  );
}
