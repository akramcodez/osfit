'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Message, AssistantMode, FileExplanation } from '@/types';
import { LanguageCode, t } from '@/lib/translations';
import MessageList from './MessageList';
import FileExplainerList from './FileExplainerList';
import IssueSolverBanner from './IssueSolverBanner';
import MessageInput from './MessageInput';
import { MessageSquarePlus, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ModeSelector from './ModeSelector';
import LanguageSelector from './LanguageSelector';
import Sidebar from './Sidebar';
import ErrorToast from '@/components/ErrorToast';
import AuthDialog from '@/components/auth/AuthDialog';
import UserSettings from '@/components/user/UserSettings';
import { supabase, onAuthStateChange, getUsername, getSession } from '@/lib/supabase-auth';
import { User } from '@supabase/supabase-js';

const SERVICE_NAMES: Record<string, Record<string, string>> = {
  gemini: {
    en: 'Gemini AI', es: 'Gemini AI', fr: 'Gemini AI', de: 'Gemini AI',
    hi: 'Gemini AI', zh: 'Gemini AI', ja: 'Gemini AI', ko: 'Gemini AI',
    pt: 'Gemini AI', ru: 'Gemini AI', ar: 'Gemini AI', bn: 'Gemini AI'
  },
  groq: {
    en: 'Groq AI', es: 'Groq AI', fr: 'Groq AI', de: 'Groq AI',
    hi: 'Groq AI', zh: 'Groq AI', ja: 'Groq AI', ko: 'Groq AI',
    pt: 'Groq AI', ru: 'Groq AI', ar: 'Groq AI', bn: 'Groq AI'
  },
  apify: {
    en: 'Apify', es: 'Apify', fr: 'Apify', de: 'Apify',
    hi: 'Apify', zh: 'Apify', ja: 'Apify', ko: 'Apify',
    pt: 'Apify', ru: 'Apify', ar: 'Apify', bn: 'Apify'
  },
  lingo: {
    en: 'Lingo (Translation)', es: 'Lingo (Traducción)', fr: 'Lingo (Traduction)', de: 'Lingo (Übersetzung)',
    hi: 'Lingo (अनुवाद)', zh: 'Lingo (翻译)', ja: 'Lingo (翻訳)', ko: 'Lingo (번역)',
    pt: 'Lingo (Tradução)', ru: 'Lingo (Перевод)', ar: 'Lingo (ترجمة)', bn: 'Lingo (অনুবাদ)'
  }
};

interface ApiErrorResponse {
  error: string;
  errorType?: 'api_key_error';
  service?: 'gemini' | 'apify' | 'lingo';
  source?: 'user' | 'system';
}

function parseApiErrorResponse(response: ApiErrorResponse, language: string = 'en'): string {
  if (response.errorType === 'api_key_error' && response.service && response.source) {
    const serviceName = SERVICE_NAMES[response.service]?.[language] || response.service;
    
    if (response.source === 'system') {
      const messages: Record<string, string> = {
        en: `App free credits for ${serviceName} are exhausted. Please add your own API key in Settings.`,
        es: `Los créditos gratuitos de ${serviceName} se agotaron. Por favor agregue su propia clave API en Configuración.`,
        fr: `Les crédits gratuits pour ${serviceName} sont épuisés. Veuillez ajouter votre propre clé API dans les paramètres.`,
        de: `Die kostenlosen Credits für ${serviceName} sind aufgebraucht. Bitte fügen Sie Ihren eigenen API-Schlüssel in den Einstellungen hinzu.`,
        hi: `${serviceName} के ऐप मुफ्त क्रेडिट समाप्त हो गए। कृपया सेटिंग्स में अपनी API कुंजी जोड़ें।`,
        zh: `${serviceName} 的免费额度已用尽。请在设置中添加您自己的 API 密钥。`,
        ja: `${serviceName} の無料クレジットが使い切りました。設定で独自の API キーを追加してください。`,
        ko: `${serviceName} 앱 무료 크레딧이 소진되었습니다. 설정에서 자신의 API 키를 추가하세요.`,
        pt: `Os créditos gratuitos do ${serviceName} estão esgotados. Adicione sua própria chave API nas Configurações.`,
        ru: `Бесплатные кредиты ${serviceName} исчерпаны. Добавьте свой API-ключ в настройках.`,
        ar: `نفدت أرصدة ${serviceName} المجانية. يرجى إضافة مفتاح API الخاص بك في الإعدادات.`,
        bn: `${serviceName} এর বিনামূল্যে ক্রেডিট শেষ। সেটিংসে আপনার নিজের API কী যোগ করুন।`,
      };
      return messages[language] || messages.en;
    } else {
      const messages: Record<string, string> = {
        en: `Your ${serviceName} API key credits are exhausted. Please check your key or billing.`,
        es: `Los créditos de su clave API de ${serviceName} se agotaron. Revise su clave o facturación.`,
        fr: `Les crédits de votre clé API ${serviceName} sont épuisés. Vérifiez votre clé ou facturation.`,
        de: `Ihre ${serviceName} API-Schlüssel-Credits sind aufgebraucht. Überprüfen Sie Ihren Schlüssel oder die Abrechnung.`,
        hi: `आपकी ${serviceName} API कुंजी क्रेडिट समाप्त हो गई। कृपया अपनी कुंजी या बिलिंग जांचें।`,
        zh: `您的 ${serviceName} API 密钥额度已用尽。请检查您的密钥或账单。`,
        ja: `${serviceName} API キーのクレジットが使い切りました。キーまたは請求を確認してください。`,
        ko: `${serviceName} API 키 크레딧이 소진되었습니다. 키 또는 청구를 확인하세요.`,
        pt: `Os créditos da sua chave API ${serviceName} estão esgotados. Verifique sua chave ou cobrança.`,
        ru: `Кредиты вашего API-ключа ${serviceName} исчерпаны. Проверьте ключ или биллинг.`,
        ar: `نفدت أرصدة مفتاح API ${serviceName} الخاص بك. يرجى التحقق من المفتاح أو الفواتير.`,
        bn: `আপনার ${serviceName} API কী ক্রেডিট শেষ। আপনার কী বা বিলিং পরীক্ষা করুন।`,
      };
      return messages[language] || messages.en;
    }
  }
  
  return parseSimpleError(response.error, language);
}

function parseSimpleError(error: string, language: string = 'en'): string {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('quota') || errorLower.includes('rate limit') || errorLower.includes('429') || errorLower.includes('too many requests')) {
    const messages: Record<string, string> = {
      en: 'API quota exceeded. Please check your API key billing or try again later.',
      es: 'Cuota de API excedida. Revise la facturación de su clave API o intente más tarde.',
      fr: 'Quota API dépassé. Vérifiez la facturation de votre clé API ou réessayez plus tard.',
      de: 'API-Kontingent überschritten. Überprüfen Sie die Abrechnung Ihres API-Schlüssels.',
      hi: 'API कोटा समाप्त। कृपया अपनी API कुंजी बिलिंग जांचें।',
      zh: 'API 配额已超出。请检查您的 API 密钥计费或稍后重试。',
      ja: 'API クォータを超過しました。API キーの請求を確認してください。',
      ko: 'API 할당량 초과. API 키 청구를 확인하세요.',
      pt: 'Cota de API excedida. Verifique a cobrança da sua chave API.',
      ru: 'Превышена квота API. Проверьте биллинг вашего API-ключа.',
      ar: 'تم تجاوز حصة API. يرجى التحقق من فواتير مفتاح API.',
      bn: 'API কোটা শেষ। আপনার API কী বিলিং পরীক্ষা করুন।',
    };
    return messages[language] || messages.en;
  }
  
  if (errorLower.includes('invalid') && errorLower.includes('key') || errorLower.includes('401') || errorLower.includes('unauthorized')) {
    const messages: Record<string, string> = {
      en: 'Invalid API key. Please check your API key in Settings.',
      es: 'Clave API inválida. Revise su clave API en Configuración.',
      fr: 'Clé API invalide. Vérifiez votre clé API dans les paramètres.',
      de: 'Ungültiger API-Schlüssel. Überprüfen Sie Ihren Schlüssel in Einstellungen.',
      hi: 'अमान्य API कुंजी। कृपया सेटिंग्स में अपनी API कुंजी जांचें।',
      zh: '无效的 API 密钥。请在设置中检查您的 API 密钥。',
      ja: '無効な API キー。設定で API キーを確認してください。',
      ko: '유효하지 않은 API 키. 설정에서 API 키를 확인하세요.',
      pt: 'Chave API inválida. Verifique sua chave API nas Configurações.',
      ru: 'Неверный API-ключ. Проверьте ключ в настройках.',
      ar: 'مفتاح API غير صالح. تحقق من المفتاح في الإعدادات.',
      bn: 'অবৈধ API কী। সেটিংসে আপনার API কী পরীক্ষা করুন।',
    };
    return messages[language] || messages.en;
  }
  
  if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('connection')) {
    const messages: Record<string, string> = {
      en: 'Network error. Please check your connection and try again.',
      es: 'Error de red. Compruebe su conexión e intente de nuevo.',
      fr: 'Erreur réseau. Vérifiez votre connexion et réessayez.',
      de: 'Netzwerkfehler. Überprüfen Sie Ihre Verbindung.',
      hi: 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।',
      zh: '网络错误。请检查您的连接并重试。',
      ja: 'ネットワークエラー。接続を確認してください。',
      ko: '네트워크 오류. 연결을 확인하세요.',
      pt: 'Erro de rede. Verifique sua conexão.',
      ru: 'Ошибка сети. Проверьте подключение.',
      ar: 'خطأ في الشبكة. تحقق من اتصالك.',
      bn: 'নেটওয়ার্ক ত্রুটি। আপনার সংযোগ পরীক্ষা করুন।',
    };
    return messages[language] || messages.en;
  }
  
  if (error.length > 100) {
    return error.substring(0, 100) + '...';
  }
  return error;
}

function parseAnyError(data: { error?: string; errorType?: string; service?: string; source?: string } | string, language: string = 'en'): string {
  if (typeof data === 'string') {
    return parseSimpleError(data, language);
  }
  if (data.errorType || data.service) {
    return parseApiErrorResponse(data as ApiErrorResponse, language);
  }
  if (data.error) {
    return parseSimpleError(data.error, language);
  }
  return 'An unexpected error occurred. Please try again.';
}

export default function ChatInterface() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const [showUserSettings, setShowUserSettings] = useState(false);
  
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileExplanations, setFileExplanations] = useState<FileExplanation[]>([]);
  const [currentMode, setCurrentMode] = useState<AssistantMode>('mentor');
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('osfit-language') || 'en';
    }
    return 'en';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const [sessionError, setSessionError] = useState<string>('');
  const [apifyWarning, setApifyWarning] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [refreshSidebarTrigger, setRefreshSidebarTrigger] = useState(0);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  
  const [issueSolverStep, setIssueSolverStep] = useState<string>('issue_input');
  const [issueSolverData, setIssueSolverData] = useState<Record<string, unknown>>({});
  const [currentIssueId, setCurrentIssueId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('osfit-language', currentLanguage);
      
      if (user) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.access_token) {
            fetch('/api/user/keys', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ preferred_language: currentLanguage })
            }).catch(err => console.warn('Failed to save language to DB:', err));
          }
        });
      }
    }
  }, [currentLanguage, user]);

  useEffect(() => {
    const checkAuth = async () => {
      const { session } = await getSession();
      setUser(session?.user || null);
      setIsAuthLoading(false);
      
      if (session?.user && session?.access_token) {
        try {
          const res = await fetch('/api/user/keys', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          const data = await res.json();
          if (data.preferred_language && data.preferred_language !== 'en') {
            setCurrentLanguage(data.preferred_language);
            localStorage.setItem('osfit-language', data.preferred_language);
          }
        } catch (err) {
          console.warn('Failed to load language from DB:', err);
        }
      }
    };
    checkAuth();

    const { data: { subscription } } = onAuthStateChange(async (authUser) => {
      setUser(authUser);
      if (authUser) {
        setRefreshSidebarTrigger(prev => prev + 1);
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch('/api/user/keys', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (data.preferred_language) {
              setCurrentLanguage(data.preferred_language);
              localStorage.setItem('osfit-language', data.preferred_language);
            }
          }
        } catch (err) {
          console.warn('Failed to load language from DB on login:', err);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initSession = async (firstMessage: string, mode: AssistantMode): Promise<string | null> => {
    if (!user) return null;
    
    let title = '';
    if (mode === 'file_explainer') {
      const fileMatch = firstMessage.match(/github\.com\/[^\/]+\/[^\/]+\/blob\/[^\/]+\/(.+)/);
      if (fileMatch) {
        const fileName = fileMatch[1].split('/').pop() || 'unknown';
        title = `file: ${fileName}`;
      } else {
        title = 'file: explanation';
      }
    } else if (mode === 'issue_solver') {
      const words = firstMessage.trim().split(/\s+/).slice(0, 3).join(' ');
      title = `issue: ${words}${firstMessage.split(/\s+/).length > 3 ? '...' : ''}`;
    } else {
      const words = firstMessage.trim().split(/\s+/).slice(0, 4).join(' ');
      title = `chat: ${words}${firstMessage.split(/\s+/).length > 4 ? '...' : ''}`;
    }
    if (title.length > 40) title = title.substring(0, 37) + '...';
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/session', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ mode, title })
      });
      const { session: newSession, error } = await response.json();
      
      if (error) {
        console.error('Session create error:', error);
        setSessionError('Failed to start session. Please refresh the page.');
        return null;
      }
      
      setSessionId(newSession.id);
      setRefreshSidebarTrigger(prev => prev + 1);
      return newSession.id;
    } catch (err) {
      console.error('Failed to initialize session:', err);
      setSessionError('Failed to start session. Please refresh the page.');
      return null;
    }
  };

  const loadSession = async (existingSessionId: string) => {
    setSessionId(existingSessionId);
    setMessages([]);
    setFileExplanations([]);
    setShowUserSettings(false);
    await loadMessages(existingSessionId, currentMode);
  };

  const loadMessages = async (id: string, mode: AssistantMode = 'mentor') => {
    try {
      setIsSessionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/chat?session_id=${id}&mode=${mode}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const { messages: existingMessages } = await response.json();
      
      if (mode === 'file_explainer') {
        setFileExplanations(existingMessages || []);
      } else {
        setMessages(existingMessages || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!user) {
      setPendingMessage(content);
      setShowAuthDialog(true);
      return;
    }

    let activeSessionId: string | null = sessionId;
    
    if (!activeSessionId) {
      activeSessionId = await initSession(content, currentMode);
      if (!activeSessionId) {
        setApiError('Failed to create session. Please try again.');
        return;
      }
    }
    
    if (currentMode === 'mentor') {
      await handleMentorMessage(content, activeSessionId);
    } else if (currentMode === 'file_explainer') {
      await handleFileExplainerMessage(content, activeSessionId);
    } else if (currentMode === 'issue_solver') {
      await handleIssueSolverMessage(content, activeSessionId);
    }
  };

  const handleMentorMessage = async (content: string, activeSessionId: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      session_id: activeSessionId,
      role: 'user',
      content,
      metadata: {},
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setApiError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = { 'Authorization': `Bearer ${session?.access_token}` };
      
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          session_id: activeSessionId,
          role: 'user',
          content,
          mode: 'mentor'
        })
      });
      
      if (!chatRes.ok) {
        console.error('Failed to save user message:', await chatRes.text());
      }
      
      setRefreshSidebarTrigger(prev => prev + 1);

      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          message: content,
          mode: currentMode,
          language: currentLanguage,
          conversationHistory: messages.slice(-5),
          sessionId: activeSessionId
        })
      });

      const responseData = await processResponse.json();
      
      if (responseData.error) {
        setApiError(parseApiErrorResponse(responseData, currentLanguage));
        return;
      }

      // Show apify warning if present
      if (responseData.apifyWarning?.show) {
        setApifyWarning(t('apifyWarning', currentLanguage as LanguageCode));
      }

      const aiResponse = responseData.response;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        session_id: activeSessionId,
        role: 'assistant',
        content: aiResponse,
        metadata: { language: currentLanguage },
        created_at: new Date().toISOString()
      };

      setStreamingMessageId(assistantMessage.id);
      setMessages(prev => [...prev, assistantMessage]);
      
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          session_id: activeSessionId,
          role: 'assistant',
          content: aiResponse,
          mode: 'mentor',
          metadata: { language: currentLanguage }
        })
      });
      
      setRefreshSidebarTrigger(prev => prev + 1);
    } catch (err: unknown) {
      console.error('Error processing:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error processing request';
      setApiError(parseSimpleError(errorMessage, currentLanguage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileExplainerMessage = async (content: string, activeSessionId: string) => {
    const trimmedContent = content.trim();
    const isGitHubUrl = trimmedContent.includes('github.com');
    const isFileUrl = trimmedContent.includes('/blob/');
    const isFolderUrl = trimmedContent.includes('/tree/');
    
    if (!isGitHubUrl) {
      setApiError('Please enter a valid GitHub file URL (e.g., github.com/owner/repo/blob/main/file.js)');
      return;
    }
    
    if (isFolderUrl) {
      setApiError('Folder URLs are not supported. Please enter a file URL (use /blob/ not /tree/)');
      return;
    }
    
    if (!isFileUrl) {
      setApiError('Invalid URL format. File URLs should contain /blob/ in the path');
      return;
    }

    const tempUserEntry: FileExplanation = {
      id: 'temp-' + Date.now().toString(),
      session_id: activeSessionId,
      role: 'user',
      file_url: trimmedContent.match(/https?:\/\/github\.com[^\s]*/)?.[0] || trimmedContent,
      explanation: content,
      metadata: {},
      created_at: new Date().toISOString()
    };
    
    setFileExplanations(prev => [...prev, tempUserEntry]);
    setIsLoading(true);
    setApiError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = { 'Authorization': `Bearer ${session?.access_token}` };

      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          message: content,
          mode: currentMode,
          language: currentLanguage,
          conversationHistory: fileExplanations.slice(-5).map(fe => ({ 
            role: fe.role, 
            content: fe.explanation 
          })),
          sessionId: activeSessionId
        })
      });

      const responseData = await processResponse.json();
      
      if (responseData.error) {
        setApiError(parseApiErrorResponse(responseData, currentLanguage));
        setFileExplanations(prev => prev.filter(fe => fe.id !== tempUserEntry.id));
        return;
      }

      // Show apify warning if present
      if (responseData.apifyWarning?.show) {
        setApifyWarning(t('apifyWarning', currentLanguage as LanguageCode));
      }

      const aiResponse = responseData.response;
      const fileInfo = responseData.fileInfo || {};

      const assistantEntry: FileExplanation = {
        id: Date.now().toString(),
        session_id: activeSessionId,
        role: 'assistant',
        file_url: tempUserEntry.file_url,
        file_path: fileInfo.path,
        file_content: fileInfo.content,
        language: fileInfo.language,
        explanation: aiResponse,
        metadata: { language: currentLanguage },
        created_at: new Date().toISOString()
      };

      setStreamingMessageId(assistantEntry.id);
      setFileExplanations(prev => prev.filter(fe => fe.id !== tempUserEntry.id).concat(assistantEntry));
      
      const saveResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          session_id: activeSessionId,
          role: 'assistant',
          file_url: tempUserEntry.file_url,
          file_path: fileInfo.path,
          file_content: fileInfo.content,
          language: fileInfo.language,
          explanation: aiResponse,
          mode: 'file_explainer',
          metadata: { language: currentLanguage }
        })
      });
      
      const { message: savedEntry } = await saveResponse.json();
      
      if (savedEntry?.id) {
        setFileExplanations(prev => 
          prev.map(fe => fe.id === assistantEntry.id ? { ...fe, id: savedEntry.id } : fe)
        );
      }
      
      setRefreshSidebarTrigger(prev => prev + 1);
    } catch (err: unknown) {
      console.error('Error processing:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error processing request';
      setApiError(parseSimpleError(errorMessage, currentLanguage));
      setFileExplanations(prev => prev.filter(fe => !fe.id.startsWith('temp-')));
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueSolverMessage = async (content: string, activeSessionId: string) => {
    const issueUrlMatch = content.match(/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+/);
    
    if (!issueUrlMatch) {
      const guideMessage: Message = {
        id: Date.now().toString(),
        session_id: activeSessionId,
        role: 'assistant',
        content: `Please paste a GitHub issue URL to get started!\n\n**Example:** https://github.com/owner/repo/issues/123`,
        metadata: {},
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, guideMessage]);
      return;
    }

    let issueUrl = issueUrlMatch[0];
    if (!issueUrl.startsWith('http')) {
      issueUrl = 'https://' + issueUrl;
    }

    setIsLoading(true);
    setApiError('');

    const userMessage: Message = {
      id: Date.now().toString(),
      session_id: activeSessionId,
      role: 'user',
      content: issueUrl,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = { 'Authorization': `Bearer ${session?.access_token}` };

      const response = await fetch('/api/issue-solver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          session_id: activeSessionId,
          issue_url: issueUrl,
          language: currentLanguage
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setApiError(parseAnyError(data, currentLanguage));
        return;
      }

      // Show apify warning if present
      if (data.apifyWarning?.show) {
        setApifyWarning(t('apifyWarning', currentLanguage as LanguageCode));
      }

      const issue = data.issue;
      setCurrentIssueId(issue.id);
      setIssueSolverStep(issue.current_step);
      setIssueSolverData({
        issueUrl: issue.issue_url,
        issueTitle: issue.issue_title,
        issueBody: issue.issue_body,
        explanation: issue.explanation
      });

      const assistantMessage: Message = {
        id: issue.id,
        session_id: activeSessionId,
        role: 'assistant',
        content: `**${issue.issue_title}**\n\n${issue.explanation}`,
        metadata: { step: issue.current_step },
        created_at: new Date().toISOString()
      };
      
      setStreamingMessageId(assistantMessage.id);
      setMessages(prev => [...prev, assistantMessage]);
      setRefreshSidebarTrigger(prev => prev + 1);

    } catch (err: unknown) {
      console.error('Issue Solver error:', err);
      setApiError(err instanceof Error ? err.message : 'Failed to analyze issue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueSolverYes = async () => {
    if (!currentIssueId) return;
    
    setIsLoading(true);
    setApiError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = { 'Authorization': `Bearer ${session?.access_token}` };

      const response = await fetch('/api/issue-solver', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          issue_id: currentIssueId,
          action: 'solution',
          language: currentLanguage
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setApiError(parseAnyError(data, currentLanguage));
        return;
      }

      // Show apify warning if present
      if (data.apifyWarning?.show) {
        setApifyWarning(t('apifyWarning', currentLanguage as LanguageCode));
      }

      const issue = data.issue;
      setIssueSolverStep(issue.current_step);
      setIssueSolverData(prev => ({ ...prev, solutionPlan: issue.solution_plan }));

      const solutionMessage: Message = {
        id: Date.now().toString(),
        session_id: sessionId,
        role: 'assistant',
        content: issue.solution_plan,
        metadata: { step: 'pr_context' },
        created_at: new Date().toISOString()
      };
      
      setStreamingMessageId(solutionMessage.id);
      setMessages(prev => [...prev, solutionMessage]);

    } catch (err: unknown) {
      console.error('Solution error:', err);
      setApiError(err instanceof Error ? err.message : 'Failed to generate solution');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueSolverNo = async () => {
    await handleIssueSolverDiscard();
  };

  const handleIssueSolverDiscard = async () => {
    if (!currentIssueId) {
      resetIssueSolver();
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = { 'Authorization': `Bearer ${session?.access_token}` };

      await fetch('/api/issue-solver', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          issue_id: currentIssueId,
          action: 'discard',
          language: currentLanguage
        })
      });
    } catch (err) {
      console.error('Discard error:', err);
    }

    resetIssueSolver();
  };

  const handleIssueSolverSubmitDiff = async (gitDiff: string) => {
    if (!currentIssueId) return;

    setIsLoading(true);
    setApiError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = { 'Authorization': `Bearer ${session?.access_token}` };

      const response = await fetch('/api/issue-solver', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          issue_id: currentIssueId,
          action: 'pr',
          git_diff: gitDiff,
          language: currentLanguage
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setApiError(parseAnyError(data, currentLanguage));
        return;
      }

      // Show apify warning if present
      if (data.apifyWarning?.show) {
        setApifyWarning(t('apifyWarning', currentLanguage as LanguageCode));
      }

      const issue = data.issue;

      const prMessage: Message = {
        id: Date.now().toString(),
        session_id: sessionId,
        role: 'assistant',
        content: `## PR Ready!\n\n${issue.pr_solution}`,
        metadata: { step: 'completed' },
        created_at: new Date().toISOString()
      };
      
      setStreamingMessageId(prMessage.id);
      setMessages(prev => [...prev, prMessage]);
      
      resetIssueSolver();

    } catch (err: unknown) {
      console.error('PR error:', err);
      setApiError(err instanceof Error ? err.message : 'Failed to generate PR');
    } finally {
      setIsLoading(false);
    }
  };

  const resetIssueSolver = () => {
    setCurrentIssueId(null);
    setIssueSolverStep('issue_input');
    setIssueSolverData({});
  };

  const handleAuthSuccess = () => {
    if (pendingMessage) {
      setTimeout(() => {
        handleSendMessage(pendingMessage);
        setPendingMessage('');
      }, 500);
    }
  };

  const handleModeChange = async (mode: AssistantMode) => {
    setCurrentMode(mode);
    setApiError('');
    
    if (sessionId) {
      await loadMessages(sessionId, mode);
    }
  };

  const handleModeSelect = (mode: AssistantMode) => {
    handleModeChange(mode);
  };

  const handleDeleteFileExplanation = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/chat', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ id, mode: 'file_explainer' })
      });

      const result = await response.json();

      if (response.ok) {
        setFileExplanations(prev => prev.filter(fe => fe.id !== id));
      } else {
        console.error('Failed to delete explanation:', result);
        setApiError(result.error || 'Failed to delete. Please try again.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setApiError('Failed to delete. Please try again.');
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/session', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ id })
      });

      if (response.ok) {
        if (id === sessionId) {
          setSessionId('');
          setMessages([]);
          setFileExplanations([]);
        }
        setRefreshSidebarTrigger(prev => prev + 1);
      } else {
        const result = await response.json();
        console.error('Failed to delete session:', result);
        setSessionError('Failed to delete session.');
      }
    } catch (err) {
      console.error('Delete session error:', err);
      setSessionError('Failed to delete session.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSessionId('');
    setMessages([]);
    setFileExplanations([]);
  };

  if (isAuthLoading) {
    return (
      <div className="flex w-full h-screen bg-background items-center justify-center">
        <div className="h-8 w-8 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen bg-background text-white overflow-hidden font-sans">
      {sessionError && <ErrorToast message={sessionError} onClose={() => setSessionError('')} />}
      
      <AuthDialog 
        isOpen={showAuthDialog} 
        onClose={() => setShowAuthDialog(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authMode}
        language={currentLanguage as any}
      />
      
      <Sidebar 
        onNewChat={() => {
          setSessionId('');
          setMessages([]);
          setFileExplanations([]);
          setShowUserSettings(false);
        }} 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        currentSessionId={sessionId}
        onLoadSession={loadSession}
        onDeleteSession={handleDeleteSession}
        refreshTrigger={refreshSidebarTrigger}
        language={currentLanguage as LanguageCode}
        user={user}
        username={user ? getUsername(user) : undefined}
        onLogout={handleLogout}
        onAuthRequest={(mode) => {
          setAuthMode(mode);
          setShowAuthDialog(true);
        }}
        onShowUserSettings={() => setShowUserSettings(true)}
        hideToggleButton={showUserSettings}
      />

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <AnimatePresence mode="wait">
          {showUserSettings && user ? (
            <UserSettings 
              key="settings"
              user={user} 
              username={getUsername(user)} 
              onBack={() => setShowUserSettings(false)}
              language={currentLanguage as LanguageCode}
              onLanguageChange={setCurrentLanguage}
            />
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex flex-col h-full"
            >
              <div className="h-14 flex items-center justify-between px-2 md:px-4 fixed top-0 left-0 right-0 md:static z-20 bg-background md:bg-transparent border-b border-border-subtle md:border-0">
                   <div className="flex items-center gap-1">
                      <AnimatePresence>
                        {!isSidebarOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setIsSidebarOpen(true)} 
                              className="text-gray-400 hover:text-white"
                            >
                              <PanelLeftOpen className="h-5 w-5" />
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSessionId('');
                          setMessages([]);
                          setFileExplanations([]);
                        }}
                        className="md:hidden text-gray-400"
                        title="New Chat"
                      >
                        <MessageSquarePlus className="h-5 w-5" />
                      </Button>
                   </div>

                   <div className="flex-1 flex justify-end pr-1 md:pr-0 gap-1 md:gap-3">
                       <ModeSelector 
                          currentMode={currentMode} 
                          onModeChange={handleModeChange}
                          currentLanguage={currentLanguage}
                          onLanguageChange={setCurrentLanguage}
                      />
                      <div className="hidden md:flex items-center">
                        <LanguageSelector 
                            currentLanguage={currentLanguage}
                            onLanguageChange={setCurrentLanguage}
                        />
                      </div>
                   </div> 
              </div>

              <div className="flex-1 relative w-full h-full flex flex-col">
                  
                  <div className="absolute top-14 md:top-0 bottom-0 left-0 right-0 pb-20 md:pb-28">
                      {currentMode === 'file_explainer' ? (
                          <FileExplainerList
                              explanations={fileExplanations}
                              isLoading={isLoading}
                              isSessionLoading={isSessionLoading}
                              onModeSelect={handleModeSelect}
                              currentMode={currentMode}
                              language={currentLanguage as LanguageCode}
                              streamingId={streamingMessageId}
                              onStreamComplete={() => setStreamingMessageId(null)}
                              onDelete={handleDeleteFileExplanation}
                          />
                      ) : (
                          <MessageList 
                              messages={messages} 
                              isLoading={isLoading} 
                              isSessionLoading={isSessionLoading}
                              onModeSelect={handleModeSelect} 
                              currentMode={currentMode}
                              language={currentLanguage as LanguageCode}
                              streamingMessageId={streamingMessageId}
                              onStreamComplete={() => setStreamingMessageId(null)}
                          />
                      )}
                  </div>

                  {currentMode === 'issue_solver' && (issueSolverStep === 'solution_step' || issueSolverStep === 'pr_context') ? (
                    <div className="absolute bottom-0 left-0 right-0 w-full flex justify-center p-2 md:p-4 bg-gradient-to-t from-background from-50% via-background/80 to-transparent pt-12 md:pt-20 pb-4 md:pb-6 z-10">
                      <div className="w-full max-w-3xl">
                        <IssueSolverBanner
                          currentStep={issueSolverStep}
                          isLoading={isLoading}
                          issueTitle={issueSolverData.issueTitle as string || 'GitHub Issue'}
                          issueUrl={issueSolverData.issueUrl as string}
                          language={currentLanguage as LanguageCode}
                          onYes={handleIssueSolverYes}
                          onNo={handleIssueSolverNo}
                          onSubmitGitDiff={handleIssueSolverSubmitDiff}
                          onDiscard={handleIssueSolverDiscard}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute bottom-0 left-0 right-0 w-full flex justify-center p-2 md:p-4 bg-gradient-to-t from-background from-50% via-background/80 to-transparent pt-12 md:pt-20 pb-4 md:pb-6 z-10">
                      <MessageInput 
                        onSend={handleSendMessage} 
                        disabled={isLoading} 
                        language={currentLanguage as LanguageCode} 
                        mode={currentMode}
                        error={apiError || apifyWarning}
                        onClearError={() => { setApiError(''); setApifyWarning(''); }}
                      />
                    </div>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
