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
    emailVerified?: boolean;
    phoneVerified?: boolean;
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
    refreshUser: () => Promise<User | null>;
}

// 1. Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2. Define the Hook — eslint-disable is intentional: context files that co-locate a
//    hook with its provider are a well-established pattern. Splitting into separate
//    files would break the encapsulation of the context implementation.
// eslint-disable-next-line react-refresh/only-export-components
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

    // Fetches /auth/me and updates user state. Returns the fetched user so callers
    // (e.g. LoginPage) can make navigation decisions without depending on async state.
    const fetchCurrentUser = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/auth/me');
            const data = response.data;

            // Guard against nginx SPA fallback returning index.html as 200.
            // If VITE_API_BASE_URL is wrong, every API call returns HTML —
            // without this check the app treats the HTML string as a logged-in user.
            if (!data || typeof data === 'string' || !('id' in data)) {
                console.error('[AuthProvider] /auth/me returned non-user data — check VITE_API_BASE_URL');
                setUser(null);
                return;
            }

            setUser(data as User);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCurrentUser();
    }, [fetchCurrentUser]);

    // Separate effect that handles mustChangePassword redirect. Fires whenever the user
    // object or the current path changes, keeping fetchCurrentUser free of routing deps.
    useEffect(() => {
        if (!user) return;
        const isPublic = PUBLIC_PATHS.some(p => location.pathname.startsWith(p));
        if (user.mustChangePassword && !isPublic && location.pathname !== '/change-password') {
            navigate('/change-password', { replace: true });
        }
    }, [user, location.pathname, navigate]);

    const login = useCallback((userData: User) => {
        setUser(userData);
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.error('Server logout failed, clearing local state anyway', error);
        } finally {
            setUser(null);
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