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
    const [sessionCount, setSessionCount] = useState(0);

    // Format history for ElevenLabs dynamicVariables (text only, no blackboard)
    const getFormattedHistory = useCallback((msgs: ChatMessage[]) => {
        return msgs
            .filter(m => m.text && !m.text.startsWith('[BLACKBOARD UPDATE]'))
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
            // Detailed log to see exact structure in console
            console.log("DEBUG: ElevenLabs message received:", JSON.stringify(message));

            const text = (message?.text || message?.message || message?.transcript || message?.content || "").trim();
            if (!text) return;

            // Detect role: user vs assistant/agent
            const isUser =
                message?.role === 'user' ||
                message?.source === 'user' ||
                message?.type === 'transcript' ||
                message?.type === 'user_transcript' ||
                (message?.message_type === 'transcript' && message?.source === 'user');

            // Default to assistant if we can't definitively tell it's user, 
            // but only if we have text. This is a fallback to ensure we don't miss agent replies.
            const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

            setMessages(prev => {
                // If it's a user audio transcript, try to update the last user audio message 
                // if it's within a short logical window (5s). This keeps the timestamp of the START of speech.
                if (role === 'user') {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'user' && lastMsg.type === 'audio' && (new Date().getTime() - lastMsg.timestamp.getTime() < 5000)) {
                        return prev.map((m, idx) =>
                            idx === prev.length - 1 ? { ...m, text } : m
                        );
                    }
                }

                // De-duplication for assistant or non-contiguous user messages
                const isDuplicate = prev.some(m =>
                    m.text.trim() === text &&
                    m.role === role &&
                    (new Date().getTime() - m.timestamp.getTime() < 5000)
                );

                if (isDuplicate) return prev;

                return [...prev, {
                    id: Math.random().toString(36).substring(2, 11),
                    role,
                    text,
                    type: 'audio',
                    timestamp: new Date()
                }];
            });
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
            // Confirm permission and then immediately release the stream to avoid locking the mic
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            tempStream.getTracks().forEach(track => track.stop());

            let learnerContent = '';


            if (selectedLearner) {
                const content = learnerFiles[selectedLearner];
                if (content && typeof content === 'string') {
                    learnerContent = content;
                } else if (content && typeof content === 'object' && content !== null && 'default' in content) {
                    learnerContent = (content as any).default;
                }
            }



            // Determine greeting based on session count
            const currentSession = sessionCount + 1;
            const greeting = currentSession === 1
                ? "Hello am Atlas, Get ready to take notes, Research shows taking notes helps for learning."
                : "Shall we continue from where we left off?";

            setSessionCount(currentSession);

            await conversation.startSession({
                agentId: AGENT_ID,
                connectionType: 'websocket',
                dynamicVariables: {
                    learner: learnerContent.trim(),
                    history: getFormattedHistory(messages),
                    message: greeting
                }
            } as any);
        } catch (err) {
            console.error("Start session failed:", err);
            const message = err instanceof Error ? err.message : 'Failed to start conversation.';
            setError(message);
        }
    }, [conversation, selectedLearner, selectedModule, getFormattedHistory, messages, sessionCount]);

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

        const allMessagesForClaude = [...messages, userMsg];

        setMessages(prev => [...prev, userMsg]);
        setIsThinking(true);

        if (status === 'connected') {
            conversation.sendUserActivity();
            // Use sendUserMessage so ElevenLabs also updates its internal history/context
            conversation.sendUserMessage(userText);
        }

        try {
            let learnerContent = '';
            if (selectedLearner) {
                const content = learnerFiles[selectedLearner];
                learnerContent = typeof content === 'string' ? content : (content as any)?.default || '';
            }


            const systemPrompt = `
$ Learner Profile:
${learnerContent}

# Personality

You are a funny and quirky professor, skilled at explaining complex topics in simple terms. You are patient and encouraging, always making sure the learner understands each step before moving on.

# Environment

You are engaging in a conversation with a learner.You must continue the conversation from the chat history if it exists.

# Tone

Your tone is funny and quirky. You speak one line at a time, like a professor writing on a board. You use multimodal output, 70% audio and 30% text.

# Goal

Your primary goal is to teach the learner a new concept or skill.

1.  Start with a funny and quirky intro. Do not say you are being funny or quirky.
2.  Present the holistic picture first, one line at a time, telling the learner what we will do and learn. Keep it short and crisp.
3.  For math display, ALWAYS use Mathjax and render in LateX format. Wrap math in delimiters ($...$ or $$...$$).

# Guardrails

Strictly adhere to the prompt. Do not assume that the learner knows the case or the scenario you are working with the learner. Avoid literal strings like "\\n", "\\r", or "\\cr" in the markdown text outside of math blocks. They break the renderer.

Answer in points normally, Don't Add [Audio] and [Update blackboard], Continue the conversation as usual.
`;

            // Build clean message array — filter out blackboard updates and empty streaming placeholders
            const anthropicMessages: Anthropic.MessageParam[] = allMessagesForClaude
                .filter(m => m.text && m.text.trim() !== '' && !m.text.startsWith('[BLACKBOARD UPDATE]'))
                .map(m => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.text.trim()
                }));

            // ====== DEBUG: Show exactly what Claude receives ======
            console.log(`%c[Claude History] Sending ${anthropicMessages.length} messages:`, 'color: cyan; font-weight: bold');
            anthropicMessages.forEach((m, i) =>
                console.log(`  [${i}] (${m.role}): ${String(m.content).slice(0, 120)}`)
            );
            // =====================================================

            const stream = await anthropic.messages.create({
                max_tokens: 1024,
                system: systemPrompt,
                messages: anthropicMessages,
                model: 'claude-sonnet-4-5-20250929',
                stream: true,
            });

            const assistantMsgId = Math.random().toString(36).substring(2, 11);
            let fullResponse = '';

            // Add initial empty assistant message for streaming
            setMessages(prev => [...prev, {
                id: assistantMsgId,
                role: 'assistant',
                text: '',
                type: 'text',
                timestamp: new Date()
            }]);

            for await (const event of stream) {
                if (event.type === 'content_block_delta' && 'text' in event.delta) {
                    fullResponse += event.delta.text;
                    // Update the last message text in real-time
                    setMessages(prev => prev.map(m =>
                        m.id === assistantMsgId ? { ...m, text: fullResponse } : m
                    ));
                }
            }

            if (fullResponse && status === 'connected') {
                conversation.sendContextualUpdate(`Tutor (text response): ${fullResponse}`);
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