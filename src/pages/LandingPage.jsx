import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { ThemeContext } from '../context/ThemeContext.jsx';
import '../LandingPage.css';

const collabCode = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Two developers are active
# JK: Refactoring base case...
# SD: Testing edge cases...`;

const aiCodeBefore = `def find_duplicates(numbers):
    duplicates = []
    for x in numbers:
        # Loop count is O(n^2) complexity
        if numbers.count(x) > 1 and x not in duplicates:
            duplicates.append(x)
    return duplicates`;

const aiCodeAfter = `def find_duplicates(numbers):
    seen = set()
    dupes = set()
    for x in numbers:
        if x in seen:
            dupes.add(x)
        seen.add(x)
    return list(dupes)

# Fixed: Optimized to O(n) complexity`;

const runCode = `import math

def calculate_stats(data):
    mean = sum(data) / len(data)
    variance = sum((x-mean)**2 for x in data) / len(data)
    return mean, math.sqrt(variance)

print("Stats:", calculate_stats([12, 18, 24, 30, 36]))`;

export default function LandingPage() {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const [activeFeature, setActiveFeature] = useState('collab');
    
    // Typing simulation for collab mode
    const [collabText, setCollabText] = useState('');
    useEffect(() => {
        if (activeFeature !== 'collab') return;
        let index = 0;
        setCollabText('');
        const interval = setInterval(() => {
            if (index < collabCode.length) {
                setCollabText(collabCode.slice(0, index + 1));
                index++;
            } else {
                // Pause for a moment and restart
                clearInterval(interval);
                const timeout = setTimeout(() => {
                    index = 0;
                    setCollabText('');
                    // Recursively restart typing
                    setActiveFeature('collab');
                }, 4000);
                return () => clearTimeout(timeout);
            }
        }, 35);
        return () => clearInterval(interval);
    }, [activeFeature]);

    // AI Review fix simulation
    const [appliedAiFix, setAppliedAiFix] = useState(false);
    useEffect(() => {
        if (activeFeature !== 'ai') {
            setAppliedAiFix(false);
        }
    }, [activeFeature]);

    // Code execution simulation
    const [runState, setRunState] = useState('idle'); // 'idle' | 'running' | 'done'
    const handleRunCode = () => {
        if (runState === 'running') return;
        setRunState('running');
        setTimeout(() => {
            setRunState('done');
        }, 1500);
    };
    useEffect(() => {
        if (activeFeature !== 'run') {
            setRunState('idle');
        }
    }, [activeFeature]);

    // FAQ Accordion State
    const [openFaq, setOpenFaq] = useState(null);
    const toggleFaq = (index) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const faqs = [
        {
            question: "How does the real-time collaboration work?",
            answer: "PairCode uses a low-latency Socket.IO sync server to coordinate cursor movements, selections, and code changes instantly. It behaves like Google Docs for code in your browser."
        },
        {
            question: "What is Gemini AI review, and is it free?",
            answer: "Yes, it is fully integrated! With a click of a button, you can trigger a Gemini AI review of your current editor buffer. It highlights issues, suggests optimizations, and writes explanations."
        },
        {
            question: "How does code execution work?",
            answer: "We connect to Judge0's sandboxed compiler environment. It supports over 40 programming languages (like Python, JS, C++, Rust, etc.). You can run code safely and view output instantly in the terminal."
        },
        {
            question: "Can I save my collaboration history?",
            answer: "Yes. By creating an account and logging in, you get access to a persistent history tab where you can see all your previous code submissions, review recommendations, and past sessions."
        }
    ];

    return (
        <div className="lp-wrap">
            {/* Background Grid & Glowing Aura */}
            <div className="lp-bg-grid" />
            <div className="lp-glow lp-glow-1" />
            <div className="lp-glow lp-glow-2" />

            {/* ── Nav ── */}
            <header className="lp-nav">
                <div className="lp-brand-container">
                    <span className="lp-brand">paircode_</span>
                    <span className="lp-brand-dot" />
                </div>
                <nav className="lp-nav-links">
                    {user ? (
                        <>
                            <Link to="/dashboard" className="lp-nav-link">Dashboard</Link>
                            <button onClick={logout} className="lp-nav-link btn-logout-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="lp-nav-link">Login</Link>
                            <Link to="/register" className="lp-nav-link">Sign up</Link>
                        </>
                    )}
                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        <span className="theme-toggle-icon">
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </span>
                    </button>
                    <Link to="/join" className="btn btn-primary lp-nav-cta">Open editor</Link>
                </nav>
            </header>

            <main className="lp-main">
                {/* ── Hero ── */}
                <section className="lp-hero">
                    <div className="lp-tag-container">
                        <span className="lp-tag-dot" />
                        <span className="lp-tag">Gemini AI Collaborative IDE</span>
                    </div>
                    <h1 className="lp-h1">
                        Code together, <br />
                        <span className="lp-accent">smarter & faster.</span>
                    </h1>
                    <p className="lp-sub">
                        Real-time operational collaboration, intelligent Gemini AI static review,
                        and secure sandbox code execution — designed for modern developers.
                    </p>
                    <div className="lp-actions">
                        <Link to="/join" className="btn btn-primary btn-glow">Start a session ⚡</Link>
                        <a
                            href="https://github.com/Jaykolate/PairCode"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost"
                        >
                            <svg className="github-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                            </svg>
                            GitHub
                        </a>
                    </div>
                </section>

                {/* ── Interactive Feature Selector ── */}
                <div className="lp-selector">
                    <button
                        className={`lp-selector-btn ${activeFeature === 'collab' ? 'active' : ''}`}
                        onClick={() => setActiveFeature('collab')}
                    >
                        <span className="selector-icon collab-icon">🤝</span>
                        Real-time Collaboration
                    </button>
                    <button
                        className={`lp-selector-btn ${activeFeature === 'ai' ? 'active' : ''}`}
                        onClick={() => setActiveFeature('ai')}
                    >
                        <span className="selector-icon ai-icon">✨</span>
                        Gemini AI Review
                    </button>
                    <button
                        className={`lp-selector-btn ${activeFeature === 'run' ? 'active' : ''}`}
                        onClick={() => setActiveFeature('run')}
                    >
                        <span className="selector-icon run-icon">⚡</span>
                        Secure Execution
                    </button>
                </div>

                {/* ── Editor preview ── */}
                <section className="lp-preview">
                    <div className="fake-editor">
                        {/* titlebar */}
                        <div className="fe-bar">
                            <div className="fe-dots">
                                <span className="fe-dot fe-dot-close" />
                                <span className="fe-dot fe-dot-minimize" />
                                <span className="fe-dot fe-dot-expand" />
                            </div>
                            <div className="fe-tabs">
                                <div 
                                    className={`fe-tab ${activeFeature === 'collab' ? 'active' : ''}`}
                                    onClick={() => setActiveFeature('collab')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <span>fibonacci.py</span>
                                </div>
                                <div 
                                    className={`fe-tab ${activeFeature === 'ai' ? 'active' : ''}`}
                                    onClick={() => setActiveFeature('ai')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <span>duplicates.py</span>
                                </div>
                                <div 
                                    className={`fe-tab ${activeFeature === 'run' ? 'active' : ''}`}
                                    onClick={() => setActiveFeature('run')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <span>stats.py</span>
                                </div>
                            </div>
                            <div className="fe-actions-bar">
                                {activeFeature === 'run' && (
                                    <button className="fe-run-trigger" onClick={handleRunCode}>
                                        {runState === 'running' ? 'Running...' : 'Run Code ⚡'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* body */}
                        <div className="fe-body">
                            {/* line numbers */}
                            <div className="fe-nums">
                                1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9
                            </div>

                            {/* code display block */}
                            <div className="fe-code">
                                {activeFeature === 'collab' && (
                                    <pre className="fe-pre">
                                        {collabText}
                                        <span className="fe-cursor-ghost c1">
                                            <span className="fe-cursor-label c1">sarah_dev</span>
                                        </span>
                                    </pre>
                                )}

                                {activeFeature === 'ai' && (
                                    <pre className="fe-pre">
                                        {!appliedAiFix ? (
                                            <>
                                                <span>{"def find_duplicates(numbers):"}</span>{"\n"}
                                                <span>{"    duplicates = []"}</span>{"\n"}
                                                <span>{"    for x in numbers:"}</span>{"\n"}
                                                <span className="line-warning-highlight">{"        # Loop count is O(n^2) complexity"}</span>{"\n"}
                                                <span className="line-warning-highlight">{"        if numbers.count(x) > 1 and x not in duplicates:"}</span>{"\n"}
                                                <span>{"            duplicates.append(x)"}</span>{"\n"}
                                                <span>{"    return duplicates"}</span>
                                            </>
                                        ) : (
                                            <span className="fade-in-code">{aiCodeAfter}</span>
                                        )}
                                        <span className="fe-cursor-ghost c2">
                                            <span className="fe-cursor-label c2">gemini_ai</span>
                                        </span>
                                    </pre>
                                )}

                                {activeFeature === 'run' && (
                                    <pre className="fe-pre">
                                        {runCode}
                                    </pre>
                                )}
                            </div>

                            {/* Dynamic Sidebar based on state */}
                            {activeFeature === 'ai' && (
                                <div className="fe-review">
                                    <div className="fe-review-title">AI Suggestion</div>
                                    <div className="fe-chip warning">
                                        <div className="fe-chip-title">Quadratic Loop</div>
                                        <div className="fe-chip-meta">O(N²) time complexity detected</div>
                                    </div>
                                    <div className="fe-chip suggestion">
                                        <div className="fe-chip-title">Optimize lookup</div>
                                        <div className="fe-chip-meta">Use hash set for O(1) checks</div>
                                    </div>
                                    <button 
                                        className="fe-ai-action-btn" 
                                        onClick={() => setAppliedAiFix(!appliedAiFix)}
                                    >
                                        {appliedAiFix ? 'Reset Code' : 'Apply AI Fix ✨'}
                                    </button>
                                </div>
                            )}

                            {activeFeature === 'collab' && (
                                <div className="fe-review collab-sidebar">
                                    <div className="fe-review-title">Collaborators</div>
                                    <div className="collab-user-row">
                                        <div className="collab-avatar color-jk">XZ</div>
                                        <div className="collab-name">
                                            <span>xyz gamma</span>
                                            <span className="collab-role">Owner</span>
                                        </div>
                                    </div>
                                    <div className="collab-user-row">
                                        <div className="collab-avatar color-sd">AA</div>
                                        <div className="collab-name">
                                            <span>abc alpha</span>
                                            <span className="collab-role">Editing</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Console panel for executing code */}
                        {activeFeature === 'run' && (
                            <div className={`fe-console ${runState !== 'idle' ? 'expanded' : ''}`}>
                                <div className="fe-console-header">
                                    <span>Terminal Output (Judge0 sandbox)</span>
                                    <span className="console-indicator" />
                                </div>
                                <div className="fe-console-body">
                                    {runState === 'running' && (
                                        <div className="console-line compiling">
                                            <span className="spinner" /> Compiling Python script...
                                        </div>
                                    )}
                                    {runState === 'done' && (
                                        <>
                                            <div className="console-line success">✔ Compilation successful in 0.05s</div>
                                            <div className="console-line output">
                                                $ python stats.py{"\n"}
                                                Stats: (24.0, 8.48528137423857){"\n"}
                                                {"\n"}
                                                [Process completed in 0.08s]
                                            </div>
                                        </>
                                    )}
                                    {runState === 'idle' && (
                                        <div className="console-line instruction">
                                            Click the "Run Code ⚡" button in the editor toolbar to execute this code inside the Judge0 secure sandbox.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* presence bar */}
                        <div className="fe-presence">
                            <div className="fe-avatars">
                                <div className="fe-ava u-jk">JK</div>
                                <div className="fe-ava u-sd">SD</div>
                                <div className="fe-ava u-gemini">G</div>
                            </div>
                            <div className="fe-online">
                                <span className="fe-pulse" />
                                3 active in session
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Feature Cards ── */}
                <section className="lp-features-section">
                    <h2 className="lp-section-title">Built for modern collaborative engineering</h2>
                    <div className="lp-features">
                        <div className="lp-card">
                            <div className="lp-card-icon">🤝</div>
                            <h3 className="lp-card-title">Real-time collaboration</h3>
                            <p className="lp-card-desc">Zero conflicts. Instantly synchronize editor state, cursors, and language environments with sub-100ms lag.</p>
                        </div>
                        <div className="lp-card">
                            <div className="lp-card-icon">✨</div>
                            <h3 className="lp-card-title">Gemini AI reviewer</h3>
                            <p className="lp-card-desc">Review your code on-demand. Gemini scans for code logic anomalies, time complexity, and style guides.</p>
                        </div>
                        <div className="lp-card">
                            <div className="lp-card-icon">⚡</div>
                            <h3 className="lp-card-title">Secure code runtime</h3>
                            <p className="lp-card-desc">Compile and run right in your browser. Powered by Judge0 sandbox supporting over 40 programming languages.</p>
                        </div>
                    </div>
                </section>



                {/* ── FAQ Section ── */}
                <section className="lp-faq-section">
                    <h2 className="lp-section-title">Frequently asked questions</h2>
                    <div className="lp-faq-container">
                        {faqs.map((faq, index) => (
                            <div 
                                className={`faq-item ${openFaq === index ? 'open' : ''}`} 
                                key={index}
                                onClick={() => toggleFaq(index)}
                            >
                                <div className="faq-question">
                                    <span>{faq.question}</span>
                                    <span className="faq-toggle-icon">{openFaq === index ? '−' : '+'}</span>
                                </div>
                                <div className="faq-answer">
                                    <p>{faq.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── CTA Banner ── */}
                <section className="lp-cta-section">
                    <div className="lp-cta-card">
                        <div className="lp-cta-glow" />
                        <h2 className="lp-cta-title">Upgrade your coding sessions today</h2>
                        <p className="lp-cta-desc">Start editing, reviewing, and compiling collaboratively in seconds. Open workspace immediately.</p>
                        <div className="lp-cta-buttons">
                            <Link to="/join" className="btn btn-primary lp-cta-btn">Start collaborating now 🚀</Link>
                        </div>
                    </div>
                </section>

            </main>

            {/* ── Footer ── */}
            <footer className="lp-footer">
                <div className="lp-footer-content">
                    <span className="lp-brand">paircode_</span>
                    <p className="lp-footer-copy">© {new Date().getFullYear()} PairCode. Built for collaborative development.</p>
                </div>
            </footer>
        </div>
    );
}
