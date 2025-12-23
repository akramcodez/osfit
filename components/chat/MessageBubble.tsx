import { Message } from '@/types';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      <Avatar className="w-8 h-8">
        <div className={`w-full h-full flex items-center justify-center text-sm font-semibold ${
          isUser ? 'bg-blue-500' : 'bg-purple-500'
        } text-white`}>
          {isUser ? 'U' : 'A'}
        </div>
      </Avatar>
      
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <Card className={`p-3 ${
          isUser ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </Card>
        
        {message.mode !== 'idle' && (
          <Badge variant="outline" className="mt-1 text-xs">
            {message.mode.replace('_', ' ')}
          </Badge>
        )}
      </div>
    </div>
  );
}
