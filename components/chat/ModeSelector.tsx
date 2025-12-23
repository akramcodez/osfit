'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SUPPORTED_LANGUAGES } from '@/lib/lingo-client';
import type { AssistantMode } from '@/types';

interface ModeSelectorProps {
  mode: AssistantMode;
  onModeChange: (mode: AssistantMode) => void;
  language: string;
  onLanguageChange: (language: string) => void;
}

const MODE_OPTIONS = [
  { value: 'idle', label: 'General', icon: '💬' },
  { value: 'issue_solver', label: 'Issue Solver', icon: '🔧' },
  { value: 'file_explainer', label: 'File Explainer', icon: '📄' },
  { value: 'mentor', label: 'OS Mentor', icon: '🎓' },
] as const;

export function ModeSelector({ 
  mode, 
  onModeChange, 
  language, 
  onLanguageChange 
}: ModeSelectorProps) {
  return (
    <div className="border-b p-4">
      <div className="flex flex-wrap items-center justify-between gap-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mode:</span>
          <div className="flex gap-1">
            {MODE_OPTIONS.map((option) => (
              <Badge
                key={option.value}
                variant={mode === option.value ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => onModeChange(option.value as AssistantMode)}
              >
                {option.icon} {option.label}
              </Badge>
            ))}
          </div>
        </div>

        <Select value={language} onValueChange={onLanguageChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
