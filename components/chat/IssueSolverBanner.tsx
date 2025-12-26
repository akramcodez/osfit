'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, GitBranch, Loader2, X, Check, ExternalLink } from 'lucide-react';

interface IssueSolverBannerProps {
  currentStep: string;
  isLoading?: boolean;
  issueTitle?: string;
  issueUrl?: string;
  onYes: () => void;
  onNo: () => void;
  onSubmitGitDiff: (diff: string) => void;
  onDiscard: () => void;
}

export default function IssueSolverBanner({
  currentStep,
  isLoading = false,
  issueTitle = 'GitHub Issue',
  issueUrl,
  onYes,
  onNo,
  onSubmitGitDiff,
  onDiscard
}: IssueSolverBannerProps) {
  const [gitDiff, setGitDiff] = useState('');

  // Only show banner for specific steps
  if (currentStep !== 'solution_step' && currentStep !== 'pr_context') {
    return null;
  }

  const handleSubmitDiff = () => {
    if (gitDiff.trim()) {
      onSubmitGitDiff(gitDiff.trim());
      setGitDiff('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full"
    >
      {/* Solution Step: Yes/No prompt */}
      {currentStep === 'solution_step' && (
        <div className="bg-[#2A2A2A] border border-[#3ECF8E]/30 rounded-2xl p-4">
          {/* Issue reference */}
          {issueUrl && (
            <a 
              href={issueUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#3ECF8E] mb-3 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="truncate">{issueTitle}</span>
            </a>
          )}
          
          <div className="flex items-center justify-between gap-4">
            <span className="text-white text-sm">
              Want a step-by-step solution plan?
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onNo}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-gray-600 hover:border-gray-500 text-gray-300 text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                No
              </button>
              <button
                onClick={onYes}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3ECF8E] hover:bg-[#3ECF8E]/80 text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Yes, Get Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PR Context Step: Git diff input */}
      {currentStep === 'pr_context' && (
        <div className="bg-[#2A2A2A] border border-[#3ECF8E]/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-[#3ECF8E]" />
              <span className="text-white text-sm">
                Paste your <code className="px-1.5 py-0.5 bg-black/30 rounded text-[#3ECF8E] text-xs">git diff</code> to generate PR
              </span>
            </div>
            <button
              onClick={onDiscard}
              disabled={isLoading}
              className="text-gray-400 hover:text-white text-xs transition-colors"
            >
              Skip PR
            </button>
          </div>
          
          <textarea
            value={gitDiff}
            onChange={(e) => setGitDiff(e.target.value)}
            placeholder="$ git diff
diff --git a/src/file.ts b/src/file.ts
..."
            className="w-full h-28 bg-black/30 border border-gray-700 rounded-xl p-3 text-gray-200 text-sm font-mono placeholder:text-gray-600 focus:outline-none focus:border-[#3ECF8E]/50 resize-none"
          />
          
          <div className="flex justify-end">
            <button
              onClick={handleSubmitDiff}
              disabled={isLoading || !gitDiff.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#3ECF8E] hover:bg-[#3ECF8E]/80 text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating PR...
                </>
              ) : (
                <>
                  Generate PR
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
