import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/chat';
import { Mic, MessageSquare } from 'lucide-react';
import { MathJax } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';
import './ChatLog.css';

interface ChatLogProps {
    messages: ChatMessage[];
}

export const ChatLog: React.FC<ChatLogProps> = ({ messages }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="chat-log-container glass">
            <div className="chat-log-header">
                <MessageSquare size={16} />
                <span>Conversation History</span>
            </div>
            <div className="chat-log-messages" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="chat-log-empty">
                        No messages yet. Start by speaking or typing.
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isBlackboardUpdate = msg.text.startsWith('[BLACKBOARD UPDATE]');
                        const displayText = isBlackboardUpdate
                            ? msg.text.replace('[BLACKBOARD UPDATE]', '').trim()
                            : msg.text;

                        return (
                            <div key={msg.id} className={`chat-message ${msg.role} ${isBlackboardUpdate ? 'blackboard-msg' : ''}`}>
                                <div className="message-header">
                                    <span className="message-role">
                                        {isBlackboardUpdate ? 'Blackboard' : (msg.role === 'user' ? 'You' : 'Agent')}
                                    </span>
                                    <span className="message-source">
                                        {msg.type === 'audio' ? <Mic size={12} /> : <MessageSquare size={12} />}
                                    </span>
                                </div>
                                <div className="message-content">
                                    {isBlackboardUpdate ? (
                                        <MathJax className="blackboard-render">
                                            {displayText.split('\n').map((line, i) => (
                                                <p key={i}>{line}</p>
                                            ))}
                                        </MathJax>
                                    ) : (
                                        msg.role === 'assistant' ? (
                                            <div className="markdown-content">
                                                <ReactMarkdown>
                                                    {displayText}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            displayText
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
