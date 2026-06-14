import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import ReviewPanel from '../Components/ReviewPanel.jsx';
import { useNavigate, Link } from 'react-router-dom';
import '../Dashboard.css';
import '../LandingPage.css';

export default function Dashboard() {
    const [sessions, setSessions] = useState([]);
    const [selectedReview, setSelectedReview] = useState(null);
    const { user, token, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (token) {
            fetchHistory();
        }
    }, [token]);

    const fetchHistory = async () => {
        try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
            const res = await fetch(`${baseUrl}/api/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load history');
            const data = await res.json();
            setSessions(data);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const deleteSession = async (id) => {
        try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
            const res = await fetch(`${baseUrl}/api/history/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete');
            setSessions(sessions.filter(s => s._id !== id));
            toast.success('Session deleted');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleLogout = () => {
        logout();
        toast.success("Logged out successfully");
        navigate('/login');
    };

    // Get user initials for avatar
    const getInitials = () => {
        if (!user?.name) return 'U';
        const parts = user.name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return user.name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="dashboard-wrap">
            <div className="dashboard-container">
                {/* Profile Card / Sidebar */}
                <aside className="profile-card">
                    <div className="avatar-container">
                        <div className="avatar-circle">
                            {getInitials()}
                        </div>
                    </div>
                    <h2 className="profile-name">{user?.name || 'PairCode User'}</h2>
                    <p className="profile-email">{user?.email || 'user@example.com'}</p>
                    <span className="badge-dev">Developer</span>

                    <div className="profile-actions">
                        <button className="btn-dash btn-dash-primary" onClick={() => navigate('/join')}>
                            ⚡ Code Editor
                        </button>
                        <button className="btn-dash btn-dash-secondary" onClick={() => navigate('/')}>
                            🏠 Landing Page
                        </button>
                        <button className="btn-dash btn-dash-danger" onClick={handleLogout}>
                            🚪 Logout
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="dashboard-content">
                    <header className="welcome-header">
                        <h2>Welcome back, {user?.name?.split(' ')[0] || 'Coder'}!</h2>
                        <p>Track your code review logs, view AI diagnostic ratings, and manage your collaboration workspace.</p>
                    </header>

                    <div className="challenge-section-header" style={{ marginTop: '1rem' }}>
                        <h3>Play Modes</h3>
                    </div>
                    <div className="session-card challenge-card" onClick={() => navigate('/challenge/lobby')} style={{ cursor: 'pointer' }}>
                        <div className="session-meta">
                            <div className="session-lang-row">
                                <span className="session-lang">🏆 1v1 Coding Challenge</span>
                                <span className="session-score">Live PvP</span>
                            </div>
                            <span className="session-date">
                                Race against another developer to solve coding problems in Python. Real-time test evaluation!
                            </span>
                        </div>
                        <div className="session-actions">
                            <button className="btn-action btn-action-view">Find Match</button>
                        </div>
                    </div>

                    <div className="history-section-header">
                        <h3>Review History</h3>
                    </div>

                    {sessions.length === 0 ? (
                        <div className="empty-history">
                            <span className="empty-icon">📁</span>
                            <p>No coding history found. Paste some code in the editor and click "Gemini Review" to generate feedback logs!</p>
                        </div>
                    ) : (
                        <div className="session-grid">
                            {sessions.map(session => (
                                <div key={session._id} className="session-card">
                                    <div className="session-meta">
                                        <div className="session-lang-row">
                                            <span className="session-lang">{session.language}</span>
                                            {session.feedback && (
                                                <span className="session-score">
                                                    Rating: {session.feedback.rating}/10
                                                </span>
                                            )}
                                        </div>
                                        <span className="session-date">
                                            {new Date(session.savedAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="session-actions">
                                        <button className="btn-action btn-action-view" onClick={() => setSelectedReview(session.feedback)}>
                                            View Feedback
                                        </button>
                                        <button className="btn-action btn-action-delete" onClick={() => deleteSession(session._id)}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {selectedReview && (
                <ReviewPanel review={selectedReview} isLoading={false} onClose={() => setSelectedReview(null)} />
            )}
        </div>
    );
}
