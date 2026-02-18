import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import './AudioVisualizer.css';

interface AudioVisualizerProps {
    getFrequencyData: (() => Uint8Array | undefined) | null;
    active?: boolean;
    isSpeaking?: boolean;
}

export function AudioVisualizer({ getFrequencyData, active = false, isSpeaking = false }: AudioVisualizerProps) {
    const canvasRef = useAudioVisualizer({ getFrequencyData, barCount: 48, active: active && isSpeaking });

    return (
        <div className={`visualizer-container ${isSpeaking ? 'speaking' : ''}`}>
            <canvas
                ref={canvasRef}
                className="visualizer-canvas"
                width={480}
                height={80}
            />
        </div>
    );
}
