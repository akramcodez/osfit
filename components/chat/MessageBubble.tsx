import { Message } from '@/types';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <div className={`w-full h-full flex items-center justify-center text-sm font-semibold ${
          isUser ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-purple-500 to-purple-600'
        } text-white`}>
          {isUser ? 'U' : 'AI'}
        </div>
      </Avatar>
      
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <Card className={`p-4 ${
          isUser 
            ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-blue-600 prose-strong:text-gray-800">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </Card>
        
        <div className="flex items-center gap-2 mt-1">
          {message.mode !== 'idle' && (
            <Badge variant="outline" className="text-xs">
              {message.mode.replace('_', ' ')}
            </Badge>
          )}
          <span className="text-xs text-gray-400">
            {new Date(message.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
