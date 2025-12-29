'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileExplanation } from '@/types';
import { Check, Copy, ChevronLeft, ChevronRight, ExternalLink, FileCode, ChevronsDown, ChevronsUp, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';
import { CodeBlock } from './CodeBlock';
import InteractiveCodeViewer from './InteractiveCodeViewer';
import MermaidRenderer from './MermaidRenderer';
import Spinner from '@/components/ui/spinner';
import { LanguageCode } from '@/lib/translations';
import { supabase } from '@/lib/supabase-auth';

interface FileExplainerCardProps {
  data: FileExplanation;
  isNew?: boolean;
  onStreamComplete?: () => void;
  onDelete?: (id: string) => Promise<void> | void;
  uiLanguage?: LanguageCode;
}

const LANGUAGE_NAMES: Record<string, string> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript React',
  jsx: 'JavaScript React',
  py: 'Python',
  rb: 'Ruby',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  kt: 'Kotlin',
  swift: 'Swift',
  c: 'C',
  cpp: 'C++',
  cs: 'C#',
  php: 'PHP',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Bash',
  dockerfile: 'Dockerfile',
};

const DEMO_CODE = `API Key Required

To view file content, please configure your API keys:
1. Click your profile avatar in the sidebar
2. Add your Apify API key

Get your free key at: apify.com`;

export default function FileExplainerCard({ data, isNew = false, onStreamComplete, onDelete, uiLanguage = 'en' }: FileExplainerCardProps) {
  const [isCodeExpanded, setIsCodeExpanded] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [displayedLength, setDisplayedLength] = useState(isNew ? 0 : (data.explanation?.length || 0));
  const [isStreaming, setIsStreaming] = useState(isNew && !!data.explanation);
  const streamRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef<boolean>(false);

  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [lineExplanation, setLineExplanation] = useState<string>('');
  const [isExplainingLine, setIsExplainingLine] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'line' | 'diagram'>('overview');
  const [isDeleting, setIsDeleting] = useState(false);

  const [flowchart, setFlowchart] = useState<string | null>(null);
  const [isGeneratingFlowchart, setIsGeneratingFlowchart] = useState(false);
  const [flowchartError, setFlowchartError] = useState<string | null>(null);

  const explanation = data.explanation || '';
  const fileContent = data.file_content || DEMO_CODE;
  const fileName = data.file_path || data.file_url?.split('/').pop() || 'api-client.ts';
  const language = data.language || fileName.split('.').pop() || 'ts';
  const languageDisplay = LANGUAGE_NAMES[language.toLowerCase()] || language.toUpperCase();

  useEffect(() => {
    if (isNew && explanation && !completedRef.current) {
      const totalLength = explanation.length;
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
    } else if (!isNew) {
      setDisplayedLength(explanation.length);
    }
  }, [explanation, isNew, onStreamComplete]);

  const displayedExplanation = useMemo(() => {
    if (displayedLength >= explanation.length) return explanation;
    return explanation.slice(0, displayedLength);
  }, [explanation, displayedLength]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(fileContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const openInGitHub = () => {
    if (data.file_url) {
      window.open(data.file_url, '_blank');
    }
  };

  const handleLineClick = async (lineNumber: number, lineContent: string) => {
    setSelectedLine(lineNumber);
    setActiveTab('line');
    setIsExplainingLine(true);
    setLineExplanation('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/explain-line', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          lineNumber,
          lineContent,
          fullFileContent: fileContent,
          language,
          filePath: fileName,
          targetLanguage: uiLanguage,
          useMockData: false
        })
      });

      const result = await response.json();
      if (result.explanation) {
        setLineExplanation(result.explanation);
      } else {
        setLineExplanation('Could not explain this line. Try another one.');
      }
    } catch (error) {
      console.error('Line explanation error:', error);
      setLineExplanation('Failed to get explanation. Please try again.');
    } finally {
      setIsExplainingLine(false);
    }
  };

  if (data.role === 'user') {
    return (
      <div className="flex justify-end mb-4 animate-message-in">
        <div className="bg-primary/10 text-white px-4 py-2 rounded-xl max-w-[80%]">
          <div className="flex items-center gap-2 text-sm">
            <FileCode className="h-4 w-4 text-primary" />
            <span className="truncate">{data.file_url || data.explanation}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mb-6 animate-message-in min-w-0 max-w-[calc(100vw-2rem)] overflow-hidden">
      <div className="bg-surface-1 rounded-xl border border-border-subtle overflow-hidden min-w-0 w-full">
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-surface-2 border-b border-border-subtle min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileCode className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h3 className="text-sm font-medium text-white truncate">{fileName}</h3>
              <p className="text-xs text-gray-500 truncate">{languageDisplay}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {data.file_url && (
              <button
                onClick={openInGitHub}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Open in GitHub"
              >
                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              {isCollapsed ? (
                <>
                  <ChevronsDown className="h-3 w-3" />
                  <span className="hidden sm:inline">Expand</span>
                </>
              ) : (
                <>
                  <ChevronsUp className="h-3 w-3" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsCodeExpanded(!isCodeExpanded)}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors whitespace-nowrap"
              title={isCodeExpanded ? "Hide Code" : "Show Code"}
            >
              {isCodeExpanded ? (
                <>
                  <ChevronLeft className="h-3 w-3" />
                  <span className="hidden sm:inline">Code</span>
                </>
              ) : (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span className="hidden sm:inline">Code</span>
                </>
              )}
            </button>
            {onDelete && (
              <button
                onClick={async () => {
                   if (isDeleting) return;
                   setIsDeleting(true);
                   try {
                     await onDelete(data.id);
                   } catch (e) {
                     console.error(e);
                     setIsDeleting(false);
                   }
                }}
                className={`p-2 rounded-lg transition-colors ${
                  isDeleting 
                    ? 'cursor-wait opacity-100 text-red-500/80 bg-red-500/10' 
                    : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                }`}
                title="Delete explanation"
                disabled={isDeleting}
              >
                {isDeleting ? <Spinner size="sm" className="text-red-500 h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="flex flex-col min-w-0 w-full max-w-full overflow-hidden">
          <AnimatePresence initial={false}>
            {isCodeExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="bg-surface-3 border-b border-border-subtle min-w-0 w-full max-w-full overflow-hidden"
              >
                <InteractiveCodeViewer
                  code={fileContent}
                  language={language}
                  selectedLine={selectedLine}
                  onLineClick={handleLineClick}
                  isLoading={isExplainingLine}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-surface-1 min-w-0 w-full max-w-full overflow-hidden flex-1">
            <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-border-subtle min-w-0 max-w-full">
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto">
                <div className="h-5 w-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-black">OS</span>
                </div>
                <div className="flex gap-1 flex-nowrap flex-shrink-0">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded transition-colors whitespace-nowrap ${
                      activeTab === 'overview'
                        ? 'bg-primary/20 text-primary'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('line')}
                    className={`px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded transition-colors whitespace-nowrap ${
                      activeTab === 'line'
                        ? 'bg-primary/20 text-primary'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Line {selectedLine || '—'}
                  </button>
                  <button
                    onClick={async () => {
                      setActiveTab('diagram');
                      if (!flowchart && !isGeneratingFlowchart && !flowchartError) {
                        setIsGeneratingFlowchart(true);
                        setFlowchartError(null);
                        try {
                          const { data: { session: authSession } } = await supabase.auth.getSession();
                          
                          const response = await fetch('/api/generate-flowchart', {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              ...(authSession?.access_token && { 'Authorization': `Bearer ${authSession.access_token}` })
                            },
                            body: JSON.stringify({
                              fileContent,
                              language,
                              filePath: fileName,
                              explanationId: data.id,
                              targetLanguage: uiLanguage,
                              useMockData: false
                            })
                          });
                          const result = await response.json();
                          if (result.flowchart) {
                            setFlowchart(result.flowchart);
                          } else {
                            setFlowchartError('Could not generate diagram');
                          }
                        } catch (err) {
                          console.error('Flowchart error:', err);
                          setFlowchartError('Failed to generate diagram');
                        } finally {
                          setIsGeneratingFlowchart(false);
                        }
                      }
                    }}
                    className={`px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded transition-colors whitespace-nowrap ${
                      activeTab === 'diagram'
                        ? 'bg-primary/20 text-primary'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Diagram
                  </button>
                </div>
              </div>
            </div>
            <div className="p-3 sm:p-4 overflow-x-hidden overflow-y-auto max-h-[400px] sm:max-h-[500px] app-scroll w-full max-w-full">
              {activeTab === 'overview' && (
                <div className="prose prose-invert prose-sm max-w-full prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-p:break-words prose-strong:break-words prose-li:break-words overflow-hidden" style={{ maxWidth: '100%', wordBreak: 'break-word' }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      pre: ({ children, ...props }) => <CodeBlock {...props}>{children}</CodeBlock>,
                          code: ({ className, children, ...props }) => {
                            const isInline = !className;
                            if (isInline) {
                              return (
                                <code className="px-1.5 py-0.5 bg-white/10 rounded text-primary text-sm break-all" {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return <code className={`${className} break-words`} {...props}>{children}</code>;
                          },
                      h1: ({ children }) => (
                        <h1 className="text-xl font-semibold text-white mb-2 tracking-tight">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-semibold text-white mb-2 tracking-tight">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-semibold text-white mb-2">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-gray-200 leading-relaxed mb-2 break-words overflow-wrap-anywhere">{children}</p>
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
                      a: ({ children, href }) => (
                        <a href={href as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-primary pl-3 text-gray-300 bg-surface-3/40 rounded mb-3">{children}</blockquote>
                      ),
                      hr: () => <hr className="border-border-subtle my-4" />,
                      strong: ({ children }) => (
                        <strong className="font-semibold text-white break-words">{children}</strong>
                      ),
                      table: ({ children }) => (
                        <div className="my-3 overflow-x-auto rounded-lg border border-border-subtle">
                          <table className="w-full text-left text-sm text-gray-200 min-w-full">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-surface-3 text-gray-300">{children}</thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="bg-surface-3">{children}</tbody>
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
                    }}
                  >
                    {displayedExplanation}
                  </ReactMarkdown>
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
                  )}
                </div>
              )}

              {activeTab === 'line' && (
                <div className="prose prose-invert prose-sm max-w-full prose-p:break-words prose-strong:break-words prose-li:break-words overflow-hidden" style={{ maxWidth: '100%', wordBreak: 'break-word' }}>
                  {!selectedLine ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">👆 Click any line in the code to explain it</p>
                    </div>
                  ) : isExplainingLine ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <Spinner size="md" />
                      <p className="text-gray-400 text-sm">Explaining line {selectedLine}...</p>
                    </div>
                  ) : lineExplanation ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-mono rounded">
                          Line {selectedLine}
                        </span>
                      </div>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          pre: ({ children, ...props }) => <CodeBlock {...props}>{children}</CodeBlock>,
                          code: ({ className, children, ...props }) => {
                            const isInline = !className;
                            if (isInline) {
                              return (
                                <code className="px-1.5 py-0.5 bg-white/10 rounded text-primary text-sm" {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return <code className={className} {...props}>{children}</code>;
                          },
                          p: ({ children }) => (
                            <p className="text-gray-200 leading-relaxed mb-2 break-words overflow-wrap-anywhere">{children}</p>
                          ),
                        }}
                      >
                        {lineExplanation}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Select a line to see its explanation</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'diagram' && (
                <div className="prose prose-invert prose-sm max-w-full overflow-hidden" style={{ maxWidth: '100%' }}>
                  {isGeneratingFlowchart ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Spinner size="md" />
                      <p className="text-gray-400 text-sm">Generating flowchart...</p>
                    </div>
                  ) : flowchartError ? (
                    <div className="text-center py-8">
                      <p className="text-red-400 mb-4">⚠️ {flowchartError}</p>
                      <button
                        onClick={() => {
                          setFlowchartError(null);
                          setActiveTab('diagram');
                        }}
                        className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : flowchart ? (
                    <div className="flex flex-col items-center">
                      <div className="text-xs text-gray-500 mb-4 uppercase tracking-wider">
                        File Logic Flow
                      </div>
                      <MermaidRenderer chart={flowchart} className="w-full" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Spinner size="md" />
                      <p className="text-gray-400 text-sm">Loading diagram...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 py-2 border-t border-border-subtle bg-surface-3">
          <span className="text-[10px] text-gray-600">
            {new Date(data.created_at).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
