import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import '../Auth.css';
import '../LandingPage.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            login(data.token, data.user);
            toast.success('Logged in');
            navigate('/');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleGoogle = () => {
        const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
        window.location.href = `${baseUrl}/api/auth/google`;
    };

    return (
        <div className="auth-wrap">
            {/* Background Grid & Glowing Aura */}
            <div className="lp-bg-grid-full" />
            <div className="lp-glow-full lp-glow-1" />
            <div className="lp-glow-full lp-glow-2" />

            <div className="auth-card">
                <div className="auth-header">
                    <span className="auth-brand">paircode_</span>
                    <h1 className="auth-title">Sign in to your account</h1>
                </div>

                <form className="auth-form" onSubmit={handleLogin}>
                    <div className="input-block">
                        <label htmlFor="login-email">Email Address</label>
                        <input
                            id="login-email"
                            type="email"
                            className="auth-input"
                            placeholder="name@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-block">
                        <div className="label-row">
                            <label htmlFor="login-pw">Password</label>
                        </div>
                        <input
                            id="login-pw"
                            type="password"
                            className="auth-input"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-submit">Sign In</button>

                    <div className="auth-divider"><span>or continue with</span></div>

                    <div className="oauth-row">
                        <button type="button" className="oauth-btn" onClick={handleGoogle}>
                            Google
                        </button>
                    </div>

                    <div className="auth-footer-links">
                        <span className="auth-text-muted">New to PairCode?</span>
                        <Link to="/register" className="auth-a">Create an account</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
