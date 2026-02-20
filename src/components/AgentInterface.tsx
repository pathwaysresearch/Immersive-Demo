import { useState, useCallback, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Bot, Settings2, Send } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { StatusBadge } from './StatusBadge';
import { ConversationControls } from './ConversationControls';
import { ChatLog } from './ChatLog';
import type { ChatMessage } from '../types/chat';
import Anthropic from '@anthropic-ai/sdk';
import './AgentInterface.css';

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string;
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string;

// Initialize standard Anthropic client
const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true // Web-based prototype
});

// Asset mapping using Vite's glob import
const learnerFiles = import.meta.glob('../assets/learners/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string | { default: string }>;
const moduleFiles = import.meta.glob('../assets/modules/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string | { default: string }>;

function getFileName(path: string) {
    return path.split('/').pop()?.replace('.txt', '') || path;
}

export function AgentInterface() {
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [error, setError] = useState<string | null>(null);
    const [selectedLearner, setSelectedLearner] = useState<string>('');
    const [selectedModule, setSelectedModule] = useState<string>('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    // Helper to format history for dynamic variables
    const getFormattedHistory = useCallback((msgs: ChatMessage[]) => {
        return msgs
            .map(m => `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.text}`)
            .join('\n');
    }, []);

    const conversation = useConversation({
        micMuted: isMuted,
        volume,
        onConnect: () => {
            console.log("Connected to ElevenLabs");
            setError(null);
        },
        onDisconnect: () => {
            console.log("Disconnected from ElevenLabs");
            setError(null);
        },
        onMessage: (message: any) => {
            console.log("DEBUG: ElevenLabs message:", message);
            if (message?.type === 'transcript' && message?.is_final) {
                const newMessage: ChatMessage = {
                    id: Math.random().toString(36).substring(2, 11),
                    role: 'user',
                    text: message.text,
                    type: 'audio',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, newMessage]);
            } else if (message?.type === 'agent_response') {
                const newMessage: ChatMessage = {
                    id: Math.random().toString(36).substring(2, 11),
                    role: 'assistant',
                    text: message.text,
                    type: 'audio',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, newMessage]);
            }
        },
        onError: (err: any) => {
            console.error("DEBUG: Conversation error:", err);
            setError(err?.message || 'An error occurred during the conversation.');
        },
        clientTools: {
            blackboard: (parameters: any) => {
                console.log("DEBUG: blackboard tool called with:", parameters);
                // Robust parameter extraction
                const content = parameters?.content || parameters?.text || (typeof parameters === 'string' ? parameters : JSON.stringify(parameters));

                const newMessage: ChatMessage = {
                    id: Math.random().toString(36).substring(2, 11),
                    role: 'assistant',
                    text: `[BLACKBOARD UPDATE]\n${content}`,
                    type: 'audio',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, newMessage]);
                return "Blackboard content has been posted to the chat.";
            },
            update_blackboard: (parameters: any) => {
                console.log("DEBUG: update_blackboard called with:", parameters);
                const content = parameters?.content || parameters?.text || (typeof parameters === 'string' ? parameters : JSON.stringify(parameters));

                const newMessage: ChatMessage = {
                    id: Math.random().toString(36).substring(2, 11),
                    role: 'assistant',
                    text: `[BLACKBOARD UPDATE]\n${content}`,
                    type: 'audio',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, newMessage]);
                return "Blackboard content has been posted to the chat.";
            }
        }
    });

    const { status, isSpeaking } = conversation;

    // Sync volume changes to the conversation
    useEffect(() => {
        if (status === 'connected') {
            conversation.setVolume({ volume });
        }
    }, [volume, status, conversation]);

    const handleStart = useCallback(async () => {
        setError(null);
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });

            let learnerContent = '';
            let moduleContent = '';

            if (selectedLearner) {
                const content = learnerFiles[selectedLearner];
                if (content && typeof content === 'string') {
                    learnerContent = content;
                } else if (content && typeof content === 'object' && content !== null && 'default' in content) {
                    learnerContent = (content as any).default;
                }
            }

            if (selectedModule) {
                const content = moduleFiles[selectedModule];
                if (content && typeof content === 'string') {
                    moduleContent = content;
                } else if (content && typeof content === 'object' && 'default' in content) {
                    moduleContent = (content as any).default;
                }
            }

            await conversation.startSession({
                agentId: AGENT_ID,
                connectionType: 'websocket',
                dynamicVariables: {
                    learner: learnerContent.trim(),
                    module: moduleContent.trim(),
                    history: getFormattedHistory(messages)
                }
            } as any);
        } catch (err) {
            console.error("Start session failed:", err);
            const message = err instanceof Error ? err.message : 'Failed to start conversation.';
            setError(message);
        }
    }, [conversation, selectedLearner, selectedModule, getFormattedHistory, messages]);

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || isThinking) return;

        const userText = inputText.trim();
        setInputText('');

        const userMsg: ChatMessage = {
            id: Math.random().toString(36).substring(2, 11),
            role: 'user',
            text: userText,
            type: 'text',
            timestamp: new Date()
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setIsThinking(true);

        if (status === 'connected') {
            conversation.sendUserActivity();
            conversation.sendContextualUpdate(`Learner typed: ${userText}`);
        }

        try {
            let learnerContent = '';
            if (selectedLearner) {
                const content = learnerFiles[selectedLearner];
                learnerContent = typeof content === 'string' ? content : (content as any)?.default || '';
            }

            let moduleContent = '';
            if (selectedModule) {
                const content = moduleFiles[selectedModule];
                moduleContent = typeof content === 'string' ? content : (content as any)?.default || '';
            }

            const anthropicMessages: Anthropic.MessageParam[] = updatedMessages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.text
            }));

            const systemPrompt = `
You are an immersive tutor. 
Learner Profile: ${learnerContent}
Current Module: ${moduleContent}

Respond concisely for a chat window. If you have detailed visual or structured information to share (like formulas or steps), please include them in your response.
`;

            const stream = await anthropic.messages.create({
                max_tokens: 1024,
                system: systemPrompt,
                messages: anthropicMessages,
                model: 'claude-sonnet-4-5-20250929',
                stream: true,
            });

            let fullResponse = '';
            for await (const event of stream) {
                if (event.type === 'content_block_delta' && 'text' in event.delta) {
                    fullResponse += event.delta.text;
                }
            }

            if (fullResponse) {
                const assistantMsg: ChatMessage = {
                    id: Math.random().toString(36).substring(2, 11),
                    role: 'assistant',
                    text: fullResponse,
                    type: 'text',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMsg]);

                if (status === 'connected') {
                    conversation.sendContextualUpdate(`Tutor (text response): ${fullResponse}`);
                }
            }
        } catch (err) {
            console.error("Claude query failed:", err);
            setError("Failed to get response from Claude.");
        } finally {
            setIsThinking(false);
        }
    };

    const handleStop = useCallback(async () => {
        try {
            await conversation.endSession();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to end conversation.';
            setError(message);
        }
    }, [conversation]);

    const getFrequencyData = useCallback(() => conversation.getOutputByteFrequencyData(), [conversation]);

    return (
        <div className="agent-interface-container">
            <div className="agent-card glass">
                <div className="agent-header glass">
                    <div className="agent-brand">
                        <div className="agent-brand-icon"><Bot size={20} /></div>
                        <span className="agent-brand-name">Immersive Learning Agent</span>
                    </div>
                </div>

                {error && <div className="agent-error">{error}</div>}
                <div className="agent-main-content">
                    <div className="agent-left">
                        <div className="content-selection glass">
                            <div className="selection-group">
                                <label htmlFor="case-select">Select Learner</label>
                                <select
                                    id="case-select"
                                    value={selectedLearner}
                                    onChange={(e) => setSelectedLearner(e.target.value)}
                                    disabled={status !== 'disconnected'}
                                >
                                    <option value="">None (Default)</option>
                                    {Object.keys(learnerFiles).map((path) => (
                                        <option key={path} value={path}>{getFileName(path)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="selection-group">
                                <label htmlFor="module-select">Select Module</label>
                                <select
                                    id="module-select"
                                    value={selectedModule}
                                    onChange={(e) => setSelectedModule(e.target.value)}
                                    disabled={status !== 'disconnected'}
                                >
                                    <option value="">None (Default)</option>
                                    {Object.keys(moduleFiles).map((path) => (
                                        <option key={path} value={path}>{getFileName(path)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="agent-avatar-section glass">
                            <div className={`avatar-container ${status === 'connected' ? 'active' : ''}`}>
                                <Bot size={64} className="agent-bot-icon" />
                                {status === 'connected' && (
                                    <AudioVisualizer
                                        getFrequencyData={getFrequencyData}
                                        active={true}
                                        isSpeaking={isSpeaking}
                                    />
                                )}
                            </div>
                            <StatusBadge status={status} />
                            <div className="agent-controls-row">
                                <ConversationControls
                                    status={status}
                                    isMuted={isMuted}
                                    volume={volume}
                                    onStart={handleStart}
                                    onStop={handleStop}
                                    onToggleMute={() => setIsMuted(prev => !prev)}
                                    onVolumeChange={(v) => setVolume(v)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="agent-middle">
                        <ChatLog messages={messages} />
                        <form className="chat-input-form glass" onSubmit={handleChatSubmit}>
                            <input
                                type="text"
                                placeholder="Type a message to the tutor..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                disabled={isThinking}
                            />
                            <button type="submit" disabled={!inputText.trim() || isThinking} className="send-btn">
                                {isThinking ? <Settings2 className="spin" size={20} /> : <Send size={20} />}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}