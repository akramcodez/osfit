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

interface FileExplainerCardProps {
  data: FileExplanation;
  isNew?: boolean;
  onStreamComplete?: () => void;
  onDelete?: (id: string) => void;
}

// Language display names
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

// Demo code for testing when no file content is available
const DEMO_CODE = `// Example: API Client Module
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

interface ClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export function createClient(config: ClientConfig): AxiosInstance {
  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout || 10000,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = \`Bearer \${token}\`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => response.data,
    (error) => {
      if (error.response?.status === 401) {
        // Handle unauthorized
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

export async function get<T>(url: string, params?: object): Promise<T> {
  const client = createClient({ baseURL: '/api' });
  return client.get(url, { params });
}

export async function post<T>(url: string, data?: object): Promise<T> {
  const client = createClient({ baseURL: '/api' });
  return client.post(url, data);
}`;

export default function FileExplainerCard({ data, isNew = false, onStreamComplete, onDelete }: FileExplainerCardProps) {
  const [isCodeExpanded, setIsCodeExpanded] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [displayedLength, setDisplayedLength] = useState(isNew ? 0 : (data.explanation?.length || 0));
  const [isStreaming, setIsStreaming] = useState(isNew && !!data.explanation);
  const streamRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef<boolean>(false);

  // Line explanation state
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [lineExplanation, setLineExplanation] = useState<string>('');
  const [isExplainingLine, setIsExplainingLine] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'line' | 'diagram'>('overview');

  // Diagram/Flowchart state
  const [flowchart, setFlowchart] = useState<string | null>(null);
  const [isGeneratingFlowchart, setIsGeneratingFlowchart] = useState(false);
  const [flowchartError, setFlowchartError] = useState<string | null>(null);

  const explanation = data.explanation || '';
  // Use demo code if no file content is available
  const fileContent = data.file_content || DEMO_CODE;
  const fileName = data.file_path || data.file_url?.split('/').pop() || 'api-client.ts';
  const language = data.language || fileName.split('.').pop() || 'ts';
  const languageDisplay = LANGUAGE_NAMES[language.toLowerCase()] || language.toUpperCase();

  // Streaming effect for explanation
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

  // Handle line click - fetch explanation for specific line
  const handleLineClick = async (lineNumber: number, lineContent: string) => {
    setSelectedLine(lineNumber);
    setActiveTab('line');
    setIsExplainingLine(true);
    setLineExplanation('');

    try {
      const response = await fetch('/api/explain-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineNumber,
          lineContent,
          fullFileContent: fileContent,
          language,
          filePath: fileName,
          useMockData: true // Enable for testing
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

  // If this is a user entry (just the URL), show a simple card
  if (data.role === 'user') {
    return (
      <div className="flex justify-end mb-4 animate-message-in">
        <div className="bg-primary/10 text-white px-4 py-2 rounded-xl max-w-[80%]">
          <div className="flex items-center gap-2 text-sm">
            <FileCode className="h-4 w-4 text-[#3ECF8E]" />
            <span className="truncate">{data.file_url || data.explanation}</span>
          </div>
        </div>
      </div>
    );
  }

  // Assistant response - full file explainer card with split view
  return (
    <div className="w-full mb-6 animate-message-in">
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#141414] border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#3ECF8E]/10 flex items-center justify-center">
              <FileCode className="h-4 w-4 text-[#3ECF8E]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">{fileName}</h3>
              <p className="text-xs text-gray-500">{languageDisplay}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.file_url && (
              <button
                onClick={openInGitHub}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Open in GitHub"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
            {/* Collapse entire card */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              {isCollapsed ? (
                <>
                  <ChevronsDown className="h-3 w-3" />
                  <span>Expand</span>
                </>
              ) : (
                <>
                  <ChevronsUp className="h-3 w-3" />
                  <span>Collapse</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsCodeExpanded(!isCodeExpanded)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              {isCodeExpanded ? (
                <>
                  <ChevronLeft className="h-3 w-3" />
                  <span>Hide Code</span>
                </>
              ) : (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span>Show Code</span>
                </>
              )}
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(data.id)}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete explanation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible content with smooth animation */}
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
              <div className="flex">
          <motion.div
            initial={false}
            animate={{
              flexBasis: isCodeExpanded ? '50%' : 0,
              opacity: isCodeExpanded ? 1 : 0,
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-[#0d0d0d] border-r border-[#2a2a2a]"
            style={{ overflow: 'hidden' }}
          >
            {/* Interactive Code Viewer */}
            <div className="p-2">
              <InteractiveCodeViewer
                code={fileContent}
                language={language}
                selectedLine={selectedLine}
                onLineClick={handleLineClick}
                isLoading={isExplainingLine}
              />
            </div>
          </motion.div>

          {/* Right: Explanation */}
          <motion.div
            initial={false}
            animate={{ flexBasis: isCodeExpanded ? '50%' : '100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-[#1a1a1a]"
            style={{ overflow: 'hidden' }}
          >
            {/* Explanation Header with Tabs */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-[#3ECF8E] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-black">OS</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded transition-colors ${
                      activeTab === 'overview'
                        ? 'bg-[#3ECF8E]/20 text-[#3ECF8E]'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('line')}
                    className={`px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded transition-colors ${
                      activeTab === 'line'
                        ? 'bg-[#3ECF8E]/20 text-[#3ECF8E]'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Line {selectedLine || '—'}
                  </button>
                  <button
                    onClick={async () => {
                      setActiveTab('diagram');
                      // Lazy load flowchart if not already loaded
                      if (!flowchart && !isGeneratingFlowchart && !flowchartError) {
                        setIsGeneratingFlowchart(true);
                        setFlowchartError(null);
                        try {
                          const response = await fetch('/api/generate-flowchart', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              fileContent,
                              language,
                              filePath: fileName,
                              explanationId: data.id,
                              useMockData: true // Enable for testing
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
                    className={`px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded transition-colors ${
                      activeTab === 'diagram'
                        ? 'bg-[#3ECF8E]/20 text-[#3ECF8E]'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Diagram
                  </button>
                </div>
              </div>
            </div>
            {/* Explanation Content */}
            <div className="p-4 overflow-auto max-h-[500px] app-scroll">
              {/* Overview Tab Content */}
              {activeTab === 'overview' && (
                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      pre: ({ children, ...props }) => <CodeBlock {...props}>{children}</CodeBlock>,
                      code: ({ className, children, ...props }) => {
                        const isInline = !className;
                        if (isInline) {
                          return (
                            <code className="px-1.5 py-0.5 bg-white/10 rounded text-[#3ECF8E] text-sm" {...props}>
                              {children}
                            </code>
                          );
                        }
                        return <code className={className} {...props}>{children}</code>;
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
                        <p className="text-gray-200 leading-relaxed mb-2">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-outside ml-6 space-y-1 mb-3">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-outside ml-6 space-y-1 mb-3">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-gray-200">{children}</li>
                      ),
                      a: ({ children, href }) => (
                        <a href={href as string} target="_blank" rel="noopener noreferrer" className="text-[#3ECF8E] hover:underline">{children}</a>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-[#3ECF8E] pl-3 text-gray-300 bg-[#0d0d0d]/40 rounded mb-3">{children}</blockquote>
                      ),
                      hr: () => <hr className="border-[#2a2a2a] my-4" />,
                      strong: ({ children }) => (
                        <strong className="font-semibold text-white">{children}</strong>
                      ),
                      table: ({ children }) => (
                        <div className="my-3 overflow-hidden rounded-lg border border-[#2a2a2a]">
                          <table className="w-full text-left text-sm text-gray-200">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-[#0d0d0d] text-gray-300">{children}</thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="bg-[#111111]">{children}</tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="border-t border-[#2a2a2a]">{children}</tr>
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
                    <span className="inline-block w-2 h-4 bg-[#3ECF8E] ml-1 animate-pulse" />
                  )}
                </div>
              )}

              {/* Line Tab Content */}
              {activeTab === 'line' && (
                <div className="prose prose-invert prose-sm max-w-none">
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
                        <span className="px-2 py-1 bg-[#3ECF8E]/20 text-[#3ECF8E] text-xs font-mono rounded">
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
                                <code className="px-1.5 py-0.5 bg-white/10 rounded text-[#3ECF8E] text-sm" {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return <code className={className} {...props}>{children}</code>;
                          },
                          p: ({ children }) => (
                            <p className="text-gray-200 leading-relaxed mb-2">{children}</p>
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

              {/* Diagram Tab Content */}
              {activeTab === 'diagram' && (
                <div className="prose prose-invert prose-sm max-w-none">
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
                          setActiveTab('diagram'); // Re-trigger generation
                        }}
                        className="px-4 py-2 bg-[#3ECF8E]/20 text-[#3ECF8E] rounded-lg text-sm hover:bg-[#3ECF8E]/30 transition-colors"
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
          </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer with timestamp */}
        <div className="px-4 py-2 border-t border-[#2a2a2a] bg-[#0d0d0d]">
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
