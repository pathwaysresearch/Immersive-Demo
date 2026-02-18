import { useRef, useEffect, useCallback } from 'react';

interface UseAudioVisualizerOptions {
    getFrequencyData: (() => Uint8Array | undefined) | null;
    barCount?: number;
    active?: boolean;
}

export function useAudioVisualizer({
    getFrequencyData,
    barCount = 40,
    active = false,
}: UseAudioVisualizerOptions) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const timeRef = useRef<number>(0);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        const data = getFrequencyData?.();
        const barWidth = (width / barCount) * 0.6;
        const gap = (width / barCount) * 0.4;

        for (let i = 0; i < barCount; i++) {
            let barHeight: number;

            if (data && data.length > 0 && active) {
                // Sample from frequency data
                const dataIndex = Math.floor((i / barCount) * data.length);
                barHeight = (data[dataIndex] / 255) * height * 0.85;
                // Ensure minimum visible height when active
                barHeight = Math.max(barHeight, 2);
            } else {
                // Idle animation: gentle sine wave
                timeRef.current += 0.0005;
                const phase = (i / barCount) * Math.PI * 2;
                barHeight = (Math.sin(timeRef.current * 2 + phase) * 0.5 + 0.5) * height * 0.15 + 2;
            }

            const x = i * (barWidth + gap) + gap / 2;
            const y = height - barHeight;

            // Gradient per bar
            const gradient = ctx.createLinearGradient(x, y, x, height);
            if (active) {
                gradient.addColorStop(0, 'rgba(167, 139, 250, 0.9)');
                gradient.addColorStop(0.5, 'rgba(124, 58, 237, 0.7)');
                gradient.addColorStop(1, 'rgba(6, 182, 212, 0.4)');
            } else {
                gradient.addColorStop(0, 'rgba(100, 116, 139, 0.4)');
                gradient.addColorStop(1, 'rgba(51, 65, 85, 0.2)');
            }

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 3);
            ctx.fill();
        }

        animFrameRef.current = requestAnimationFrame(draw);
    }, [getFrequencyData, barCount, active]);

    useEffect(() => {
        animFrameRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [draw]);

    return canvasRef;
}
