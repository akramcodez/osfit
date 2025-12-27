'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Key, Eye, EyeOff, Check, X, ArrowLeft, Save, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase-auth';
import { User } from '@supabase/supabase-js';
import LanguageSelector from '@/components/chat/LanguageSelector';
import { LanguageCode, t } from '@/lib/translations';

interface UserSettingsProps {
  user: User;
  username: string;
  onBack: () => void;
  language: LanguageCode;
  onLanguageChange: (lang: string) => void;
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
  
  // Input values
  const [geminiKey, setGeminiKey] = useState('');
  const [apifyKey, setApifyKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  
  // Visibility toggles
  const [showGemini, setShowGemini] = useState(false);
  const [showApify, setShowApify] = useState(false);
  const [showGroq, setShowGroq] = useState(false);
  
  // AI Provider selection
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'groq'>('gemini');
  
  // Success/error messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchKeyStatus();
  }, []);

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
      setMessage({ type: 'error', text: 'Please enter a valid API key' });
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
      
      setMessage({ type: 'success', text: 'API key saved successfully' });
      
      // Clear input and refresh status
      if (keyType === 'gemini') setGeminiKey('');
      if (keyType === 'apify') setApifyKey('');
      if (keyType === 'groq') setGroqKey('');
      
      await fetchKeyStatus();
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save API key' });
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
      
      setMessage({ type: 'success', text: 'API key removed' });
      await fetchKeyStatus();
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to remove API key' });
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

  // Filter to show only the selected AI provider's key (Gemini OR Groq), plus Apify
  // Order: AI Key first, then Apify
  const filteredKeyConfigs = [
    // First: the selected AI provider's key
    ...keyConfigs.filter(config => 
      (config.type === 'gemini' && selectedProvider === 'gemini') ||
      (config.type === 'groq' && selectedProvider === 'groq')
    ),
    // Then: Apify
    ...keyConfigs.filter(config => config.type === 'apify'),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-2 border-white/20 border-t-[#3ECF8E] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex flex-col h-full bg-[#1C1C1C]"
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#2A2A2A]">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToChat', language)}
        </Button>
        
        <LanguageSelector 
          currentLanguage={language}
          onLanguageChange={onLanguageChange}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Profile Section */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-full bg-[#3ECF8E] flex items-center justify-center text-2xl font-bold text-black">
                {username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">{username}</h1>
                <p className="text-sm text-gray-400">the open-source warrior</p>
              </div>
            </div>
          </motion.div>

          {/* Message */}
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
              <span className="text-sm">{message.text}</span>
            </motion.div>
          )}

          {/* API Keys Section */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-[#3ECF8E]" />
              <h2 className="text-lg font-medium text-white">{t('apiKeys', language)}</h2>
            </div>
            
            <p className="text-sm text-gray-400 mb-6">
              {t('apiKeysDescription', language)}
            </p>

            {/* AI Provider Selector */}
            <div className="p-4 bg-[#161616] rounded-lg border border-[#2A2A2A] mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">AI Provider</h3>
                  <p className="text-xs text-gray-500">Choose which AI model to use</p>
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
                      setMessage({ type: 'success', text: `Switched to ${newProvider === 'gemini' ? 'Gemini' : 'Groq (OSS)'}` });
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
                    <SelectItem value="gemini">Gemini (Default)</SelectItem>
                    <SelectItem value="groq">Groq (OSS)</SelectItem>
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
                className="p-4 bg-[#161616] rounded-lg border border-[#2A2A2A]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-white">{config.label}</h3>
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
                      className="text-gray-500 hover:text-[#3ECF8E] transition-colors"
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
                      className="pr-10 bg-[#1C1C1C] border-[#2A2A2A] text-white placeholder:text-gray-600"
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
                    className="bg-[#3ECF8E] hover:bg-[#35b87d] text-black"
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
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      {deletingKey === config.type ? (
                        <div className="h-4 w-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
