import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';
import { Loader2 } from 'lucide-react';

export default function GuestRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    // 1. Wait for session check to finish
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 font-sans">
                <Loader2 className="animate-spin mb-4 text-emerald-600" size={40} />
                <p className="font-medium">Checking session...</p>
            </div>
        );
    }

    // 2. If user already exists, bounce them to the dashboard
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    // 3. Render the login page
    return <>{children}</>;
}