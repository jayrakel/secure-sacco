import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../../shared/api/api-client';

// Pages that are publicly accessible — AuthProvider must NOT redirect away from these
const PUBLIC_PATHS = ['/login', '/activate', '/reset-password'];

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    permissions: string[];
    roles: string[];
    mfaEnabled?: boolean;
    mustChangePassword?: boolean;
    memberNumber?: string;
    memberStatus?: string;
    memberId?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

// 1. Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2. Define the Hook (Moved inside the same file but kept clean for Vite)
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

// 3. Define the Provider
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    const fetchCurrentUser = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/auth/me');

            if (response.data) {
                setUser(response.data);
                // Redirect to change-password only if on a protected page (not public pages)
                const isPublic = PUBLIC_PATHS.some(p => location.pathname.startsWith(p));
                if (response.data.mustChangePassword && !isPublic && location.pathname !== '/change-password') {
                    navigate('/change-password', { replace: true });
                }
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCurrentUser();
    }, [fetchCurrentUser]);

    const login = useCallback((userData: User) => {
        setUser(userData);
    }, []);

    const logout = useCallback(async () => {
        try {
            // Hit the backend endpoint to invalidate Redis/DB session and clear cookies
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.error('Server logout failed, clearing local state anyway', error);
        } finally {
            // 1. Clear the React Context state immediately
            setUser(null);

            // 2. Use a hard redirect.
            // This completely flushes any caches in browser memory!
            window.location.href = '/login';
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
                refreshUser: fetchCurrentUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};