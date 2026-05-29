import React, { useState, useEffect, useCallback } from 'react';
import { Building2, RefreshCw, AlertCircle } from 'lucide-react';
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

    const fetchBalance = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get('/payments/coop/account-balance');
            setBalance(res.data);
            setLastUpdated(new Date());
        } catch {
            setError('Unable to fetch balance');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchBalance(); }, [fetchBalance]);

    useEffect(() => {
        const t = setInterval(() => fetchBalance(), 5 * 60 * 1000);
        return () => clearInterval(t);
    }, [fetchBalance]);

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
            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-red-50 rounded-lg">
                        <AlertCircle size={16} className="text-red-500" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Co-op Bank Balance</span>
                </div>
                <p className="text-sm text-red-500 mb-3">{error}</p>
                <button onClick={() => fetchBalance(true)}
                        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition">
                    <RefreshCw size={12} /> Retry
                </button>
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

            <p className="text-[10px] text-emerald-300 mt-2 font-mono">
                Acct: {balance?.accountNumber ?? '01148381964600'}
            </p>
        </div>
    );
};