import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import '../Auth.css';
import '../LandingPage.css';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
            const res = await fetch(`${baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');
            login(data.token, data.user);
            toast.success('Account created');
            navigate('/');
        } catch (err) {
            toast.error(err.message);
        }
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
                    <h1 className="auth-title">Create your account</h1>
                </div>

                <form className="auth-form" onSubmit={handleRegister}>
                    <div className="input-block">
                        <label htmlFor="reg-name">Full name</label>
                        <input
                            id="reg-name"
                            type="text"
                            className="auth-input"
                            placeholder="Jay Kolate"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-block">
                        <label htmlFor="reg-email">Email Address</label>
                        <input
                            id="reg-email"
                            type="email"
                            className="auth-input"
                            placeholder="name@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-block">
                        <label htmlFor="reg-pw">Password</label>
                        <input
                            id="reg-pw"
                            type="password"
                            className="auth-input"
                            placeholder="Min. 8 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-submit">Create account</button>

                    <div className="auth-footer-links">
                        <span className="auth-text-muted">Already have an account?</span>
                        <Link to="/login" className="auth-a">Sign in</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
