import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');

        if (urlToken) {
            setToken(urlToken);
            localStorage.setItem('token', urlToken);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const currentToken = urlToken || token;
        if (currentToken) {
            try {
                const payload = JSON.parse(atob(currentToken.split('.')[1]));
                setUser({ id: payload.id });
            } catch (e) {
                setToken(null);
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, [token]);

    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
