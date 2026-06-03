import React, { useState, useEffect, useCallback } from 'react';
import { Building2, RefreshCw } from 'lucide-react';
import apiClient from '../../../shared/api/api-client';

interface BalanceData {
    availableBalance: string;
    bookedBalance: string;
    currency: string;
    accountNumber: string;
}

/**
 * Real-time Co-op bank account balance card.
 * Only visible to SYSTEM_ADMIN, TREASURER, CHAIRPERSON, LOAN_OFFICER.
 * Auto-refreshes every 5 minutes. Manual refresh button included.
 *
 * Place in UnifiedStaffDashboard alongside existing stat cards:
 *   import { CoopAccountBalanceCard } from '../components/CoopAccountBalanceCard';
 *   <CoopAccountBalanceCard />
 */
export const CoopAccountBalanceCard: React.FC = () => {
    const [balance, setBalance]         = useState<BalanceData | null>(null);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [refreshing, setRefreshing]   = useState(false);
    const [isCached, setIsCached]       = useState(false);

    const fetchBalance = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const startMs = performance.now();
        const requestId = Math.random().toString(36).slice(2, 8).toUpperCase();
        console.group(`[Co-op Balance] Request ${requestId} — ${manual ? 'manual' : 'auto'}`);
        console.log('⏱  Started at:', new Date().toISOString());

        try {
            const res = await apiClient.get('/payments/coop/account-balance');
            const elapsed = Math.round(performance.now() - startMs);

            console.log(`✅ Success in ${elapsed}ms`);
            console.log('📦 HTTP status:', res.status);
            console.log('📊 Response data:', res.data);
            console.log('🔑 Message code:', (res.data as Record<string, unknown>)?.messageCode ?? 'N/A');
            console.log('💰 Available balance:', (res.data as BalanceData)?.availableBalance);
            setIsCached(elapsed < 200); // under 200ms = served from backend cache
            console.log('🏦 Account number:', (res.data as BalanceData)?.accountNumber);

            setBalance(res.data);
            setLastUpdated(new Date());
        } catch (err: unknown) {
            const elapsed = Math.round(performance.now() - startMs);
            const axiosErr = err as {
                response?: { status: number; data: unknown };
                message?: string;
                code?: string;
            };

            console.error(`❌ Failed in ${elapsed}ms`);
            console.error('📛 Error message:', axiosErr?.message);
            console.error('🔢 HTTP status:', axiosErr?.response?.status);
            console.error('📦 Response body:', axiosErr?.response?.data);
            console.error('🔌 Error code:', axiosErr?.code);

            const serverMsg = (axiosErr?.response?.data as Record<string, string>)?.error
                ?? axiosErr?.message
                ?? 'Unable to fetch balance';
            setError(serverMsg);
        } finally {
            console.groupEnd();
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchBalance(); }, [fetchBalance]);

    useEffect(() => {
        // When balance is working: poll every 5 minutes (normal operation)
        // When balance is failing (Co-op warm-up delay): retry every 2 minutes silently
        const interval = error
            ? 2 * 60 * 1000   // retry every 2 min while Co-op is warming up
            : 5 * 60 * 1000;  // normal poll every 5 min once working
        const t = setInterval(() => fetchBalance(), interval);
        return () => clearInterval(t);
    }, [fetchBalance, error]);

    const fmt = (val?: string) => {
        if (!val) return '—';
        const n = parseFloat(val);
        return isNaN(n) ? val : new Intl.NumberFormat('en-KE', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        }).format(n);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                    <div className="h-4 w-36 bg-slate-200 rounded" />
                    <div className="h-8 w-8 bg-slate-200 rounded-lg" />
                </div>
                <div className="h-8 w-48 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-50 rounded-lg">
                            <Building2 size={15} className="text-slate-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Co-op Bank Account</span>
                    </div>
                    <button onClick={() => fetchBalance(true)} disabled={refreshing}
                            className="p-1.5 hover:bg-slate-50 rounded-lg transition"
                            title="Retry">
                        <RefreshCw size={14} className={`text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="flex items-center gap-2 py-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <p className="text-sm text-slate-500">Balance syncing with Co-op Bank...</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                    Auto-retrying every 2 min. Last attempt: {new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl shadow-sm p-5 text-white">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                        <Building2 size={15} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-emerald-100">Co-op Bank Account</span>
                </div>
                <button onClick={() => fetchBalance(true)} disabled={refreshing}
                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition"
                        title="Refresh balance">
                    <RefreshCw size={14} className={`text-white ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="mb-3">
                <p className="text-emerald-200 text-xs mb-0.5">Available Balance</p>
                <p className="text-3xl font-bold tracking-tight">
                    KES {fmt(balance?.availableBalance)}
                </p>
            </div>

            <div className="flex items-center justify-between border-t border-white/20 pt-3">
                <div>
                    <p className="text-emerald-200 text-[10px]">Booked Balance</p>
                    <p className="text-sm font-semibold text-white/90">KES {fmt(balance?.bookedBalance)}</p>
                </div>
                <div className="text-right">
                    <p className="text-emerald-200 text-[10px]">Last updated</p>
                    <p className="text-xs text-white/80">
                        {lastUpdated
                            ? lastUpdated.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-emerald-300 font-mono">
                    Acct: {balance?.accountNumber ?? '—'}
                </p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    isCached ? 'bg-white/10 text-emerald-200' : 'bg-white/10 text-yellow-300'
                }`}>
                    {isCached ? '⚡ cached' : '🔴 live'}
                </span>
            </div>
        </div>
    );
};