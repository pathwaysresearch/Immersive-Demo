import React, { useEffect, useRef } from 'react';
import { MathJax } from 'better-react-mathjax';
import './Blackboard.css';

interface BlackboardProps {
    content: string;
}

export const Blackboard: React.FC<BlackboardProps> = ({ content }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [content]);

    return (
        <div className="blackboard glass">
            <div className="blackboard-header">
                <div className="blackboard-title">Blackboard</div>
                <div className="blackboard-controls">
                    <span className="dot dot-red"></span>
                    <span className="dot dot-yellow"></span>
                    <span className="dot dot-green"></span>
                </div>
            </div>
            <div className="blackboard-content" ref={scrollRef}>
                {content ? (
                    <MathJax className="blackboard-text">
                        {content.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </MathJax>
                ) : (
                    <div className="blackboard-placeholder">
                        Waiting for the agent to write something...
                    </div>
                )}
            </div>
        </div>
    );
};
