'use client';

import { AssistantMode } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCode, MessageSquare, Lightbulb } from 'lucide-react';
import { t, LanguageCode } from '@/lib/translations';

interface ModeSelectorProps {
  currentMode: AssistantMode;
  onModeChange: (mode: AssistantMode) => void;
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

export default function ModeSelector({ 
  currentMode, 
  onModeChange,
  currentLanguage,
  onLanguageChange
}: ModeSelectorProps) {
  const lang = currentLanguage as LanguageCode;
  
  return (
    <div className="flex items-center gap-3">
        <Select 
        value={currentMode} 
        onValueChange={(value) => onModeChange(value as AssistantMode)}
        >
        <SelectTrigger className="min-w-[200px] w-auto bg-[#2A2A2A] border-[#3E3E3E] text-white focus:ring-offset-0 focus:ring-0">
            <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#1C1C1C] text-white border-[#3E3E3E]">

            <SelectItem value="issue_solver" className="focus:bg-[#2A2A2A] focus:text-white">
            <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                {t('issueSolver', lang)}
            </div>
            </SelectItem>
            <SelectItem value="file_explainer" className="focus:bg-[#2A2A2A] focus:text-white">
            <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                {t('fileExplainer', lang)}
            </div>
            </SelectItem>
            <SelectItem value="mentor" className="focus:bg-[#2A2A2A] focus:text-white">
            <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('openSourceMentor', lang)}
            </div>
            </SelectItem>
        </SelectContent>
        </Select>
        
    </div>
  );
}

