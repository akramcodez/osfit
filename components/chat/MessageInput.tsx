'use client';

import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, Link, X } from 'lucide-react';
import { t, LanguageCode } from '@/lib/translations';
import { AssistantMode } from '@/types';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  language?: LanguageCode;
  mode?: AssistantMode;
  error?: string;
  onClearError?: () => void;
}

const MODE_PLACEHOLDERS: Record<AssistantMode, Record<LanguageCode, string>> = {
  mentor: {
    en: 'Ask anything about open source...',
    es: 'Pregunta cualquier cosa sobre código abierto...',
    fr: 'Posez des questions sur l\'open source...',
    de: 'Fragen Sie alles über Open Source...',
    hi: 'ओपन सोर्स के बारे में कुछ भी पूछें...',
    zh: '询问有关开源的任何问题...',
    ja: 'オープンソースについて何でも聞いてください...',
    ko: '오픈소스에 대해 무엇이든 물어보세요...',
    pt: 'Pergunte qualquer coisa sobre código abierto...',
    ru: 'Спросите что угодно об open source...',
    ar: 'اسأل أي شيء عن المصدر المفتوح...',
    bn: 'ওপেন সোর্স সম্পর্কে কিছু জিজ্ঞাসা করুন...',
  },
  issue_solver: {
    en: 'Paste a GitHub issue URL (e.g. github.com/org/repo/issues/123)',
    es: 'Pega una URL de issue de GitHub...',
    fr: 'Collez une URL d\'issue GitHub...',
    de: 'Fügen Sie eine GitHub Issue-URL ein...',
    hi: 'GitHub issue URL पेस्ट करें...',
    zh: '粘贴 GitHub issue URL...',
    ja: 'GitHub issue の URL を貼り付けてください...',
    ko: 'GitHub 이슈 URL을 붙여넣으세요...',
    pt: 'Cole uma URL de issue do GitHub...',
    ru: 'Вставьте URL issue на GitHub...',
    ar: 'الصق رابط issue على GitHub...',
    bn: 'GitHub issue URL পেস্ট করুন...',
  },
  file_explainer: {
    en: 'Paste a GitHub file URL (e.g. github.com/org/repo/blob/main/file.js)',
    es: 'Pega una URL de archivo de GitHub...',
    fr: 'Collez une URL de fichier GitHub...',
    de: 'Fügen Sie eine GitHub Datei-URL ein...',
    hi: 'GitHub file URL पेस्ट करें...',
    zh: '粘贴 GitHub 文件 URL...',
    ja: 'GitHub ファイルの URL を貼り付けてください...',
    ko: 'GitHub 파일 URL을 붙여넣으세요...',
    pt: 'Cole uma URL de arquivo do GitHub...',
    ru: 'Вставьте URL файла на GitHub...',
    ar: 'الصق رابط ملف على GitHub...',
    bn: 'GitHub ফাইল URL পেস্ট করুন...',
  },
};

const GITHUB_ISSUE_PATTERN = /github\.com\/[^\/]+\/[^\/]+\/issues\/\d+/;
const GITHUB_FILE_PATTERN = /github\.com\/[^\/]+\/[^\/]+\/blob\/.+/;

const ERROR_MESSAGES: Record<string, Record<LanguageCode, string>> = {
  issue_solver: {
    en: 'Please enter a valid GitHub issue URL (e.g. https://github.com/org/repo/issues/123)',
    es: 'Por favor ingresa una URL de issue de GitHub válida',
    fr: 'Veuillez entrer une URL d\'issue GitHub valide',
    de: 'Bitte geben Sie eine gültige GitHub Issue-URL ein',
    hi: 'कृपया एक वैध GitHub issue URL दर्ज करें',
    zh: '请输入有效的 GitHub issue URL',
    ja: '有効な GitHub issue URL を入力してください',
    ko: '유효한 GitHub 이슈 URL을 입력하세요',
    pt: 'Por favor, insira uma URL de issue do GitHub válida',
    ru: 'Пожалуйста, введите действительный URL issue на GitHub',
    ar: 'الرجاء إدخال رابط issue صالح على GitHub',
    bn: 'অনুগ্রহ করে একটি বৈধ GitHub issue URL লিখুন',
  },
  file_explainer: {
    en: 'Please enter a valid GitHub file URL (e.g. https://github.com/org/repo/blob/main/file.js)',
    es: 'Por favor ingresa una URL de archivo de GitHub válida',
    fr: 'Veuillez entrer une URL de fichier GitHub valide',
    de: 'Bitte geben Sie eine gültige GitHub Datei-URL ein',
    hi: 'कृपया एक वैध GitHub file URL दर्ज करें',
    zh: '请输入有效的 GitHub 文件 URL',
    ja: '有効な GitHub ファイル URL を入力してください',
    ko: '유효한 GitHub 파일 URL을 입력하세요',
    pt: 'Por favor, insira uma URL de arquivo do GitHub válida',
    ru: 'Пожалуйста, введите действительный URL файла на GitHub',
    ar: 'الرجاء إدخال رابط ملف صالح على GitHub',
    bn: 'অনুগ্রহ করে একটি বৈধ GitHub ফাইল URL লিখুন',
  },
};

export default function MessageInput({ onSend, disabled, language = 'en', mode = 'mentor', error, onClearError }: MessageInputProps) {
  const [input, setInput] = useState('');
  const [localError, setLocalError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const placeholder = MODE_PLACEHOLDERS[mode]?.[language] || MODE_PLACEHOLDERS.mentor[language];
  
  const isUrlMode = mode === 'issue_solver' || mode === 'file_explainer';

  const displayError = error || localError;

  const validateInput = (text: string): boolean => {
    if (mode === 'issue_solver') {
      return GITHUB_ISSUE_PATTERN.test(text);
    }
    if (mode === 'file_explainer') {
      return GITHUB_FILE_PATTERN.test(text);
    }
    return true;
  };

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (isUrlMode && !validateInput(trimmedInput)) {
      setLocalError(ERROR_MESSAGES[mode]?.[language] || ERROR_MESSAGES[mode]?.en || 'Invalid input');
      return;
    }

    setLocalError('');
    onSend(trimmedInput);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
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
    if (localError) setLocalError('');
    if (onClearError) onClearError();
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleDismissError = () => {
    setLocalError('');
    if (onClearError) onClearError();
  };

  return (
    <div className="w-full max-w-3xl relative mb-2 px-2 sm:px-0 pointer-events-auto">
      {displayError && (
        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs sm:text-sm flex items-center justify-between gap-3 animate-fade-in shadow-lg">
          <span className="flex-1">{displayError}</span>
          <button 
            onClick={handleDismissError}
            className="p-1.5 hover:bg-red-500/20 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative flex items-end w-full p-2 md:p-3 bg-secondary rounded-2xl border border-white/10 shadow-lg focus-within:border-white/20 transition-colors">
        
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white mb-1 mr-1 md:mr-2 rounded-full hidden sm:flex">
            {isUrlMode ? <Link className="h-5 w-5" /> : <Paperclip className="h-5 w-5" />}
        </Button>

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 min-h-[24px] max-h-[160px] md:max-h-[200px] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm md:text-base text-white placeholder:text-gray-400 resize-none py-2 px-2 sm:px-0"
          rows={1}
          disabled={disabled}
        />

        <div className="flex items-center gap-1 ml-1 md:ml-2 mb-0.5">
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
        <p className="text-xs text-gray-500">{t('disclaimer', language)}</p>
      </div>
    </div>
  );
}
