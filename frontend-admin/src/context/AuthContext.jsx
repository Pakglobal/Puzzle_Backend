import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as loginApi, signup as signupApi } from '@/services/authService';

const AuthContext = createContext(null);

/** Decode a JWT token payload (without verifying signature — that's the backend's job) */
function decodeToken(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(false);

    // Keep user in sync with token
    useEffect(() => {
        if (token) {
            const decoded = decodeToken(token);
            if (decoded) {
                // Check expiry
                if (decoded.exp * 1000 < Date.now()) {
                    // Token expired
                    logout();
                    return;
                }
                const userData = { userId: decoded.userId, role: decoded.role };
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
            }
        }
    }, [token]);

    const login = useCallback(async (email, password, role = 'admin') => {
        setLoading(true);
        try {
            const data = await loginApi({ email, password, role });
            if (data.success && data.token) {
                localStorage.setItem('token', data.token);
                setToken(data.token);
                return { success: true, message: data.message };
            }
            return { success: false, message: data.message || 'Login failed' };
        } catch (error) {
            const msg =
                error.response?.data?.message || 'An unexpected error occurred. Please try again.';
            return { success: false, message: msg };
        } finally {
            setLoading(false);
        }
    }, []);

    const signupUser = useCallback(async (formData, role = 'admin') => {
        setLoading(true);
        try {
            const data = await signupApi(formData, role);
            return { success: data.success, message: data.message };
        } catch (error) {
            const msg =
                error.response?.data?.message || 'An unexpected error occurred. Please try again.';
            return { success: false, message: msg };
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }, []);

    const isAuthenticated = !!token;

    const value = React.useMemo(
        () => ({ user, token, loading, isAuthenticated, login, signupUser, logout }),
        [user, token, loading, isAuthenticated, login, signupUser, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
