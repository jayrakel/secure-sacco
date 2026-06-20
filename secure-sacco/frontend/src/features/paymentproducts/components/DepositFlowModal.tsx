import React, { useEffect, useMemo, useState } from 'react';
import {
    X, Smartphone, Building2, Banknote, FileText,
    ChevronRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Lock
} from 'lucide-react';
import {
    splitDepositApi
} from '../api/payment-products-api';
import type {
    ProductAllocationContext
} from '../api/payment-products-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

type Step = 'method' | 'amount' | 'allocate' | 'phone' | 'success';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    defaultPhone?: string;
    onCompleted?: () => void;
}

interface SplitLine {
    productId: string;
    percentage: number; // 0-100
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

export const DepositFlowModal: React.FC<Props> = ({ isOpen, onClose, defaultPhone, onCompleted }) => {
    const [step, setStep]               = useState<Step>('method');
    const [amount, setAmount]           = useState('');
    const [phone, setPhone]             = useState(defaultPhone ?? '');
    const [products, setProducts]       = useState<ProductAllocationContext[]>([]);
    const [lines, setLines]             = useState<SplitLine[]>([]);
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setStep('method');
            setAmount('');
            setError(null);
        }
    }, [isOpen]);

    const totalAmount = parseFloat(amount) || 0;
    const totalPct = useMemo(() => lines.reduce((s, l) => s + (l.percentage || 0), 0), [lines]);
    const remainingPct = 100 - totalPct;

    if (!isOpen) return null;

    const goToAllocation = async () => {
        if (totalAmount <= 0) { setError('Enter a valid amount'); return; }
        setError(null);
        setLoading(true);
        try {
            const ctx = await splitDepositApi.getContext();
            setProducts(ctx);
            setLines(ctx.map(p => ({ productId: p.productId, percentage: 0 })));
            setStep('allocate');
        } catch {
            setError('Could not load deposit options. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const updateLine = (productId: string, pct: number) => {
        setLines(prev => prev.map(l => l.productId === productId ? { ...l, percentage: pct } : l));
    };

    const goToPhone = async () => {
        setError(null);
        const active = lines.filter(l => l.percentage > 0);
        if (active.length === 0) { setError('Allocate at least one product'); return; }
        if (Math.abs(totalPct - 100) > 0.01) { setError(`Allocations must total 100% — currently ${totalPct.toFixed(1)}%`); return; }

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
            const active = lines.filter(l => l.percentage > 0);
            await splitDepositApi.initiate(totalAmount, phone, active);
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

                    {/* ── Step 3: Allocation split ── */}
                    {step === 'allocate' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">
                                Split <span className="font-semibold text-slate-700">KES {fmt(totalAmount)}</span> across your accounts.
                            </p>

                            <div className="space-y-3">
                                {products.map(p => {
                                    const line = lines.find(l => l.productId === p.productId);
                                    const pct = line?.percentage ?? 0;
                                    const lineAmount = (totalAmount * pct) / 100;
                                    return (
                                        <div key={p.productId} className="p-3 rounded-xl border border-slate-200">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="font-semibold text-sm text-slate-800">{p.productName}</span>
                                                <span className="text-sm font-bold text-emerald-700">KES {fmt(lineAmount)}</span>
                                            </div>
                                            {p.isCapped && (
                                                <p className="text-xs text-slate-400 mb-2">
                                                    Outstanding: KES {fmt(p.outstandingAmount ?? 0)}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range" min={0} max={100} step={1}
                                                    value={pct}
                                                    onChange={e => updateLine(p.productId, parseFloat(e.target.value))}
                                                    className="flex-1 accent-emerald-600"
                                                />
                                                <input
                                                    type="number" min={0} max={100}
                                                    value={pct}
                                                    onChange={e => updateLine(p.productId, Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                                    className="w-16 text-sm text-right p-1.5 rounded-lg border border-slate-200"
                                                />
                                                <span className="text-sm text-slate-400">%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className={`flex items-center justify-between p-3 rounded-xl text-sm font-semibold ${
                                Math.abs(remainingPct) < 0.01 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                                <span>Remaining to allocate</span>
                                <span>{remainingPct.toFixed(1)}%</span>
                            </div>

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
                                {lines.filter(l => l.percentage > 0).map(l => (
                                    <div key={l.productId} className="flex justify-between text-sm">
                                        <span className="text-slate-500">{productName(l.productId)} ({l.percentage}%)</span>
                                        <span className="font-medium text-slate-700">KES {fmt((totalAmount * l.percentage) / 100)}</span>
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

                    {/* ── Step 5: Success ── */}
                    {step === 'success' && (
                        <div className="text-center py-6 space-y-3">
                            <CheckCircle2 size={48} className="text-emerald-600 mx-auto" />
                            <h3 className="text-lg font-bold text-slate-800">STK Push Sent</h3>
                            <p className="text-sm text-slate-500">
                                Enter your M-Pesa PIN on your phone to complete the payment. Your contribution will be split automatically once confirmed.
                            </p>
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