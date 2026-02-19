import { useState, useCallback, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Bot } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { StatusBadge } from './StatusBadge';
import { ConversationControls } from './ConversationControls';
import { Blackboard } from './Blackboard';
import './AgentInterface.css';

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string;

export function AgentInterface() {
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [error, setError] = useState<string | null>(null);
    const [blackboardData, setBlackboardData] = useState<string>('');

    const conversation = useConversation({
        micMuted: isMuted,
        volume,
        onConnect: () => {
            setError(null);
        },
        onDisconnect: () => {
            setError(null);
        },
        onError: (err) => {
            const message = typeof err === 'string' ? err : (err as Error)?.message ?? 'An error occurred.';
            setError(message);
        },
        clientTools: {
            blackboard: ({ text }: { text: string }) => {
                setBlackboardData((prev) => prev + (prev ? '\n' : '') + text);
                return "Successfully updated blackboard";
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
            await conversation.startSession({
                agentId: AGENT_ID,
                connectionType: 'webrtc',
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start conversation.';
            setError(message);
        }
    }, [conversation]);

    const handleStop = useCallback(async () => {
        try {
            await conversation.endSession();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to end conversation.';
            setError(message);
        }
    }, [conversation]);

    const handleToggleMute = () => {
        setIsMuted(prev => !prev);
    };

    const handleVolumeChange = (v: number) => {
        setVolume(v);
    };

    const getFrequencyData = status === 'connected'
        ? () => conversation.getOutputByteFrequencyData()
        : null;

    return (
        <div className="agent-interface-container">
            <div className="agent-card glass">
                {/* Header */}
                <div className="agent-header">
                    <div className="agent-brand">
                        <div className="agent-brand-icon">
                            <Bot size={16} />
                        </div>
                        <span className="agent-brand-name">ElevenLabs Agent</span>
                    </div>
                    <StatusBadge status={status === 'connected' || status === 'connecting' || status === 'disconnected' ? status : 'disconnected'} />
                </div>

                {/* Avatar */}
                <div className="agent-avatar-section">
                    <div className={`agent-avatar-ring ${isSpeaking ? 'ring-speaking' : ''} ${status === 'connected' ? 'ring-connected' : ''}`}>
                        <div className={`agent-avatar ${isSpeaking ? 'avatar-speaking' : ''}`}>
                            <div className="avatar-orb">
                                <div className="orb-inner" />
                                <div className="orb-glow" />
                            </div>
                        </div>
                    </div>
                    <div className="agent-state-label">
                        {status === 'disconnected' && <span>Ready to connect</span>}
                        {status === 'connecting' && <span>Establishing connection…</span>}
                        {status === 'connected' && (
                            <span className={isSpeaking ? 'label-speaking' : 'label-listening'}>
                                {isSpeaking ? 'Agent is speaking' : 'Listening…'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Visualizer */}
                <div className="agent-visualizer">
                    <AudioVisualizer
                        getFrequencyData={getFrequencyData}
                        active={status === 'connected'}
                        isSpeaking={isSpeaking}
                    />
                </div>

                {/* Divider */}
                <div className="agent-divider" />

                {/* Controls */}
                <ConversationControls
                    status={status === 'connected' || status === 'connecting' || status === 'disconnected' ? status : 'disconnected'}
                    isMuted={isMuted}
                    volume={volume}
                    onStart={handleStart}
                    onStop={handleStop}
                    onToggleMute={handleToggleMute}
                    onVolumeChange={handleVolumeChange}
                />

                {/* Error */}
                {error && (
                    <div className="agent-error" role="alert">
                        <span>⚠ {error}</span>
                    </div>
                )}

                {/* Footer hint */}
                {status === 'disconnected' && !error && (
                    <p className="agent-hint">
                        Microphone access will be requested when you start.
                    </p>
                )}
            </div>

            {/* Blackboard - side by side layout handled in CSS */}
            <Blackboard content={blackboardData} />
        </div>
    );
}