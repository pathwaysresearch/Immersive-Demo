export type MessageRole = 'user' | 'assistant';
export type MessageSource = 'audio' | 'text';

export interface ChatMessage {
    id: string;
    role: MessageRole;
    text: string;
    type: MessageSource; // Renamed from source to type to match plan
    timestamp: Date;     // Changed from number to Date to match plan
}
