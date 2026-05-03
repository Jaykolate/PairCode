import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import ReviewPanel from '../Components/ReviewPanel.jsx';
import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function History() {
    const [sessions, setSessions] = useState([]);
    const [selectedReview, setSelectedReview] = useState(null);
    const { token, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        fetchHistory();
    }, []);

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

    return (
        <div className="mainWrap" style={{ display: 'block', padding: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: '#fff' }}>My Review History</h2>
                <div>
                    <button className="btn run-btn" style={{ marginRight: '10px' }} onClick={() => navigate('/')}>Home</button>
                    <button className="btn leave-btn" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
                </div>
            </div>

            {sessions.length === 0 && <p style={{ color: '#fff' }}>No history found.</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '800px', marginTop: '20px' }}>
                {sessions.map(session => (
                    <div key={session._id} style={{ background: '#282a36', padding: '15px', borderRadius: '8px', color: '#fff', border: '1px solid #44475a' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>Language: <span style={{ color: '#50fa7b' }}>{session.language}</span> <span style={{ float: 'right', fontSize: '0.9rem', color: '#6272a4' }}>{new Date(session.savedAt).toLocaleString()}</span></h4>
                        {session.feedback && (
                            <p style={{ margin: '0 0 10px 0' }}>Rating: <strong style={{ color: '#8be9fd' }}>{session.feedback.rating}/10</strong></p>
                        )}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn run-btn" style={{ margin: 0 }} onClick={() => setSelectedReview(session.feedback)}>View Feedback</button>
                            <button className="btn leave-btn" style={{ margin: 0, width: 'auto' }} onClick={() => deleteSession(session._id)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {selectedReview && (
                <ReviewPanel review={selectedReview} isLoading={false} onClose={() => setSelectedReview(null)} />
            )}
        </div>
    );
}
