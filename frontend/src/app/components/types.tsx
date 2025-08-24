export interface Message {
  id: number | string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: number | string;
  title: string;
  messages: Message[];
  lastActivity: string;
}