import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    X, Smartphone, Building2, Banknote, FileText,
    ChevronRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Lock, Clock, XCircle
} from 'lucide-react';
import {
    splitDepositApi
} from '../api/payment-products-api';
import type {
    ProductAllocationContext, SplitDepositHistoryItem
} from '../api/payment-products-api';
import { AllocationEditor, type SplitLine } from './AllocationEditor';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

type Step = 'method' | 'amount' | 'allocate' | 'phone' | 'success';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    defaultPhone?: string;
    onCompleted?: () => void;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

// ─── Method picker ─────────────────────────────────────────────────────────
const MethodOption: React.FC<{
    icon: React.ReactNode; label: string; sub: string; active?: boolean; onClick?: () => void;
}> = ({ icon, label, sub, active, onClick }) => (
    <button
        onClick={onClick}
        disabled={!active}
        className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
            active
                ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 cursor-pointer'
                : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'
        }`}
    >
        <div className={`p-2 rounded-lg ${active ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
            {icon}
        </div>
        <div className="flex-1">
            <div className="flex items-center gap-2">
                <span className={`font-semibold text-sm ${active ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
                {!active && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                        Coming Soon
                    </span>
                )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
        </div>
        {active ? <ChevronRight size={18} className="text-emerald-600" /> : <Lock size={14} className="text-slate-300" />}
    </button>
);

// Removed GoalProgress since it's now in AllocationEditor

export const DepositFlowModal: React.FC<Props> = ({ isOpen, onClose, defaultPhone, onCompleted }) => {
    const [step, setStep]               = useState<Step>('method');
    const [amount, setAmount]           = useState('');
    const [phone, setPhone]             = useState(defaultPhone ?? '');
    const [products, setProducts]       = useState<ProductAllocationContext[]>([]);
    const [lines, setLines]             = useState<SplitLine[]>([]);
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState<string | null>(null);

    // SAC-262: live status tracking for the just-initiated split deposit — without this,
    // members saw nothing after sending an STK push regardless of the outcome.
    const [trackingRef, setTrackingRef] = useState<string | null>(null);
    const [liveStatus, setLiveStatus]   = useState<SplitDepositHistoryItem | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isOpen) {
            setStep('method');
            setAmount('');
            setError(null);
            setTrackingRef(null);
            setLiveStatus(null);
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [isOpen]);

    const totalAmount = parseFloat(amount) || 0;
    const totalAllocated = useMemo(() => lines.reduce((s, l) => s + (l.amount || 0), 0), [lines]);
    const remaining = Math.round((totalAmount - totalAllocated) * 100) / 100;

    // SAC-262: poll the real Co-op-confirmed status every 5s once an STK push has been
    // sent, so the member actually sees PENDING → COMPLETED/FAILED (and why, on failure)
    // instead of silence. Stops once a terminal status arrives, or after ~11 minutes
    // (slightly past the backend's own 10-minute expiry window).
    useEffect(() => {
        if (!trackingRef) return;

        let elapsedMs = 0;
        const intervalMs = 5000;
        const maxMs = 11 * 60 * 1000;

        const poll = async () => {
            try {
                const recent = await splitDepositApi.getMyRecent();
                const match = recent.find(r => r.accountReference === trackingRef);
                if (match) {
                    setLiveStatus(match);
                    if (match.status !== 'PENDING' && pollRef.current) {
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                    }
                }
            } catch {
                // transient — keep polling, next tick will retry
            }
            elapsedMs += intervalMs;
            if (elapsedMs >= maxMs && pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };

        poll(); // immediate first check
        pollRef.current = setInterval(poll, intervalMs);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [trackingRef]);

    if (!isOpen) return null;

    // Converts the member's typed KES amounts into the percentage format the API expects.
    const toAllocationLines = () =>
        lines
            .filter(l => l.amount > 0)
            .map(l => ({
                productId: l.productId,
                percentage: Math.round((l.amount / totalAmount) * 10000) / 100, // 2 dp
            }));

    const goToAllocation = async () => {
        if (totalAmount <= 0) { setError('Enter a valid amount'); return; }
        setError(null);
        setLoading(true);
        try {
            const ctx = await splitDepositApi.getContext();
            setProducts(ctx);
            setLines(ctx.map(p => ({ productId: p.productId, amount: 0 })));
            setStep('allocate');
        } catch {
            setError('Could not load deposit options. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const goToPhone = async () => {
        setError(null);
        const active = toAllocationLines();
        if (active.length === 0) { setError('Enter an amount for at least one product'); return; }
        if (Math.abs(remaining) > 0.01) {
            setError(
                remaining > 0
                    ? `KES ${fmt(remaining)} is still unallocated — assign it to a product above`
                    : `You've allocated KES ${fmt(Math.abs(remaining))} more than your deposit amount`
            );
            return;
        }

        setLoading(true);
        try {
            const res = await splitDepositApi.validate(totalAmount, active);
            if (!res.valid) {
                setError(res.errorMessage ?? 'Allocation is invalid');
                return;
            }
            setStep('phone');
        } catch {
            setError('Could not validate allocation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const submitStk = async () => {
        if (!phone || phone.length < 9) { setError('Enter a valid M-Pesa phone number'); return; }
        setError(null);
        setLoading(true);
        try {
            const active = toAllocationLines();
            const res = await splitDepositApi.initiate(totalAmount, phone, active);
            // checkoutRequestID carries the SPLIT-xxx accountReference for this payment —
            // used to find this exact payment when polling /my-recent for its real status.
            setTrackingRef(res.checkoutRequestID);
            setStep('success');
            onCompleted?.();
        } catch (e) {
            setError(getApiErrorMessage(e, 'STK push failed. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const productName = (id: string) => products.find(p => p.productId === id)?.productName ?? '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        {step !== 'method' && step !== 'success' && (
                            <button
                                onClick={() => setStep(
                                    step === 'amount' ? 'method' : step === 'allocate' ? 'amount' : 'allocate'
                                )}
                                className="p-1 rounded-md hover:bg-slate-100 text-slate-500"
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <h2 className="text-lg font-bold text-slate-800">Deposit Money</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5">
                    {error && (
                        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* ── Step 1: Method picker ── */}
                    {step === 'method' && (
                        <div className="space-y-3">
                            <MethodOption
                                icon={<Smartphone size={18} />}
                                label="M-Pesa STK Push"
                                sub="Pay instantly from your phone"
                                active
                                onClick={() => setStep('amount')}
                            />
                            <MethodOption icon={<FileText size={18} />} label="M-Pesa Paybill" sub="Pay via Paybill 400200" />
                            <MethodOption icon={<Building2 size={18} />} label="Bank Transfer" sub="EFT / PesaLink / RTGS" />
                            <MethodOption icon={<Banknote size={18} />} label="Cash / Cheque" sub="Pay at the SACCO office" />
                        </div>
                    )}

                    {/* ── Step 2: Amount ── */}
                    {step === 'amount' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600">Amount (KES)</label>
                                <input
                                    type="number"
                                    autoFocus
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="e.g. 10000"
                                    className="mt-1.5 w-full text-2xl font-bold p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                />
                            </div>
                            <button
                                onClick={goToAllocation}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-60"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Continue'}
                            </button>
                        </div>
                    )}

                    {/* ── Step 3: Allocation — type the amount per product ── */}
                    {step === 'allocate' && (
                        <div className="space-y-4">
                            <AllocationEditor
                                totalAmount={totalAmount}
                                products={products}
                                lines={lines}
                                onChange={setLines}
                            />

                            <button
                                onClick={goToPhone}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-60"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Continue'}
                            </button>
                        </div>
                    )}

                    {/* ── Step 4: Phone / STK ── */}
                    {step === 'phone' && (
                        <div className="space-y-4">
                            <div className="p-3 rounded-xl bg-slate-50 space-y-1.5">
                                {lines.filter(l => l.amount > 0).map(l => (
                                    <div key={l.productId} className="flex justify-between text-sm">
                                        <span className="text-slate-500">{productName(l.productId)}</span>
                                        <span className="font-medium text-slate-700">KES {fmt(l.amount)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-slate-200">
                                    <span>Total</span>
                                    <span>KES {fmt(totalAmount)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-600">M-Pesa Phone Number</label>
                                <input
                                    type="tel"
                                    autoFocus
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="07XXXXXXXX"
                                    className="mt-1.5 w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                />
                            </div>

                            <button
                                onClick={submitStk}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-60"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send STK Push'}
                            </button>
                        </div>
                    )}

                    {/* ── Step 5: Success — now shows the real, live status ── */}
                    {step === 'success' && (
                        <div className="py-2 space-y-4">
                            {(!liveStatus || liveStatus.status === 'PENDING') && (
                                <div className="text-center py-4 space-y-3">
                                    <Clock size={48} className="text-amber-500 mx-auto" />
                                    <h3 className="text-lg font-bold text-slate-800">Waiting for Confirmation</h3>
                                    <p className="text-sm text-slate-500">
                                        Enter your M-Pesa PIN on your phone. We'll update this automatically once Co-op confirms the payment.
                                    </p>
                                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                                        <Loader2 size={14} className="animate-spin" />
                                        Checking status…
                                    </div>
                                </div>
                            )}

                            {liveStatus?.status === 'COMPLETED' && (
                                <div className="text-center py-4 space-y-3">
                                    <CheckCircle2 size={48} className="text-emerald-600 mx-auto" />
                                    <h3 className="text-lg font-bold text-slate-800">Payment Confirmed</h3>
                                    <p className="text-sm text-slate-500">KES {fmt(liveStatus.totalAmount)} received and routed:</p>
                                    <div className="text-left p-3 rounded-xl bg-slate-50 space-y-1.5 mt-2">
                                        {liveStatus.allocations.map((a, i) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span className="text-slate-500">{a.productName}</span>
                                                <span className={`font-medium ${a.status === 'ROUTED' ? 'text-emerald-700' : a.status === 'FAILED' ? 'text-red-600' : 'text-amber-600'}`}>
                                                    KES {fmt(a.amount)} · {a.status === 'ROUTED' ? 'Done' : a.status === 'FAILED' ? 'Failed' : 'Processing'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {liveStatus?.status === 'FAILED' && (
                                <div className="text-center py-4 space-y-3">
                                    <XCircle size={48} className="text-red-500 mx-auto" />
                                    <h3 className="text-lg font-bold text-slate-800">Payment Failed</h3>
                                    <p className="text-sm text-red-600 font-medium">
                                        {liveStatus.failureReason ?? 'The payment could not be completed.'}
                                    </p>
                                    <p className="text-sm text-slate-500">No money has been deducted. You can try again.</p>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};