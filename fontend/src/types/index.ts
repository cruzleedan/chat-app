export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: {
    content: string;
    filename: string;
    page: number | null;
  }[];
  timestamp: Date;
}
