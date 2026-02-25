import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import apiClient from '../../../shared/api/api-client.ts';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    permissions: string[];
    roles: string[];
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

    const fetchCurrentUser = useCallback(async () => {
        setIsLoading(true);
        try {
            // Directly fetch current user session (Browser will automatically send the SACCO_SESSION cookie)
            const response = await apiClient.get('/auth/me');

            if (response.data) {
                setUser(response.data);
            } else {
                setUser(null);
            }
        } catch (error: any) {
            // If we get a 401/403, the session cookie is missing or expired.
            // Call logout to clear any stale state.
            if (error?.response?.status === 401 || error?.response?.status === 403) {
                try { await apiClient.post('/auth/logout'); } catch { /* ignore */ }
            }
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCurrentUser();
    }, [fetchCurrentUser]);

    const login = (userData: User) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setUser(null);
            window.location.href = '/login';
        }
    };

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
            {/* This loading check is the "Gatekeeper".
               While isLoading is true, the children (App routes) are not rendered.
               This prevents ProtectedRoute from seeing user=null and redirecting to /login.
            */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600 font-medium">Resuming session...</p>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};