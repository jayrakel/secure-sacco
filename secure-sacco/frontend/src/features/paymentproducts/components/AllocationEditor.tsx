import React, { useMemo } from 'react';
import type { ProductAllocationContext } from '../api/payment-products-api';

export interface SplitLine {
    productId: string;
    amount: number;
}

interface Props {
    totalAmount: number;
    products: ProductAllocationContext[];
    lines: SplitLine[];
    onChange: (lines: SplitLine[]) => void;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const GoalProgress: React.FC<{ paid: number; required: number }> = ({ paid, required }) => {
    const pct = required > 0 ? Math.min(100, (paid / required) * 100) : 0;
    return (
        <div className="mt-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Paid KES {fmt(paid)} of KES {fmt(required)}</span>
                <span>{pct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

export const AllocationEditor: React.FC<Props> = ({ totalAmount, products, lines, onChange }) => {
    const totalAllocated = useMemo(() => lines.reduce((s, l) => s + (l.amount || 0), 0), [lines]);
    const remaining = Math.round((totalAmount - totalAllocated) * 100) / 100;

    const updateLine = (productId: string, rawAmount: number, cap?: number | null) => {
        let value = Math.max(0, rawAmount || 0);
        if (cap != null) value = Math.min(value, cap);
        value = Math.min(value, totalAmount);
        onChange(lines.map(l => l.productId === productId ? { ...l, amount: value } : l));
    };

    const fillRemaining = (productId: string, cap?: number | null) => {
        const current = lines.find(l => l.productId === productId)?.amount ?? 0;
        const available = remaining + current;
        const fillAmount = cap != null ? Math.min(available, cap) : available;
        updateLine(productId, Math.max(0, Math.round(fillAmount * 100) / 100), cap);
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-500">
                Decide how much of <span className="font-semibold text-slate-700">KES {fmt(totalAmount)}</span> goes to each account.
            </p>

            <div className="space-y-3">
                {products.map(p => {
                    const line = lines.find(l => l.productId === p.productId);
                    const val = line?.amount ?? 0;
                    const cap = p.isCapped ? (p.outstandingAmount ?? 0) : null;
                    const hasGoal = p.requiredAmount != null && p.paidAmount != null;

                    return (
                        <div key={p.productId} className="p-3 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-sm text-slate-800">{p.productName}</span>
                                {!hasGoal && cap != null && (
                                    <span className="text-xs text-slate-400">
                                        Outstanding: KES {fmt(cap)}
                                    </span>
                                )}
                            </div>

                            {hasGoal && (
                                <GoalProgress paid={p.paidAmount as number} required={p.requiredAmount as number} />
                            )}

                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm text-slate-400 shrink-0">KES</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={cap ?? totalAmount}
                                    value={val === 0 ? '' : val}
                                    placeholder="0"
                                    onChange={e => updateLine(p.productId, parseFloat(e.target.value), cap)}
                                    className="flex-1 p-2.5 rounded-lg border border-slate-200 text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                />
                                <button
                                    type="button"
                                    onClick={() => fillRemaining(p.productId, cap)}
                                    disabled={remaining <= 0 && val === 0}
                                    className="shrink-0 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Rest
                                </button>
                            </div>

                            {hasGoal && cap != null && (
                                <p className="text-xs text-slate-400 mt-1.5">
                                    Remaining to reach goal: KES {fmt(cap)}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className={`flex items-center justify-between p-3 rounded-xl text-sm font-semibold ${
                Math.abs(remaining) < 0.01
                    ? 'bg-emerald-50 text-emerald-700'
                    : remaining > 0
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
            }`}>
                <span>{Math.abs(remaining) < 0.01 ? 'Fully allocated' : remaining > 0 ? 'Remaining to allocate' : 'Over-allocated by'}</span>
                <span>KES {fmt(Math.abs(remaining))}</span>
            </div>
        </div>
    );
};
