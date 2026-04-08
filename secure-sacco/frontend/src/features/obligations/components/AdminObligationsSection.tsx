import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, History, RefreshCw, Edit2, Plus } from 'lucide-react';
import { obligationsApi, type ObligationResponse, type ObligationPeriodResponse, type PagedResponse } from '../api/obligation-api';
import { ObligationStatusCard } from './ObligationStatusCard';
import { ObligationHistoryTable } from './ObligationHistoryTable';
import { CreateObligationModal } from './CreateObligationModal';

interface Props {
    memberId: string; // 🟢 Required: Admin must specify whose profile they are viewing
    memberData?: any; // Optional: Pass the full member object to prefill the modal
}

export const AdminObligationsSection: React.FC<Props> = ({ memberId, memberData }) => {
    const [obligations, setObligations]       = useState<ObligationResponse[]>([]);
    const [history, setHistory]               = useState<PagedResponse<ObligationPeriodResponse> | null>(null);
    const [histPage, setHistPage]             = useState(0);
    const [loadingObl, setLoadingObl]         = useState(true);
    const [loadingHist, setLoadingHist]       = useState(true);
    const [error, setError]                   = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen]       = useState(false);
    const [editingObligation, setEditingObligation] = useState<ObligationResponse | null>(null);

    // 🟢 Uses the ADMIN endpoints
    const fetchObligations = useCallback(async () => {
        setLoadingObl(true);
        try {
            const data = await obligationsApi.getObligationsByMemberId(memberId);
            setObligations(data);
        } catch {
            setError('Failed to load member obligations.');
        } finally {
            setLoadingObl(false);
        }
    }, [memberId]);

    const fetchHistory = useCallback(async (page: number) => {
        setLoadingHist(true);
        try {
            const data = await obligationsApi.getHistoryByMemberId(memberId, page, 10);
            setHistory(data);
        } catch {
            // silently fail
        } finally {
            setLoadingHist(false);
        }
    }, [memberId]);

    useEffect(() => { fetchObligations(); }, [fetchObligations]);
    useEffect(() => { fetchHistory(histPage); }, [fetchHistory, histPage]);

    const handleOpenEdit = (obligation: ObligationResponse) => {
        setEditingObligation(obligation);
        setIsModalOpen(true);
    };

    const handleOpenCreate = () => {
        setEditingObligation(null);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        fetchObligations();
        fetchHistory(histPage);
    };

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-emerald-600" />
                        <h2 className="text-base font-semibold text-slate-800">Savings Obligations (Admin Control)</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={fetchObligations} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
                            <RefreshCw size={13} className={loadingObl ? 'animate-spin' : ''} /> Refresh
                        </button>
                        {/* 🟢 Admin Create Button */}
                        <button onClick={handleOpenCreate} className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-emerald-700">
                            <Plus size={14} /> Add Obligation
                        </button>
                    </div>
                </div>

                {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{error}</div>}

                {loadingObl ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2].map(i => <div key={i} className="h-40 rounded-xl bg-slate-100 animate-pulse" />)}
                    </div>
                ) : obligations.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-8 text-center">
                        <ShieldCheck size={32} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500">This member has no active obligations.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {obligations.map(o => (
                            <div key={o.id} className="relative group">
                                {/* 🟢 Admin Edit Button */}
                                <div className="absolute top-4 right-4 z-10">
                                    <button onClick={() => handleOpenEdit(o)} className="p-1.5 bg-white border border-slate-200 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-md shadow-sm transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                                <ObligationStatusCard obligation={o} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <div className="flex items-center gap-2 mb-4">
                    <History size={18} className="text-slate-500" />
                    <h2 className="text-base font-semibold text-slate-800">Obligation History</h2>
                </div>
                <ObligationHistoryTable data={history} loading={loadingHist} page={histPage} onPageChange={setHistPage} />
            </div>

            <CreateObligationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                initialData={editingObligation}
                prefilledMember={memberData} // Locks the member field in the modal to the current profile
            />
        </div>
    );
};