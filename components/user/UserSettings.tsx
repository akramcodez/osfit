'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Key, Eye, EyeOff, Check, X, ArrowLeft, Save, Trash2, ExternalLink, Star } from 'lucide-react';
import { FaGithub } from "react-icons/fa";
import { supabase } from '@/lib/supabase-auth';
import { User } from '@supabase/supabase-js';
import LanguageSelector from '@/components/chat/LanguageSelector';
import { LanguageCode, normalizeLanguageCode, t } from '@/lib/translations';
import { CiLock } from "react-icons/ci";

interface UserSettingsProps {
  user: User;
  username: string;
  onBack: () => void;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
}

type KeyType = 'gemini' | 'apify' | 'groq';

interface KeyStatus {
  has_gemini: boolean;
  has_apify: boolean;
  has_groq: boolean;
  ai_provider: 'gemini' | 'groq';
}

export default function UserSettings({ user, username, onBack, language, onLanguageChange }: UserSettingsProps) {
  const [keyStatus, setKeyStatus] = useState<KeyStatus>({
    has_gemini: false,
    has_apify: false,
    has_groq: false,
    ai_provider: 'gemini',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<KeyType | null>(null);
  const [deletingKey, setDeletingKey] = useState<KeyType | null>(null);
  
  const [geminiKey, setGeminiKey] = useState('');
  const [apifyKey, setApifyKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  
  const [showGemini, setShowGemini] = useState(false);
  const [showApify, setShowApify] = useState(false);
  const [showGroq, setShowGroq] = useState(false);
  
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'groq'>('gemini');
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [starCount, setStarCount] = useState<number | null>(null);

  useEffect(() => {
    fetchKeyStatus();
    fetchStarCount();
  }, []);

  const fetchStarCount = async () => {
    try {
      const res = await fetch('https://api.github.com/repos/akramcodez/osfit');
      const data = await res.json();
      setStarCount(data.stargazers_count || 0);
    } catch (e) {
      console.error('Failed to fetch star count', e);
    }
  };

  const fetchKeyStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/user/keys', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await res.json();
      setKeyStatus(data);
      setSelectedProvider(data.ai_provider || 'gemini');
    } catch (e) {
      console.error('Failed to fetch key status', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveKey = async (keyType: KeyType, value: string) => {
    if (!value.trim()) {
      setMessage({ type: 'error', text: t('enterValidApiKey', language) || 'Please enter a valid API key' });
      return;
    }
    
    setSavingKey(keyType);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/user/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ [`${keyType}_key`]: value }),
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      setMessage({ type: 'success', text: t('apiKeySaved', language) || 'API key saved successfully' });
      
      if (keyType === 'gemini') setGeminiKey('');
      if (keyType === 'apify') setApifyKey('');
      if (keyType === 'groq') setGroqKey('');
      
      await fetchKeyStatus();
    } catch (e) {
      setMessage({ type: 'error', text: t('apiKeySaveFailed', language) || 'Failed to save API key' });
    } finally {
      setSavingKey(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const deleteKey = async (keyType: KeyType) => {
    setDeletingKey(keyType);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/user/keys?key_type=${keyType}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
      });
      
      if (!res.ok) throw new Error('Failed to delete');
      
      setMessage({ type: 'success', text: t('apiKeyRemoved', language) || 'API key removed' });
      await fetchKeyStatus();
    } catch (e) {
      setMessage({ type: 'error', text: t('apiKeyRemoveFailed', language) || 'Failed to remove API key' });
    } finally {
      setDeletingKey(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const keyConfigs = [
    {
      type: 'gemini' as KeyType,
      label: t('geminiApiKey', language) || 'Gemini API Key',
      description: t('geminiApiKeyDesc', language) || 'Powers AI responses and analysis',
      docsUrl: 'https://makersuite.google.com/app/apikey',
      value: geminiKey,
      setValue: setGeminiKey,
      show: showGemini,
      setShow: setShowGemini,
      hasKey: keyStatus.has_gemini,
    },
    {
      type: 'apify' as KeyType,
      label: t('apifyApiKey', language) || 'Apify API Key',
      description: t('apifyApiKeyDesc', language) || 'Fetches GitHub issues and files',
      docsUrl: 'https://console.apify.com/account/integrations',
      value: apifyKey,
      setValue: setApifyKey,
      show: showApify,
      setShow: setShowApify,
      hasKey: keyStatus.has_apify,
    },
    {
      type: 'groq' as KeyType,
      label: t('groqApiKey', language) || 'Groq API Key',
      description: t('groqApiKeyDesc', language) || 'Powers OSS AI model (GPT-OSS-120B)',
      docsUrl: 'https://console.groq.com/keys',
      value: groqKey,
      setValue: setGroqKey,
      show: showGroq,
      setShow: setShowGroq,
      hasKey: keyStatus.has_groq,
    },
  ];

  const filteredKeyConfigs = [
    ...keyConfigs.filter(config => 
      (config.type === 'gemini' && selectedProvider === 'gemini') ||
      (config.type === 'groq' && selectedProvider === 'groq')
    ),
    ...keyConfigs.filter(config => config.type === 'apify'),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex flex-col h-full bg-background"
    >
      <div className="h-14 flex items-center justify-between px-4 border-b border-border-subtle">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToChat', language)}
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center">
            <a
              href="https://github.com/akramcodez/osfit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-2 h-9 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <FaGithub className='h-4 w-4 text-gray-500 mr-2'/>
              <Star className="h-4 w-4 text-gray-500" />
              {starCount !== null && (
                <span className="px-1 py-0.5 text-primary text-sm font-medium">
                  {starCount}
                </span>
              )}
            </a>
          </div>
          
          <LanguageSelector 
            currentLanguage={language}
            onLanguageChange={(lang) => onLanguageChange(normalizeLanguageCode(lang))}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary flex items-center justify-center text-xl sm:text-2xl font-bold text-black">
                {username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-white">{username}</h1>
                <p className="text-xs sm:text-sm text-gray-400">{t('ossWarrior', language)}</p>
              </div>
            </div>
          </motion.div>

          {message && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mb-6 p-3 rounded-lg flex items-center gap-2 ${
                message.type === 'success' 
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {message.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              <span className="text-xs sm:text-sm">{message.text}</span>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="text-base sm:text-lg font-medium text-white">{t('apiKeys', language)}</h2>
            </div>
            
            <p className="text-xs sm:text-sm text-gray-400 mb-6">
              {t('apiKeysDescription', language)}
            </p>

            <div className="p-4 bg-surface-2 rounded-lg border border-border-subtle mb-6">
              <div className="flex items-center justify-between">
                <div className="mr-2">
                  <h3 className="text-xs sm:text-sm font-medium text-white">{t('aiProvider', language)}</h3>
                  <p className="text-xs text-gray-500">{t('aiProviderDesc', language)}</p>
                </div>
                <Select 
                  value={selectedProvider} 
                  onValueChange={async (newProvider: 'gemini' | 'groq') => {
                    setSelectedProvider(newProvider);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      await fetch('/api/user/keys', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({ ai_provider: newProvider }),
                      });
                      setMessage({ type: 'success', text: newProvider === 'gemini' ? t('switchedToGemini', language) : t('switchedToGroq', language) });
                      setTimeout(() => setMessage(null), 3000);
                    } catch (e) {
                      console.error('Failed to save provider', e);
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">{t('geminiDefault', language)}</SelectItem>
                    <SelectItem value="groq">{t('groqOss', language)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredKeyConfigs.map((config, index) => (
              <motion.div 
                key={config.type} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="p-4 bg-surface-2 rounded-lg border border-border-subtle"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-white">{config.label}</h3>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.hasKey ? (
                      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                        <Check className="h-3 w-3" />
                        {t('configured', language)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                        {t('notSet', language)}
                      </span>
                    )}
                    <a 
                      href={config.docsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={config.show ? 'text' : 'password'}
                      placeholder={t('enterApiKey', language)}
                      value={config.value}
                      onChange={(e) => config.setValue(e.target.value)}
                      className="pr-10 bg-background border-border-subtle text-white placeholder:text-gray-600"
                    />
                    <button
                      onClick={() => config.setShow(!config.show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {config.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={() => saveKey(config.type, config.value)}
                    disabled={savingKey === config.type || !config.value.trim()}
                    className="bg-primary hover:bg-primary/90 text-black"
                  >
                    {savingKey === config.type ? (
                      <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                  {config.hasKey && (
                    <Button
                      variant="outline"
                      onClick={() => deleteKey(config.type)}
                      disabled={deletingKey === config.type}
                      className="border-red-500/30 text-red-400 hover:bg-red-900/40 hover:border-red-600/50"
                    >
                      {deletingKey === config.type ? (
                        <div className="h-4 w-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-600" />
                      )}
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 p-4 bg-surface-2/50 rounded-lg border border-border-subtle/50"
            >
              <div className="flex gap-2 items-center mb-2">
                <CiLock />
                <h3 className="text-xs sm:text-sm font-medium text-white">{t('securityTitle', language)}</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                {t('securityDescription1', language)}
              </p>
              <p className="text-xs text-gray-400 mb-3">
                {t('securityDescription2', language)}
              </p>
              <div className="flex items-center gap-2">
                <a 
                  href="https://github.com/akramcodez/osfit" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t('viewSourceCode', language)}
                </a>
                <span className="text-gray-600">•</span>
                <a 
                  href="https://github.com/akramcodez/osfit#readme" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {t('setupGuide', language)}
                </a>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
