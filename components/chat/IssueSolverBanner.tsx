'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, GitBranch, Loader2, X, Check, ExternalLink } from 'lucide-react';
import { LanguageCode } from '@/lib/translations';

const TRANSLATIONS: Record<string, Record<LanguageCode, string>> = {
  wantSolutionPlan: {
    en: 'Want a step-by-step solution plan?',
    es: '¿Quieres un plan de solución paso a paso?',
    fr: 'Voulez-vous un plan de solution étape par étape?',
    de: 'Möchten Sie einen schrittweisen Lösungsplan?',
    hi: 'क्या आप स्टेप-बाय-स्टेप सॉल्यूशन प्लान चाहते हैं?',
    zh: '想要一个逐步解决方案计划吗？',
    ja: 'ステップバイステップの解決策をご希望ですか？',
    ko: '단계별 솔루션 계획을 원하시나요?',
    pt: 'Quer um plano de solução passo a passo?',
    ru: 'Хотите пошаговый план решения?',
    ar: 'هل تريد خطة حل خطوة بخطوة؟',
    bn: 'স্টেপ-বাই-স্টেপ সমাধান পরিকল্পনা চান?',
  },
  no: {
    en: 'No',
    es: 'No',
    fr: 'Non',
    de: 'Nein',
    hi: 'नहीं',
    zh: '否',
    ja: 'いいえ',
    ko: '아니오',
    pt: 'Não',
    ru: 'Нет',
    ar: 'لا',
    bn: 'না',
  },
  generating: {
    en: 'Generating...',
    es: 'Generando...',
    fr: 'Génération...',
    de: 'Generieren...',
    hi: 'जेनरेट हो रहा है...',
    zh: '生成中...',
    ja: '生成中...',
    ko: '생성 중...',
    pt: 'Gerando...',
    ru: 'Генерация...',
    ar: 'جاري الإنشاء...',
    bn: 'জেনারেট হচ্ছে...',
  },
  yesGetPlan: {
    en: 'Yes, Get Plan',
    es: 'Sí, obtener plan',
    fr: 'Oui, obtenir le plan',
    de: 'Ja, Plan erhalten',
    hi: 'हाँ, प्लान लें',
    zh: '是的，获取计划',
    ja: 'はい、計画を取得',
    ko: '예, 계획 받기',
    pt: 'Sim, obter plano',
    ru: 'Да, получить план',
    ar: 'نعم، احصل على الخطة',
    bn: 'হ্যাঁ, প্ল্যান নিন',
  },
  pasteGitDiff: {
    en: 'Paste your git diff to generate PR',
    es: 'Pega tu git diff para generar PR',
    fr: 'Collez votre git diff pour générer PR',
    de: 'Fügen Sie Ihr Git Diff ein, um PR zu generieren',
    hi: 'PR जेनरेट करने के लिए अपना git diff पेस्ट करें',
    zh: '粘贴您的 git diff 以生成 PR',
    ja: 'PRを生成するためにgit diffを貼り付けてください',
    ko: 'PR을 생성하려면 git diff를 붙여넣으세요',
    pt: 'Cole seu git diff para gerar PR',
    ru: 'Вставьте git diff для создания PR',
    ar: 'الصق git diff لإنشاء PR',
    bn: 'PR জেনারেট করতে আপনার git diff পেস্ট করুন',
  },
  skipPR: {
    en: 'Skip PR',
    es: 'Omitir PR',
    fr: 'Passer PR',
    de: 'PR überspringen',
    hi: 'PR छोड़ें',
    zh: '跳过 PR',
    ja: 'PRをスキップ',
    ko: 'PR 건너뛰기',
    pt: 'Pular PR',
    ru: 'Пропустить PR',
    ar: 'تخطي PR',
    bn: 'PR স্কিপ করুন',
  },
  generatingPR: {
    en: 'Generating PR...',
    es: 'Generando PR...',
    fr: 'Génération PR...',
    de: 'PR generieren...',
    hi: 'PR जेनरेट हो रहा है...',
    zh: '正在生成 PR...',
    ja: 'PR を生成中...',
    ko: 'PR 생성 중...',
    pt: 'Gerando PR...',
    ru: 'Создание PR...',
    ar: 'جاري إنشاء PR...',
    bn: 'PR জেনারেট হচ্ছে...',
  },
  generatePR: {
    en: 'Generate PR',
    es: 'Generar PR',
    fr: 'Générer PR',
    de: 'PR generieren',
    hi: 'PR जेनरेट करें',
    zh: '生成 PR',
    ja: 'PR を生成',
    ko: 'PR 생성',
    pt: 'Gerar PR',
    ru: 'Создать PR',
    ar: 'إنشاء PR',
    bn: 'PR জেনারেট করুন',
  },
};

interface IssueSolverBannerProps {
  currentStep: string;
  isLoading?: boolean;
  issueTitle?: string;
  issueUrl?: string;
  language?: LanguageCode;
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
  language = 'en',
  onYes,
  onNo,
  onSubmitGitDiff,
  onDiscard
}: IssueSolverBannerProps) {
  const [gitDiff, setGitDiff] = useState('');

  const t = (key: string) => TRANSLATIONS[key]?.[language] || TRANSLATIONS[key]?.en || key;

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
      {currentStep === 'solution_step' && (
        <div className="bg-secondary border border-primary/30 rounded-2xl p-4">
          {issueUrl && (
            <a 
              href={issueUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 hover:text-primary mb-3 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="truncate">{issueTitle}</span>
            </a>
          )}
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-white text-xs sm:text-sm leading-relaxed">
              {t('wantSolutionPlan')}
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onNo}
                disabled={isLoading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-transparent border border-gray-600 hover:border-gray-500 text-gray-300 text-xs sm:text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                {t('no')}
              </button>
              <button
                onClick={onYes}
                disabled={isLoading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-primary hover:bg-primary/80 text-black text-xs sm:text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('generating')}
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {t('yesGetPlan')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'pr_context' && (
        <div className="bg-secondary border border-primary/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              <span className="text-white text-xs sm:text-sm">
                {t('pasteGitDiff')} <code className="px-1.5 py-0.5 bg-black/30 rounded text-primary text-xs">git diff</code>
              </span>
            </div>
            <button
              onClick={onDiscard}
              disabled={isLoading}
              className="text-gray-400 hover:text-white text-xs transition-colors"
            >
              {t('skipPR')}
            </button>
          </div>
          
          <textarea
            value={gitDiff}
            onChange={(e) => setGitDiff(e.target.value)}
            placeholder="$ git diff
diff --git a/src/file.ts b/src/file.ts
..."
            className="w-full h-28 bg-black/30 border border-gray-700 rounded-xl p-3 text-gray-200 text-xs sm:text-sm font-mono placeholder:text-gray-600 focus:outline-none focus:border-primary/50 resize-none"
          />
          
          <div className="flex justify-end">
            <button
              onClick={handleSubmitDiff}
              disabled={isLoading || !gitDiff.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/80 text-black text-xs sm:text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('generatingPR')}
                </>
              ) : (
                <>
                  {t('generatePR')}
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
