import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { initSocket } from '../socket.js';
import toast from 'react-hot-toast';
import '../Challenge.css';
import '../LandingPage.css';

export default function Lobby() {
    const { user, token } = useContext(AuthContext);
    const navigate = useNavigate();
    const socketRef = useRef(null);
    const roomCodeRef = useRef('');
    
    // Status states
    const [isSearching, setIsSearching] = useState(false);
    const [isHosting, setIsHosting] = useState(false);
    const [roomCode, setRoomCode] = useState('');
    const [roomInput, setRoomInput] = useState('');

    // Keep roomCodeRef in sync to allow the socket cleanup to read the code without re-running socket setup
    useEffect(() => {
        roomCodeRef.current = roomCode;
    }, [roomCode]);

    useEffect(() => {
        if (!token) {
            toast.error("Please login to access 1v1 Challenges");
            navigate('/login');
        }
    }, [token, navigate]);

    useEffect(() => {
        let active = true;
        console.log("[Client Lobby] useEffect triggered (mount).");

        const setupSocket = async () => {
            const currentToken = localStorage.getItem('token');
            if (!currentToken) {
                console.log("[Client Lobby] setupSocket bypassed: token is missing");
                return;
            }
            try {
                console.log("[Client Lobby] setupSocket calling initSocket...");
                const socket = await initSocket();
                if (!active) {
                    console.log("[Client Lobby] setupSocket bypassed: component not active anymore");
                    socket.disconnect();
                    return;
                }
                socketRef.current = socket;
                console.log("[Client Lobby] Socket initialized successfully:", socket.id || 'pending');

                socket.on('connect', () => {
                    console.log("[Client Lobby] Socket connected event fired. Socket ID:", socket.id);
                });

                socket.on('connect_error', (err) => {
                    console.error("[Client Lobby] Socket connect_error:", err.message);
                    toast.error("Failed to connect to matchmaking server");
                    setIsSearching(false);
                    setIsHosting(false);
                });

                socket.on('match-found', ({ matchId, opponentName, problemId }) => {
                    console.log("[Client Lobby] match-found event received:", matchId);
                    toast.success(`Match Found! Opponent: ${opponentName}`);
                    navigate(`/challenge/${matchId}`, {
                        state: { opponentName, problemId }
                    });
                });

                socket.on('private-match-error', ({ message }) => {
                    console.warn("[Client Lobby] private-match-error received:", message);
                    toast.error(message || "Error matching private room");
                });
            } catch (err) {
                console.error("Socket error in lobby:", err);
            }
        };

        setupSocket();

        return () => {
            console.log("[Client Lobby] useEffect CLEANUP running...");
            active = false;
            if (socketRef.current) {
                console.log("[Client Lobby] Cleanup disconnecting socket...");
                // Cancel any active queues on exit
                socketRef.current.emit('cancel-match', { userId: user?.id });
                if (roomCodeRef.current) {
                    console.log("[Client Lobby] Emitting cancel-private-match for room:", roomCodeRef.current);
                    socketRef.current.emit('cancel-private-match', { roomId: roomCodeRef.current });
                }
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Mode handlers
    const handleFindMatch = () => {
        if (!socketRef.current) {
            toast.error("Connecting to server, please wait...");
            return;
        }
        setIsSearching(true);
        socketRef.current.emit('find-match', { userId: user?.id });
    };

    const handleCancel = () => {
        if (socketRef.current) {
            socketRef.current.emit('cancel-match', { userId: user?.id });
        }
        setIsSearching(false);
    };

    const handleCreatePrivate = () => {
        if (!socketRef.current) {
            toast.error("Connecting to server, please wait...");
            return;
        }
        // Generate random 6-character room code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setRoomCode(code);
        setIsHosting(true);
        socketRef.current.emit('create-private-match', { roomId: code, userId: user?.id });
    };

    const handleCancelPrivate = () => {
        if (socketRef.current && roomCode) {
            socketRef.current.emit('cancel-private-match', { roomId: roomCode });
        }
        setIsHosting(false);
        setRoomCode('');
    };

    const handleJoinPrivate = () => {
        if (!socketRef.current) {
            toast.error("Connecting to server, please wait...");
            return;
        }
        if (!roomInput.trim()) {
            toast.error("Please enter a room code");
            return;
        }
        socketRef.current.emit('join-private-match', { roomId: roomInput.trim(), userId: user?.id });
    };

    return (
        <div className="challenge-wrap">
            <div className="lp-bg-grid-full" />
            <div className="lp-glow-full lp-glow-1" />
            <div className="lp-glow-full lp-glow-2" />

            <div className="lobby-card" style={{ maxWidth: isSearching || isHosting ? '500px' : '750px' }}>
                <div className="lobby-logo">🏆</div>
                <h2 className="lobby-title">1v1 Code Challenge</h2>
                <p className="lobby-subtitle">
                    Show off your Python skills! Match with an opponent in real-time or duel a friend using a unique room number.
                </p>

                {isSearching ? (
                    <div className="lobby-status">
                        <div className="pulse-loader"></div>
                        <span className="lobby-status-text">Finding an opponent...</span>
                        <button className="btn btn-dash-danger" onClick={handleCancel} style={{ marginTop: '1.5rem', width: 'auto', padding: '0.6rem 2rem' }}>
                            Cancel Search
                        </button>
                    </div>
                ) : isHosting ? (
                    <div className="lobby-status">
                        <div className="pulse-loader"></div>
                        <span className="lobby-status-text">Waiting for friend to join...</span>
                        <div className="private-room-box">
                            <span className="private-room-label">
                                Share Room Code:
                            </span>
                            <div className="private-room-code">{roomCode}</div>
                            <button className="btn btn-action-view" onClick={() => { navigator.clipboard.writeText(roomCode); toast.success('Room code copied!'); }} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', marginTop: '0.75rem', width: 'auto', display: 'inline-block' }}>
                                📋 Copy Code
                            </button>
                        </div>
                        <button className="btn btn-dash-danger" onClick={handleCancelPrivate} style={{ marginTop: '1.5rem', width: 'auto', padding: '0.6rem 2rem' }}>
                            Cancel Room
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="lobby-modes-grid">
                            {/* Random Matchmaking mode */}
                            <div className="lobby-mode-column">
                                <h3>⚡ Random Matchmaking</h3>
                                <p>Queue up and race to solve Python challenges against a random developer online.</p>
                                <button className="btn btn-dash-primary" onClick={handleFindMatch} style={{ padding: '0.8rem 2rem', fontSize: '1rem', width: '100%', borderRadius: '8px', marginTop: 'auto' }}>
                                    Find Match
                                </button>
                            </div>

                            <div className="lobby-divider-vertical"></div>

                            {/* Private duel mode */}
                            <div className="lobby-mode-column">
                                <h3>🤝 Duel a Friend</h3>
                                <p>Create a private room to invite a friend, or join your friend's room using their code.</p>
                                
                                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '1rem', marginBottom: '0.5rem' }}>
                                    <input
                                        type="text"
                                        placeholder="Room Code (e.g. AB12CD)"
                                        className="inputBox"
                                        value={roomInput}
                                        onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                                        style={{ margin: 0, textAlign: 'center', fontWeight: 'bold', fontSize: '0.95rem' }}
                                    />
                                    <button className="btn btn-dash-primary" onClick={handleJoinPrivate} style={{ width: 'auto', whiteSpace: 'nowrap', padding: '0.75rem 1.25rem' }}>
                                        Join duel
                                    </button>
                                </div>
                                
                                <button className="btn btn-dash-secondary" onClick={handleCreatePrivate} style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem 1rem' }}>
                                    Create Private Room
                                </button>
                            </div>
                        </div>

                        <button className="btn btn-dash-secondary" onClick={() => navigate('/dashboard')} style={{ width: 'auto', padding: '0.6rem 2rem', marginTop: '2.5rem' }}>
                            Back to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
