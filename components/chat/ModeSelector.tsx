'use client';

import { AssistantMode } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCode, MessageSquare, Lightbulb } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: AssistantMode;
  onModeChange: (mode: AssistantMode) => void;
}

export default function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="p-4 border-b bg-gray-50">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Mode:</span>
        <Select 
          value={currentMode} 
          onValueChange={(value) => onModeChange(value as AssistantMode)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="idle">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                General Chat
              </div>
            </SelectItem>
            <SelectItem value="issue_solver">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Issue Solver
              </div>
            </SelectItem>
            <SelectItem value="file_explainer">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                File Explainer
              </div>
            </SelectItem>
            <SelectItem value="mentor">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Open Source Mentor
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
