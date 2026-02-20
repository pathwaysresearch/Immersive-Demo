import { Mic, MicOff, Square, Volume2, VolumeX } from 'lucide-react';
import './ConversationControls.css';

interface ConversationControlsProps {
    status: 'connected' | 'connecting' | 'disconnected' | 'disconnecting';
    isMuted: boolean;
    volume: number;
    onStart: () => void;
    onStop: () => void;
    onToggleMute: () => void;
    onVolumeChange: (v: number) => void;
}

export function ConversationControls({
    status,
    isMuted,
    volume,
    onStart,
    onStop,
    onToggleMute,
    onVolumeChange,
}: ConversationControlsProps) {
    const isConnected = status === 'connected';
    const isConnecting = status === 'connecting';
    const isDisconnected = status === 'disconnected';

    return (
        <div className="controls">
            <div className="controls-row">
                {/* Start / Stop */}
                {isDisconnected ? (
                    <button
                        id="btn-start"
                        className="btn btn-primary btn-icon-label"
                        onClick={onStart}
                    >
                        <Mic size={18} />
                        <span>Start Conversation</span>
                    </button>
                ) : (
                    <button
                        id="btn-stop"
                        className="btn btn-danger btn-icon-label"
                        onClick={onStop}
                        disabled={isConnecting}
                    >
                        <Square size={16} fill="currentColor" />
                        <span>End Conversation</span>
                    </button>
                )}

                {/* Mute toggle — only when connected */}
                {isConnected && (
                    <button
                        id="btn-mute"
                        className={`btn btn-ghost btn-icon ${isMuted ? 'btn-muted-active' : ''}`}
                        onClick={onToggleMute}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                )}
            </div>

            {/* Volume slider — only when connected */}
            {isConnected && (
                <div className="volume-row">
                    <VolumeX size={14} className="volume-icon" />
                    <input
                        id="volume-slider"
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                        className="volume-slider"
                    />
                    <Volume2 size={14} className="volume-icon" />
                    <span className="volume-value">{Math.round(volume * 100)}%</span>
                </div>
            )}
        </div>
    );
}
