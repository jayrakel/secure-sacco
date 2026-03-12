import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { obligationsApi, type ObligationFrequency, type ObligationResponse } from '../api/obligation-api';
import { memberApi, type Member } from '../../members/api/member-api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (obligation: ObligationResponse) => void;
    /** Pre-fill with a specific member (e.g. when opened from member detail) */
    prefilledMember?: Member;
}

interface FormState {
    frequency: ObligationFrequency;
    amountDue: string;
    startDate: string;
    graceDays: string;
}

const today = new Date().toISOString().split('T')[0];

export const CreateObligationModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, prefilledMember }) => {
    const [memberSearch, setMemberSearch]       = useState('');
    const [memberResults, setMemberResults]     = useState<Member[]>([]);
    const [selectedMember, setSelectedMember]   = useState<Member | null>(prefilledMember ?? null);
    const [searching, setSearching]             = useState(false);
    const [submitting, setSubmitting]           = useState(false);
    const [errors, setErrors]                   = useState<Record<string, string>>({});

    const [form, setForm] = useState<FormState>({
        frequency: 'WEEKLY',
        amountDue: '',
        startDate: today,
        graceDays: '0',
    });

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setSelectedMember(prefilledMember ?? null);
            setMemberSearch('');
            setMemberResults([]);
            setErrors({});
            setForm({ frequency: 'WEEKLY', amountDue: '', startDate: today, graceDays: '0' });
        }
    }, [isOpen, prefilledMember]);

    // Debounced member search
    const searchMembers = useCallback(async (q: string) => {
        if (!q || q.length < 2) { setMemberResults([]); return; }
        setSearching(true);
        try {
            const res = await memberApi.getMembers(q, 'ACTIVE', 0, 6);
            setMemberResults(res.content ?? []);
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => searchMembers(memberSearch), 300);
        return () => clearTimeout(t);
    }, [memberSearch, searchMembers]);

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!selectedMember) e.member = 'Please select a member';
        const amt = parseFloat(form.amountDue);
        if (!form.amountDue || isNaN(amt) || amt <= 0) e.amountDue = 'Enter a valid positive amount';
        if (!form.startDate) e.startDate = 'Start date is required';
        const gd = parseInt(form.graceDays, 10);
        if (isNaN(gd) || gd < 0) e.graceDays = 'Grace days must be ≥ 0';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || !selectedMember) return;
        setSubmitting(true);
        try {
            const result = await obligationsApi.createObligation({
                memberId:  selectedMember.id,
                frequency: form.frequency,
                amountDue: parseFloat(form.amountDue),
                startDate: form.startDate,
                graceDays: parseInt(form.graceDays, 10),
            });
            onSuccess(result);
            onClose();
        } catch (err: any) {
            setErrors({ submit: err?.response?.data?.message ?? 'Failed to create obligation. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const field = (key: keyof FormState, label: string, type = 'text', extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input
                type={type}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors[key] ? 'border-red-400' : 'border-slate-300'}`}
                {...extra}
            />
            {errors[key] && <p className="text-xs text-red-600 mt-1">{errors[key]}</p>}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-semibold text-slate-900">Create Savings Obligation</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Member picker */}
                    {!prefilledMember ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Member</label>
                            {selectedMember ? (
                                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                    <span className="text-sm font-medium text-emerald-800">
                                        {selectedMember.memberNumber} — {selectedMember.firstName} {selectedMember.lastName}
                                    </span>
                                    <button type="button" onClick={() => { setSelectedMember(null); setMemberSearch(''); }} className="text-emerald-500 hover:text-emerald-700 ml-2">
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="relative">
                                        <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or member number..."
                                            value={memberSearch}
                                            onChange={e => setMemberSearch(e.target.value)}
                                            className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.member ? 'border-red-400' : 'border-slate-300'}`}
                                        />
                                        {searching && <Loader2 size={14} className="absolute right-3 top-2.5 text-slate-400 animate-spin" />}
                                    </div>
                                    {memberResults.length > 0 && (
                                        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                                            {memberResults.map(m => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => { setSelectedMember(m); setMemberSearch(''); setMemberResults([]); }}
                                                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-emerald-50 border-b border-slate-100 last:border-0 flex justify-between"
                                                >
                                                    <span className="font-medium text-slate-700">{m.firstName} {m.lastName}</span>
                                                    <span className="text-slate-400 text-xs">{m.memberNumber}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {errors.member && <p className="text-xs text-red-600 mt-1">{errors.member}</p>}
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700">
                            <span className="font-medium">{prefilledMember.memberNumber}</span> — {prefilledMember.firstName} {prefilledMember.lastName}
                        </div>
                    )}

                    {/* Frequency */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                        <select
                            value={form.frequency}
                            onChange={e => setForm(f => ({ ...f, frequency: e.target.value as ObligationFrequency }))}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                        </select>
                    </div>

                    {field('amountDue', 'Amount Due (KES)', 'number', { min: '1', step: '0.01', placeholder: '500.00' })}
                    {field('startDate', 'Start Date', 'date', { min: today })}
                    {field('graceDays', 'Grace Days', 'number', { min: '0', max: '30', placeholder: '0' })}

                    {errors.submit && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {errors.submit}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                            {submitting ? 'Creating…' : 'Create Obligation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};