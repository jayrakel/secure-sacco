import React, { useState } from 'react';
import {
    X, Smartphone, Building2, Banknote, Copy, Check,
    ChevronRight, ArrowLeft, Info
} from 'lucide-react';

// ─── SACCO payment constants ────────────────────────────────────────────────
// These should eventually come from SACCO settings API.
const MPESA_PAYBILL   = '1051322';
const COOP_ACCOUNT_NO = '01148381964600';
const COOP_BANK_NAME  = 'Co-operative Bank of Kenya';
const SACCO_NAME      = 'Better Link Ventures SACCO';

// ─── Types ───────────────────────────────────────────────────────────────────
type Method = 'picker' | 'mpesa_stk' | 'mpesa_paybill' | 'bank_transfer' | 'cash';

interface Props {
    isOpen:       boolean;
    onClose:      () => void;
    memberNumber: string;
    memberName:   string;
    onStkPush:    () => void;   // Opens the existing MpesaDepositModal
}

// ─── Small copy button ────────────────────────────────────────────────────────
const CopyButton: React.FC<{ value: string }> = ({ value }) => {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={copy}
            className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="Copy">
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        </button>
    );
};

// ─── One detail row ──────────────────────────────────────────────────────────
const DetailRow: React.FC<{ label: string; value: string; highlight?: boolean; copyable?: boolean }> = ({
    label, value, highlight, copyable = true
}) => (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
        <span className="text-sm text-slate-500 shrink-0">{label}</span>
        <div className="flex items-center gap-1">
            <span className={`text-sm font-mono font-semibold text-right ${highlight ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded' : 'text-slate-800'}`}>
                {value}
            </span>
            {copyable && <CopyButton value={value} />}
        </div>
    </div>
);

// ─── Main modal ──────────────────────────────────────────────────────────────
export const DepositOptionsModal: React.FC<Props> = ({
    isOpen, onClose, memberNumber, memberName, onStkPush
}) => {
    const [view, setView] = useState<Method>('picker');

    if (!isOpen) return null;

    const back = () => setView('picker');

    const header = (title: string, icon: React.ReactNode) => (
        <div className="p-4 border-b flex items-center gap-3 bg-white sticky top-0">
            {view !== 'picker' && (
                <button onClick={back} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <ArrowLeft size={20} />
                </button>
            )}
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
                {icon}
                {title}
            </div>
            <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-700">
                <X size={20} />
            </button>
        </div>
    );

    const warningBox = (msg: string) => (
        <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>{msg}</span>
        </div>
    );

    // ── Method picker ──────────────────────────────────────────────────────
    if (view === 'picker') {
        const methods = [
            {
                id:    'mpesa_stk' as Method,
                icon:  <Smartphone size={22} className="text-green-600" />,
                bg:    'bg-green-50',
                title: 'M-Pesa STK Push',
                desc:  'Get a payment prompt on your phone instantly',
                badge: 'Fastest',
                badgeColor: 'bg-green-100 text-green-700',
            },
            {
                id:    'mpesa_paybill' as Method,
                icon:  <Smartphone size={22} className="text-blue-600" />,
                bg:    'bg-blue-50',
                title: 'M-Pesa Paybill',
                desc:  'Pay via M-Pesa menu using our paybill number',
            },
            {
                id:    'bank_transfer' as Method,
                icon:  <Building2 size={22} className="text-purple-600" />,
                bg:    'bg-purple-50',
                title: 'Bank Transfer',
                desc:  'Equity, KCB, NCBA, Co-op or any Kenyan bank',
                badge: 'EFT / PESALINK',
                badgeColor: 'bg-purple-100 text-purple-700',
            },
            {
                id:    'cash' as Method,
                icon:  <Banknote size={22} className="text-amber-600" />,
                bg:    'bg-amber-50',
                title: 'Cash / Cheque',
                desc:  'Visit our SACCO office to make a payment',
            },
        ];

        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                    {header('Deposit to Savings', <Banknote size={18} className="text-emerald-600" />)}

                    <div className="p-4">
                        <p className="text-sm text-slate-500 mb-4">
                            Hi <span className="font-medium text-slate-700">{memberName}</span>, how would you like to deposit?
                        </p>

                        <div className="space-y-2">
                            {methods.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => {
                                        if (m.id === 'mpesa_stk') {
                                            onClose();
                                            onStkPush();
                                        } else {
                                            setView(m.id);
                                        }
                                    }}
                                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-left group"
                                >
                                    <div className={`w-10 h-10 rounded-lg ${m.bg} flex items-center justify-center shrink-0`}>
                                        {m.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-semibold text-slate-800">{m.title}</span>
                                            {m.badge && (
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.badgeColor}`}>
                                                    {m.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── M-Pesa Paybill instructions ────────────────────────────────────────
    if (view === 'mpesa_paybill') {
        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                    {header('M-Pesa Paybill', <Smartphone size={18} className="text-blue-600" />)}
                    <div className="p-5 space-y-4">

                        <div className="space-y-1 text-xs text-slate-500 font-medium uppercase tracking-wide">
                            Steps
                        </div>
                        <ol className="space-y-2 text-sm text-slate-700">
                            {[
                                'Open M-Pesa on your phone',
                                'Select Lipa na M-Pesa → Paybill',
                                'Enter Business Number below',
                                'Enter Account Number below',
                                'Enter amount and M-Pesa PIN',
                            ].map((step, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                        {i + 1}
                                    </span>
                                    {step}
                                </li>
                            ))}
                        </ol>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-0">
                            <DetailRow label="Business No."  value={MPESA_PAYBILL}   highlight />
                            <DetailRow label="Account No."  value={memberNumber}     highlight />
                            <DetailRow label="SACCO Name"   value={SACCO_NAME}       copyable={false} />
                        </div>

                        {warningBox(`Use "${memberNumber}" as the account number — this is how we link the payment to your account. Using any other reference may cause a delay.`)}
                    </div>
                </div>
            </div>
        );
    }

    // ── Bank transfer instructions ─────────────────────────────────────────
    if (view === 'bank_transfer') {
        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                    {header('Bank Transfer', <Building2 size={18} className="text-purple-600" />)}
                    <div className="p-5 space-y-4">

                        <p className="text-sm text-slate-600">
                            Transfer from <span className="font-medium">any Kenyan bank</span> — Equity, KCB, NCBA, Absa, Standard Chartered, or any other.
                            Works via EFT or PESALINK.
                        </p>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-0">
                            <DetailRow label="Account No."   value={COOP_ACCOUNT_NO}  highlight />
                            <DetailRow label="Bank"          value={COOP_BANK_NAME}    copyable={false} />
                            <DetailRow label="Account Name"  value={SACCO_NAME}        copyable={false} />
                            <DetailRow label="Reference"     value={memberNumber}      highlight />
                        </div>

                        {warningBox(`You MUST use "${memberNumber}" as the payment reference or narration. This is the only way we can identify your payment. If you use your name or leave it blank, your deposit will be delayed until manually processed.`)}

                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
                            <p className="font-semibold mb-1">Processing time</p>
                            <p>EFT transfers typically reflect within <span className="font-bold">30 minutes</span> during business hours. PESALINK is instant. Your balance will update automatically once we receive the funds.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Cash / Cheque ─────────────────────────────────────────────────────
    if (view === 'cash') {
        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                    {header('Cash or Cheque', <Banknote size={18} className="text-amber-600" />)}
                    <div className="p-5 space-y-4">

                        <p className="text-sm text-slate-600">
                            Visit the SACCO office during business hours and speak to the treasurer.
                            Bring your member ID or quote your member number.
                        </p>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <DetailRow label="Member No."  value={memberNumber}  highlight />
                            <DetailRow label="Member Name" value={memberName}    copyable={false} />
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1.5">
                            <p className="font-semibold">For cheques</p>
                            <p>Make payable to <span className="font-bold">{SACCO_NAME}</span>. Write your member number on the back. Cheques take 3 business days to clear before your savings balance is updated.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};