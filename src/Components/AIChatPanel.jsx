import React, { useState, useRef, useEffect } from 'react';

/*
  AIChatPanel
  - Props: reviewData (from AI Review), codeRef (current buffer), language
  - Maintains a Gemini multi-turn conversation via /api/chat
*/
export default function AIChatPanel({ reviewData, codeRef, language }) {
    const [messages, setMessages] = useState([
        {
            role: 'system',
            text: 'AI context ready. Ask me anything about the code in the editor.',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    // Auto-scroll to newest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // When reviewData arrives, surface it as an AI message
    useEffect(() => {
        if (!reviewData) return;
        const summary = `Rating: ${reviewData.rating}/10\n${reviewData.summary}`;
        const snippet = reviewData.bugs?.length
            ? reviewData.bugs.map((b, i) => `${i + 1}. ${b}`).join('\n')
            : null;
        setMessages(prev => [
            ...prev,
            { role: 'user', text: 'Review my code.' },
            { role: 'ai', text: summary, snippet },
        ]);
    }, [reviewData]);

    // Convert our message list to Gemini history format (skip system messages)
    const buildHistory = (msgs) =>
        msgs
            .filter(m => m.role === 'user' || m.role === 'ai')
            .map(m => ({
                role: m.role === 'ai' ? 'model' : 'user',
                parts: [{ text: m.text }],
            }));

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg = { role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
            const history = buildHistory([...messages, userMsg]);
            const code = codeRef?.current || '';

            const res = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history, code, language }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { reply } = await res.json();

            setMessages(prev => [...prev, { role: 'ai', text: reply }]);
        } catch (err) {
            setMessages(prev => [
                ...prev,
                { role: 'ai', text: `Error: ${err.message}` },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ep-chat">

            <div className="ep-chat-header">
                <span className="ep-chat-title">AI Reviewer</span>
                <span className="ep-gemini-badge">Gemini</span>
            </div>

            <div className="ep-chat-msgs">
                {messages.map((m, i) => (
                    <div key={i} className={`ep-bubble ${m.role}`}>
                        {m.text.split('\n').map((line, j) => (
                            <p key={j}>{line}</p>
                        ))}
                        {m.snippet && (
                            <div className="ep-code-block">{m.snippet}</div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="ep-bubble ai">
                        <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                            Thinking…
                        </p>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            <div className="ep-chat-input-row">
                <input
                    type="text"
                    className="ep-chat-input"
                    placeholder={loading ? 'Waiting for response…' : 'Ask the AI…'}
                    value={input}
                    disabled={loading}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()}
                />
                <button className="ep-send-btn" onClick={send} disabled={loading}>
                    ↑
                </button>
            </div>

        </div>
    );
}
