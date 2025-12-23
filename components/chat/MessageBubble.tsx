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
          isUser ? 'bg-primary text-black' : 'bg-zinc-700 text-white'
        }`}>
          {isUser ? 'U' : 'AI'}
        </div>
      </Avatar>
      
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        <Card className={`p-4 border-0 ${
          isUser 
            ? 'bg-primary/10 text-primary-foreground text-white' 
            : 'bg-card text-card-foreground border border-border shadow-sm'
        }`}>
          <div className={`prose prose-sm max-w-none prose-headings:font-semibold ${
            isUser ? 'prose-p:text-gray-100 prose-a:text-white underline' : 'prose-invert prose-green'
          }`}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </Card>
        
        <div className="flex items-center gap-2 mt-1">

            <Badge variant="outline" className="text-xs">
              {message.mode.replace('_', ' ')}
            </Badge>
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
