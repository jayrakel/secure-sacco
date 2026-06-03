import React, { useState, useEffect, useCallback } from 'react';
import { Building2, RefreshCw, AlertCircle } from 'lucide-react';
import { paymentApi, type CoopBalanceResponse } from '../../payments/api/payment-api';

export const CoopAccountBalanceCard: React.FC = () => {
    const [balance, setBalance] = useState<CoopBalanceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Formatter for Kenyan Shillings
    const fmt = (val: number | undefined) => {
        if (val === undefined) return '0.00';
        return new Intl.NumberFormat('en-KE', { minimumFractionDigits: 2 }).format(val);
    };

    const fetchBalance = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const data = await paymentApi.getCoopBalance();
            setBalance(data);
            setLastUpdated(new Date());
        } catch (err: unknown) { // Change 'any' to 'unknown'
            console.error("Failed to fetch balance:", err);

            // Type-guard to safely extract the message
            const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
                || 'Failed to connect to bank.';

            setError(message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [balance]);

    // Initial load and 5-minute polling interval
    useEffect(() => {
        // Initial fetch
        fetchBalance();

        // Setup interval to fetch every 5 minutes (300,000 ms)
        const intervalId = setInterval(() => {
            fetchBalance(false);
        }, 300000);

        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, []); // Empty dependency array prevents the cascading render linting error!

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-5 shadow-lg flex flex-col justify-between h-full relative overflow-hidden text-white">

            {/* Header */}
            <div className="flex items-start justify-between relative z-10 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Building2 size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Co-op Bank Balance</h3>
                        <p className="text-xs text-slate-400">Main Sacco Account</p>
                    </div>
                </div>

                <button
                    onClick={() => fetchBalance(true)}
                    disabled={loading || refreshing}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh Balance"
                >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Content Body */}
            <div className="relative z-10 flex-1 flex flex-col justify-end">
                {error ? (
                    <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm">
                        <AlertCircle size={16} className="shrink-0" />
                        <p>{error}</p>
                    </div>
                ) : loading && !balance ? (
                    <div className="animate-pulse space-y-3">
                        <div className="h-8 bg-white/10 rounded w-1/2"></div>
                        <div className="h-4 bg-white/10 rounded w-1/3"></div>
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            <p className="text-emerald-400/80 text-xs font-medium mb-1 uppercase tracking-wider">Available Balance</p>
                            <p className="text-3xl font-bold tracking-tight text-white">
                                KES {fmt(balance?.AvailableBalance)}
                            </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-700/50 pt-3">
                            <div>
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">Booked Balance</p>
                                <p className="text-sm font-semibold text-slate-200">KES {fmt(balance?.BookedBalance)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">Last updated</p>
                                <p className="text-xs text-slate-300">
                                    {lastUpdated ? lastUpdated.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Background Decoration */}
            <div className="absolute -bottom-6 -right-6 text-emerald-500/5 rotate-12 pointer-events-none">
                <Building2 size={120} />
            </div>
        </div>
    );
};