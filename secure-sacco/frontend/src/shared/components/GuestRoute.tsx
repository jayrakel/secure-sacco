import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthProvider';

export default function GuestRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const location = useLocation();
    // Where to send an already-authenticated visitor — default to /dashboard
    const destination = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

    // 1. Wait for session check to finish
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="relative flex items-center justify-center mb-4">
                    <div className="w-14 h-14 rounded-full border-4 border-slate-200" />
                    <div className="absolute w-14 h-14 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                    <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-500 opacity-80" />
                </div>
                <p className="text-slate-400 text-sm tracking-wide animate-pulse">Checking session…</p>
            </div>
        );
    }

    // 2. If user already exists, bounce them back to where they were (or dashboard)
    if (user) {
        return <Navigate to={destination} replace />;
    }

    // 3. Render the guest page
    return <>{children}</>;
}