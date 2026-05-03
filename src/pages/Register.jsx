import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import '../App.css';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
            const res = await fetch(`${baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');

            login(data.token, data.user);
            toast.success('Registered successfully');
            navigate('/');
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <div className="homePageWrapper">
            <div className="formWrapper">
                <h4 className="mainLabel">Register for PairCode</h4>
                <div className="inputGroup">
                    <input type="text" className="inputBox" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <input type="email" className="inputBox" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input type="password" className="inputBox" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button className="btn joinBtn" onClick={handleRegister}>Register</button>
                </div>
                <div className="createInfo">
                    Already have an account? <Link to="/login">Log In</Link>
                </div>
            </div>
        </div>
    );
}
