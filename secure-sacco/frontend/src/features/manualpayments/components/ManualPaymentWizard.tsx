import React, { useEffect, useState } from 'react';
import {
    Search, User, PiggyBank, AlertCircle, Coins, Package,
    Loader2, CheckCircle2, ArrowLeft, ArrowRight, X, RefreshCw, Banknote, ArrowDownToLine,
} from 'lucide-react';
import { memberApi } from '../../members/api/member-api';
import type { Member } from '../../members/api/member-api';
import { manualPaymentsApi } from '../api/manual-payments-api';
import type {
    ManualPaymentContext, ManualPaymentType, ManualPaymentResponse, FundingSource,
} from '../api/manual-payments-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

type Step = 'member' | 'type' | 'detail' | 'form' | 'success';

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const TYPE_CARDS: { type: ManualPaymentType; label: string; icon: React.ReactNode; color: string }[] = [
    { type: 'SAVINGS', label: 'Savings Deposit', icon: <PiggyBank size={20} />, color: 'from-emerald-500 to-emerald-600' },
    { type: 'PENALTY', label: 'Penalty Payment', icon: <AlertCircle size={20} />, color: 'from-red-500 to-red-600' },
    { type: 'LOAN', label: 'Loan Repayment', icon: <Coins size={20} />, color: 'from-blue-500 to-blue-600' },
    { type: 'CUSTOM', label: 'Custom Product', icon: <Package size={20} />, color: 'from-purple-500 to-purple-600' },
];

export const ManualPaymentWizard: React.FC = () => {
    const [step, setStep] = useState<Step>('member');

    // Step 1: member
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Member[]>([]);
    const [searching, setSearching] = useState(false);
    const [member, setMember] = useState<Member | null>(null);
    const [context, setContext] = useState<ManualPaymentContext | null>(null);

    // Step 2: type
    const [paymentType, setPaymentType] = useState<ManualPaymentType | null>(null);

    // Step 3: detail (penalty/custom selection)
    const [targetPenaltyId, setTargetPenaltyId] = useState<string>('');
    const [payAll, setPayAll] = useState(false);
    const [customProductId, setCustomProductId] = useState<string>('');

    // Step 4: form
    const [amount, setAmount] = useState('');
    const [fundingSource, setFundingSource] = useState<FundingSource>('CASH');
    const [externalReference, setExternalReference] = useState('');
    const [notes, setNotes] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<ManualPaymentResponse | null>(null);

    useEffect(() => {
        if (search.trim().length < 2) { setResults([]); return; }
        const handle = setTimeout(async () => {
            setSearching(true);
            try {
                const page = await memberApi.getMembers(search.trim(), 'ACTIVE', 0, 8);
                setResults(page.content);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(handle);
    }, [search]);

    const selectMember = async (m: Member) => {
        setMember(m);
        setError('');
        setLoading(true);
        try {
            const ctx = await manualPaymentsApi.getContext(m.id);
            setContext(ctx);
            setStep('type');
        } catch (e) {
            setError(getApiErrorMessage(e, 'Could not load payment options for this member.'));
        } finally {
            setLoading(false);
        }
    };

    const selectType = (type: ManualPaymentType) => {
        setPaymentType(type);
        setTargetPenaltyId('');
        setPayAll(false);
        setCustomProductId('');
        setAmount('');
        setFundingSource('CASH');
        setExternalReference('');
        setNotes('');
        setError('');

        if (type === 'PENALTY' || type === 'CUSTOM') {
            setStep('detail');
        } else {
            setStep('form');
        }
    };

    const proceedFromDetail = () => {
        if (paymentType === 'PENALTY' && !payAll && !targetPenaltyId) {
            setError('Select a specific penalty, or choose "Pay all open penalties".');
            return;
        }
        if (paymentType === 'CUSTOM' && !customProductId) {
            setError('Select a custom product.');
            return;
        }
        setError('');
        setStep('form');
    };

    const submit = async () => {
        if (!member || !paymentType) return;
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) { setError('Enter a valid amount.'); return; }
        if (fundingSource === 'SAVINGS_TRANSFER' && context && amt > context.savingsBalance) {
            setError(`This member only has KES ${fmt(context.savingsBalance)} in savings — can't transfer more than that.`);
            return;
        }

        setError('');
        setLoading(true);
        try {
            const res = await manualPaymentsApi.recordPayment({
                memberId: member.id,
                paymentType,
                fundingSource: paymentType === 'SAVINGS' ? 'CASH' : fundingSource,
                targetPenaltyId: paymentType === 'PENALTY' && !payAll ? targetPenaltyId : null,
                payAllPenalties: paymentType === 'PENALTY' ? payAll : undefined,
                customProductId: paymentType === 'CUSTOM' ? customProductId : null,
                amount: amt,
                channel: 'CASH',
                externalReference: externalReference || undefined,
                notes: notes || undefined,
            });
            setResult(res);
            setStep('success');
        } catch (e) {
            setError(getApiErrorMessage(e, 'Could not record this payment.'));
        } finally {
            setLoading(false);
        }
    };

    const recordAnotherForSameMember = () => {
        setPaymentType(null);
        setResult(null);
        setError('');
        setStep('type');
    };

    const startOver = () => {
        setMember(null);
        setContext(null);
        setPaymentType(null);
        setResult(null);
        setError('');
        setSearch('');
        setResults([]);
        setStep('member');
    };

    const backFrom = () => {
        setError('');
        if (step === 'type') startOver();
        else if (step === 'detail') setStep('type');
        else if (step === 'form') setStep(paymentType === 'PENALTY' || paymentType === 'CUSTOM' ? 'detail' : 'type');
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-6">
                {step !== 'member' && step !== 'success' && (
                    <button onClick={backFrom} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                        <ArrowLeft size={18} />
                    </button>
                )}
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Record Manual Payment</h1>
                    <p className="text-sm text-slate-500">For cash, cheque, or other payments received in person.</p>
                </div>
            </div>

            {/* Member chip, shown once selected */}
            {member && step !== 'member' && (
                <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="p-2 rounded-lg bg-slate-700 text-white">
                        <User size={16} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">{member.firstName} {member.lastName}</p>
                        <p className="text-xs text-slate-400">{member.memberNumber}</p>
                    </div>
                    {step !== 'success' && (
                        <button onClick={startOver} className="ml-auto text-xs text-slate-400 hover:text-slate-600">
                            Change
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* ── Step 1: Member ── */}
            {step === 'member' && (
                <div className="space-y-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or member number…"
                            className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 text-sm"
                        />
                        {searching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                    </div>

                    {results.length > 0 && (
                        <div className="space-y-1.5">
                            {results.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => selectMember(m)}
                                    disabled={loading}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left disabled:opacity-60"
                                >
                                    <div className="p-2 rounded-lg bg-slate-100 text-slate-500">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{m.firstName} {m.lastName}</p>
                                        <p className="text-xs text-slate-400">{m.memberNumber}</p>
                                    </div>
                                    {loading && <Loader2 size={16} className="ml-auto animate-spin text-slate-400" />}
                                </button>
                            ))}
                        </div>
                    )}

                    {search.trim().length >= 2 && !searching && results.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-6">No active members found matching "{search}".</p>
                    )}
                </div>
            )}

            {/* ── Step 2: Type ── */}
            {step === 'type' && context && (
                <div className="grid grid-cols-2 gap-3">
                    {TYPE_CARDS.map(card => {
                        const disabled =
                            (card.type === 'PENALTY' && context.openPenalties.length === 0) ||
                            (card.type === 'LOAN' && !context.hasActiveLoan) ||
                            (card.type === 'CUSTOM' && context.customProducts.length === 0);
                        return (
                            <button
                                key={card.type}
                                onClick={() => !disabled && selectType(card.type)}
                                disabled={disabled}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    disabled
                                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                                        : 'border-slate-200 hover:shadow-md cursor-pointer'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} text-white inline-flex`}>
                                    {card.icon}
                                </div>
                                <p className="text-sm font-semibold text-slate-800 mt-3">{card.label}</p>
                                {disabled && (
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {card.type === 'PENALTY' && 'No open penalties'}
                                        {card.type === 'LOAN' && 'No active loan'}
                                        {card.type === 'CUSTOM' && 'No active products'}
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Step 3: Detail (Penalty or Custom selection) ── */}
            {step === 'detail' && context && paymentType === 'PENALTY' && (
                <div className="space-y-3">
                    <button
                        onClick={() => { setPayAll(true); setTargetPenaltyId(''); }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left ${
                            payAll ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <span className="text-sm font-semibold text-slate-800">Pay all open penalties</span>
                        <span className="text-sm font-bold text-slate-700">
                            KES {fmt(context.openPenalties.reduce((s, p) => s + p.outstandingAmount, 0))}
                        </span>
                    </button>

                    <p className="text-xs text-slate-400 px-1">— or pick one specifically —</p>

                    {context.openPenalties.map(p => (
                        <button
                            key={p.penaltyId}
                            onClick={() => { setPayAll(false); setTargetPenaltyId(p.penaltyId); }}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left ${
                                !payAll && targetPenaltyId === p.penaltyId ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <span className="text-sm font-medium text-slate-700">{p.ruleName}</span>
                            <span className="text-sm font-semibold text-slate-600">KES {fmt(p.outstandingAmount)}</span>
                        </button>
                    ))}

                    <button
                        onClick={proceedFromDetail}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl mt-2"
                    >
                        Continue <ArrowRight size={16} />
                    </button>
                </div>
            )}

            {step === 'detail' && context && paymentType === 'CUSTOM' && (
                <div className="space-y-3">
                    {context.customProducts.map(p => (
                        <button
                            key={p.productId}
                            onClick={() => setCustomProductId(p.productId)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left ${
                                customProductId === p.productId ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <span className="text-sm font-medium text-slate-700">{p.name}</span>
                            <span className="text-xs font-mono text-slate-400">{p.code}</span>
                        </button>
                    ))}

                    <button
                        onClick={proceedFromDetail}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl mt-2"
                    >
                        Continue <ArrowRight size={16} />
                    </button>
                </div>
            )}

            {/* ── Step 4: Form ── */}
            {step === 'form' && (
                <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-slate-50 text-sm text-slate-600">
                        Recording: <span className="font-semibold">
                            {paymentType === 'SAVINGS' && 'Savings Deposit'}
                            {paymentType === 'LOAN' && 'Loan Repayment'}
                            {paymentType === 'PENALTY' && (payAll ? 'All open penalties' : context?.openPenalties.find(p => p.penaltyId === targetPenaltyId)?.ruleName)}
                            {paymentType === 'CUSTOM' && context?.customProducts.find(p => p.productId === customProductId)?.name}
                        </span>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-600">Amount (KES)</label>
                        <input
                            type="number"
                            autoFocus
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="e.g. 1000"
                            className="mt-1.5 w-full text-2xl font-bold p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                    </div>

                    {paymentType !== 'SAVINGS' && (
                        <div>
                            <label className="text-sm font-medium text-slate-600">Where is this money coming from?</label>
                            <div className="mt-1.5 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFundingSource('CASH')}
                                    className={`flex items-center gap-2 p-3 rounded-xl border text-left ${
                                        fundingSource === 'CASH' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <Banknote size={16} className={fundingSource === 'CASH' ? 'text-emerald-600' : 'text-slate-400'} />
                                    <span className="text-sm font-medium text-slate-700">Cash Received</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFundingSource('SAVINGS_TRANSFER')}
                                    className={`flex items-center gap-2 p-3 rounded-xl border text-left ${
                                        fundingSource === 'SAVINGS_TRANSFER' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <ArrowDownToLine size={16} className={fundingSource === 'SAVINGS_TRANSFER' ? 'text-emerald-600' : 'text-slate-400'} />
                                    <span className="text-sm font-medium text-slate-700">From Savings</span>
                                </button>
                            </div>
                            {fundingSource === 'SAVINGS_TRANSFER' && context && (
                                <p className="text-xs text-slate-400 mt-1.5">
                                    Member's savings balance: KES {fmt(context.savingsBalance)} — this amount will be withdrawn from savings and applied here instead of being collected as new cash.
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium text-slate-600">Receipt / Reference Number (optional)</label>
                        <input
                            type="text"
                            value={externalReference}
                            onChange={e => setExternalReference(e.target.value)}
                            placeholder="e.g. cash receipt number"
                            className="mt-1.5 w-full p-2.5 rounded-lg border border-slate-200 text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-600">Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            className="mt-1.5 w-full p-2.5 rounded-lg border border-slate-200 text-sm resize-none"
                        />
                    </div>

                    <button
                        onClick={submit}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-60"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Post Payment'}
                    </button>
                </div>
            )}

            {/* ── Step 5: Success ── */}
            {step === 'success' && result && (
                <div className="text-center py-6 space-y-3">
                    <CheckCircle2 size={48} className="text-emerald-600 mx-auto" />
                    <h3 className="text-lg font-bold text-slate-800">Payment Recorded</h3>
                    <p className="text-sm text-slate-500">
                        KES {fmt(result.amountPosted)} posted to <span className="font-semibold">{result.targetDescription}</span>
                    </p>
                    {result.remainingBalance !== null && (
                        <p className="text-xs text-slate-400">Remaining balance: KES {fmt(result.remainingBalance)}</p>
                    )}
                    <p className="text-xs text-slate-400 font-mono">Ref: {result.reference}</p>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={recordAnotherForSameMember}
                            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl"
                        >
                            <RefreshCw size={16} /> Another for {member?.firstName}
                        </button>
                        <button
                            onClick={startOver}
                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl"
                        >
                            <X size={16} /> Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManualPaymentWizard;