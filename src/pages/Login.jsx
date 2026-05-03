import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import '../App.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');

            login(data.token, data.user);
            toast.success('Logged in successfully');
            navigate('/');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleGoogleLogin = () => {
        const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
        window.location.href = `${baseUrl}/api/auth/google`;
    };

    return (
        <div className="homePageWrapper">
            <div className="formWrapper">
                <h4 className="mainLabel">Login to PairCode</h4>
                <div className="inputGroup">
                    <input type="email" className="inputBox" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input type="password" className="inputBox" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button className="btn joinBtn" onClick={handleLogin}>Log In</button>
                </div>
                <button className="btn copy-btn" style={{ marginBottom: '15px' }} onClick={handleGoogleLogin}>
                    Sign in with Google
                </button>
                <div className="createInfo">
                    Don't have an account? <Link to="/register">Register</Link>
                </div>
            </div>
        </div>
    );
}
