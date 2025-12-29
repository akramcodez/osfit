'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

let mermaidInitialized = false;

export default function MermaidRenderer({ chart, className = '' }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) {
        setError('No chart data');
        setIsLoading(false);
        return;
      }

      try {
        const style = getComputedStyle(document.documentElement);
        const getVar = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: getVar('--color-brand', '#3ECF8E'),
            primaryTextColor: '#fff',
            primaryBorderColor: getVar('--color-brand', '#3ECF8E'),
            lineColor: '#666',
            secondaryColor: getVar('--color-secondary', '#2A2A2A'),
            tertiaryColor: getVar('--color-surface-1', '#1A1A1A'),
            background: getVar('--color-surface-3', '#0A0A0A'),
            mainBkg: getVar('--color-surface-1', '#1A1A1A'),
            nodeBorder: getVar('--color-brand', '#3ECF8E'),
          },
          flowchart: {
            htmlLabels: true,
            curve: 'linear',
          },
        });

        const cleanChart = chart
          .replace(/```mermaid\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        if (!cleanChart) {
          setError('Empty chart content');
          setIsLoading(false);
          return;
        }

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const { svg: renderedSvg } = await mermaid.render(id, cleanChart);
        
        setSvg(renderedSvg);
        setError(null);
      } catch (err: unknown) {
        console.error('[MermaidRenderer] Render error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Could not render diagram: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    setSvg('');
    setError(null);
    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-400 mb-4">⚠️ {error}</p>
        <details className="text-left">
          <summary className="text-gray-500 text-xs cursor-pointer">Show raw chart</summary>
          <pre className="mt-2 text-xs bg-surface-3 p-4 rounded-lg overflow-auto max-h-40 text-gray-400">
            {chart}
          </pre>
        </details>
      </div>
    );
  }

  if (isLoading || !svg) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="h-6 w-6 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`mermaid-container overflow-auto p-4 ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
