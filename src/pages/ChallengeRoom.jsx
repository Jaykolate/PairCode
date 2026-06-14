import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { initSocket } from '../socket.js';
import Editor from '../Components/Editor.jsx';
import toast from 'react-hot-toast';
import '../Challenge.css';

const PYTHON_TEMPLATE = `# Write your Python solution here.
# Read inputs from standard input (sys.stdin) and print results to standard output.
#
# Example (Sum of two lines):
# import sys
# lines = sys.stdin.read().split()
# if len(lines) >= 2:
#     print(int(lines[0]) + int(lines[1]))

import sys

`;

export default function ChallengeRoom() {
    const { matchId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, token } = useContext(AuthContext);

    const socketRef = useRef(null);
    const codeRef = useRef(PYTHON_TEMPLATE);

    const [problem, setProblem] = useState(null);
    const [match, setMatch] = useState(null);
    const [opponentName, setOpponentName] = useState(location.state?.opponentName || 'Opponent');
    
    // Timer state
    const [timeLeft, setTimeLeft] = useState(1200); // 20 mins in seconds
    
    // Terminal / Submission state
    const [terminalTitle, setTerminalTitle] = useState('Terminal — Run results');
    const [terminalOutput, setTerminalOutput] = useState('Write your code and run/submit test cases.');
    const [terminalStatus, setTerminalStatus] = useState('idle'); // 'idle' | 'running' | 'submitting'
    const [isTerminalOpen, setIsTerminalOpen] = useState(true);
    const [terminalHeight, setTerminalHeight] = useState(200);

    const handleTerminalResize = (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = terminalHeight;

        const onMouseMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const newHeight = Math.max(100, Math.min(600, startHeight - deltaY));
            setTerminalHeight(newHeight);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Live Progress tracking
    const [opponentStatus, setOpponentStatus] = useState({ testsPassed: 0, total: 0, status: 'waiting' });
    const [myStatus, setMyStatus] = useState({ testsPassed: 0, total: 0, status: 'waiting' });

    // Results screen state
    const [matchResult, setMatchResult] = useState(null);
    const [rematchRequested, setRematchRequested] = useState(false);
    const [rematchOffered, setRematchOffered] = useState(false);

    // Fetch Match & Problem details via REST API
    const fetchMatchDetails = async () => {
        try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
            const res = await fetch(`${baseUrl}/api/challenge/match/${matchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load challenge details');
            const data = await res.json();
            setProblem(data.problem);
            setMatch(data.match);
            
            // Calculate remaining time
            const startTime = new Date(data.match.startTime);
            const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
            const remaining = Math.max(0, 1200 - elapsed);
            setTimeLeft(remaining);

            // Find opponent name
            const opp = data.match.players.find(p => p.userId.toString() !== user?.id.toString());
            if (opp) {
                setOpponentName(opp.username || 'Opponent');
                setOpponentStatus({
                    testsPassed: opp.testsPassed || 0,
                    total: data.problem.visibleTestCases.length + data.problem.hiddenTestCasesCount,
                    status: opp.status || 'waiting'
                });
            }
        } catch (err) {
            toast.error(err.message);
            navigate('/dashboard');
        }
    };

    // Fetch details on mount
    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchMatchDetails();
    }, [matchId, token]);

    // Socket Connection & Listeners
    useEffect(() => {
        let active = true;

        const connectSocket = async () => {
            if (!token) return;
            const socket = await initSocket();
            if (!active) {
                socket.disconnect();
                return;
            }
            socketRef.current = socket;

            // Join the socket room for this challenge match
            socket.emit('join-challenge-room', { matchId });

            // Listen for execution outputs
            socket.on('run-result', ({ passed, total, output, error }) => {
                setTerminalStatus('idle');
                setTerminalTitle('Terminal — Run Results');
                if (error) {
                    setTerminalOutput(`❌ Execution Error:\n${error}`);
                } else {
                    setTerminalOutput(`Run completed.\nPassed: ${passed}/${total} visible test cases.\n\nOutput Details:\n${output}`);
                }
            });

            // Listen for opponent progress updates
            socket.on('opponent-progress', ({ userId, testsPassed, total, status }) => {
                if (userId.toString() !== user?.id.toString()) {
                    setOpponentStatus({ testsPassed, total, status });
                } else {
                    setMyStatus({ testsPassed, total, status });
                }
            });

            // Listen for final results
            socket.on('match-result', ({ winner, results }) => {
                setMatchResult({ winner, results });
                setTerminalStatus('idle');
            });

            // Listen for rematch events
            socket.on('rematch-offered', () => {
                setRematchOffered(true);
                toast.success('Opponent offered a rematch!');
            });

            socket.on('match-found', ({ matchId: newMatchId, opponentName: oppName, problemId }) => {
                toast.success('Rematch started!');
                navigate(`/challenge/${newMatchId}`, {
                    state: { opponentName: oppName, problemId }
                });
            });
        };

        connectSocket();

        return () => {
            active = false;
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [matchId, token]);

    // Countdown Timer logic
    useEffect(() => {
        if (matchResult) return; // Stop timer if match is complete
        if (timeLeft <= 0) {
            handleAutoSubmit();
            return;
        }
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, matchResult]);

    // Format remaining time (MM:SS)
    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Run code locally (against visible cases)
    const handleRunCode = () => {
        if (terminalStatus !== 'idle') return;
        setIsTerminalOpen(true);
        setTerminalStatus('running');
        setTerminalTitle('Terminal — Running code...');
        setTerminalOutput('Executing code against visible test cases on Judge0...');
        socketRef.current?.emit('run-code', { matchId, code: codeRef.current });
    };

    // Submit code (against all cases)
    const handleSubmitCode = () => {
        if (terminalStatus !== 'idle') return;
        setIsTerminalOpen(true);
        setTerminalStatus('submitting');
        setTerminalTitle('Terminal — Submitting code...');
        setTerminalOutput('Submitting code... Running against all test cases...');
        socketRef.current?.emit('submit-code', { matchId, code: codeRef.current });
    };

    // Auto-submit when timer expires
    const handleAutoSubmit = () => {
        toast.error("Time is up! Submitting code automatically.");
        handleSubmitCode();
    };

    // Request Rematch
    const handleRequestRematch = () => {
        setRematchRequested(true);
        socketRef.current?.emit('rematch-request', { matchId });
    };

    // Accept Rematch Offer
    const handleAcceptRematch = () => {
        socketRef.current?.emit('rematch-accept', { matchId });
    };

    if (!problem || !match) {
        return (
            <div className="challenge-wrap">
                <div className="pulse-loader" />
                <p style={{ marginTop: '1.5rem', color: '#c084fc' }}>Loading challenge room...</p>
            </div>
        );
    }

    // Determine my results from the match result payload
    const myResult = matchResult?.results?.find(r => r.userId.toString() === user?.id.toString());
    const opponentResult = matchResult?.results?.find(r => r.userId.toString() !== user?.id.toString());
    const isWinner = matchResult?.winner?.toString() === user?.id.toString();
    const isDraw = matchResult ? matchResult.winner === null : false;

    return (
        <div className="cr-container">
            {/* Topbar */}
            <div className="cr-topbar">
                <div className="cr-header-left">
                    <span className="cr-header-title">
                        🏆 1v1 Challenge
                    </span>
                    <span style={{ color: '#6b7280' }}>|</span>
                    <span style={{ fontWeight: 600, color: '#e5e7eb' }}>
                        vs {opponentName}
                    </span>
                </div>

                <div className="cr-timer">
                    ⏱️ {formatTime(timeLeft)}
                </div>

                <div className="cr-opponent-status">
                    <div className="cr-dot" style={{ backgroundColor: opponentStatus.status === 'passed' ? '#10b981' : opponentStatus.status === 'failed' ? '#ef4444' : '#fbbf24' }} />
                    <span style={{ fontSize: '0.9rem' }}>
                        {opponentName}: <strong>{opponentStatus.testsPassed}</strong> tests passed ({opponentStatus.status})
                    </span>
                </div>
            </div>

            {/* Main Panel Area */}
            <div className="cr-main">
                {/* Left Panel: Problem info */}
                <div className="cr-problem-panel">
                    <span className={`cr-difficulty-badge ${problem.difficulty}`}>
                        {problem.difficulty}
                    </span>
                    <h2 className="cr-problem-title">{problem.title}</h2>
                    <p className="cr-problem-desc">{problem.description}</p>

                    {problem.constraints && (
                        <>
                            <div className="cr-section-title">Constraints</div>
                            <div className="cr-constraints-box">{problem.constraints}</div>
                        </>
                    )}

                    <div className="cr-section-title">Visible Test Cases</div>
                    <div className="cr-testcases-list">
                        {problem.visibleTestCases.map((tc, idx) => (
                            <div key={idx} className="cr-testcase-card">
                                <div className="cr-testcase-label">Test Case {idx + 1}</div>
                                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.2rem' }}>Input:</div>
                                <div className="cr-testcase-io">{tc.input || '(empty)'}</div>
                                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.2rem' }}>Expected Output:</div>
                                <div className="cr-testcase-io">{tc.expectedOutput}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Private Editor & Terminal */}
                <div className="cr-editor-panel" style={{ gridTemplateRows: isTerminalOpen ? `1fr ${terminalHeight}px` : '1fr' }}>
                    {/* Code Editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                        <div className="cr-editor-header">
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>main.py (Python 3)</span>
                            <div className="cr-editor-actions">
                                <button className="btn btn-secondary" onClick={handleRunCode} disabled={terminalStatus !== 'idle'}>
                                    {terminalStatus === 'running' ? 'Running...' : '▶ Run'}
                                </button>
                                <button className="btn btn-dash-primary" onClick={handleSubmitCode} disabled={terminalStatus !== 'idle'}>
                                    {terminalStatus === 'submitting' ? 'Submitting...' : '🚀 Submit'}
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: 0 }}>
                                <Editor
                                    socketRef={socketRef}
                                    roomId={matchId}
                                    language="python"
                                    onCodeChange={code => { codeRef.current = code; }}
                                    isPrivate={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Terminal panel */}
                    {isTerminalOpen && (
                        <div className="cr-terminal">
                            <div 
                                className="cr-terminal-resizer" 
                                onMouseDown={handleTerminalResize}
                            />
                            <div className="cr-terminal-header">
                                <span className="cr-terminal-title">💻 {terminalTitle}</span>
                                <button className="ep-out-close" onClick={() => setIsTerminalOpen(false)}>✕</button>
                            </div>
                            <div className="cr-terminal-body">
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{terminalOutput}</pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Status bar */}
            <div className="cr-statusbar">
                <div>Python (v1) • Editor: Private</div>
                <div>Status: Connected</div>
            </div>

            {/* Win/Lose Results Modal */}
            {matchResult && (
                <div className="results-overlay">
                    <div className="results-card">
                        <div className="results-winner">
                            {isWinner ? '🎉' : isDraw ? '🤝' : '💀'}
                        </div>
                        <h2 className={`results-title ${isWinner ? 'win' : isDraw ? 'draw' : 'lose'}`}>
                            {isWinner ? 'YOU WON!' : isDraw ? 'MATCH DRAWN' : 'YOU LOST!'}
                        </h2>

                        <div className="results-players-grid">
                            {/* My details */}
                            <div className={`results-player-card ${isWinner ? 'winner-card' : ''}`}>
                                <span className="results-player-name">{user?.name} (You)</span>
                                <span className="results-player-score">{myResult?.testsPassed || 0} passed</span>
                                <span className="results-player-time">
                                    {myResult?.submissionTime 
                                        ? `Submitted in ${Math.round((new Date(myResult.submissionTime) - new Date(match.startTime)) / 1000 / 60)} mins`
                                        : 'No Submission'}
                                </span>
                            </div>

                            {/* Opponent details */}
                            <div className={`results-player-card ${!isWinner && !isDraw ? 'winner-card' : ''}`}>
                                <span className="results-player-name">{opponentName}</span>
                                <span className="results-player-score">{opponentResult?.testsPassed || 0} passed</span>
                                <span className="results-player-time">
                                    {opponentResult?.submissionTime 
                                        ? `Submitted in ${Math.round((new Date(opponentResult.submissionTime) - new Date(match.startTime)) / 1000 / 60)} mins`
                                        : 'No Submission'}
                                </span>
                            </div>
                        </div>

                        <div className="results-buttons">
                            {rematchOffered ? (
                                <button className="btn btn-dash-primary" onClick={handleAcceptRematch}>
                                    🤝 Accept Rematch Offer
                                </button>
                            ) : rematchRequested ? (
                                <button className="btn btn-dash-secondary" disabled>
                                    Waiting for Opponent...
                                </button>
                            ) : (
                                <button className="btn btn-dash-primary" onClick={handleRequestRematch}>
                                    🔄 Challenge Rematch
                                </button>
                            )}

                            <button className="btn btn-dash-secondary" onClick={() => navigate('/dashboard')}>
                                🚪 Exit to Dashboard
                            </button>
                        </div>

                        {rematchOffered && !rematchRequested && (
                            <p className="btn-rematch-status">Your opponent has proposed a rematch!</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
