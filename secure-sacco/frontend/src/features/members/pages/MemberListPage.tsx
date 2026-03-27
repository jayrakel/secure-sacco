import React, { useCallback, useEffect, useState } from 'react';
import { memberApi } from '../api/member-api';
import type { Member, MemberPage } from '../api/member-api';
import HasPermission from '../../../shared/components/HasPermission';
import CreateMemberModal from '../components/CreateMemberModal';
import { Search, UserPlus, Filter } from 'lucide-react';

const statusStyle = (status: string) => {
    if (status === 'ACTIVE')    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'INACTIVE')  return 'bg-slate-100 text-slate-700 border-slate-200';
    return 'bg-red-50 text-red-700 border-red-200';
};

const MemberListPage: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [pageData, setPageData] = useState<MemberPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(0);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchMembers = useCallback(
        async (search: string, status: string, page: number) => {
            setLoading(true);
            try {
                const data = await memberApi.getMembers(search, status, page, 10);
                setMembers(data.content);
                setPageData(data);
                setError('');
            } catch {
                setError('Failed to load members.');
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        void fetchMembers(appliedSearchTerm, statusFilter, currentPage);
    }, [appliedSearchTerm, statusFilter, currentPage, fetchMembers]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(0);
        setAppliedSearchTerm(searchTerm);
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Member Directory</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Search, view, and register SACCO members</p>
                </div>
                <HasPermission permission="MEMBERS_WRITE">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm"
                    >
                        <UserPlus size={16} />
                        <span>Register Member</span>
                    </button>
                </HasPermission>
            </div>

            {/* ── Filters ── */}
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name, ID, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 sm:w-40 relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer text-sm"
                            >
                                <option value="">All Statuses</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                                <option value="SUSPENDED">Suspended</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm"
                        >
                            Search
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium">
                    {error}
                </div>
            )}

            {/* ── Table (desktop) / Cards (mobile) ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                            <th className="px-6 py-4 font-semibold">Member No.</th>
                            <th className="px-6 py-4 font-semibold">Full Name</th>
                            <th className="px-6 py-4 font-semibold">Contact Info</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold text-right">Joined Date</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    <div className="animate-pulse flex flex-col items-center">
                                        <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                                        Loading records...
                                    </div>
                                </td>
                            </tr>
                        ) : members.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    No members found matching your search criteria.
                                </td>
                            </tr>
                        ) : (
                            members.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-emerald-700">{member.memberNumber}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-900">
                                            {member.firstName} {member.middleName ? member.middleName + ' ' : ''}{member.lastName}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">ID: {member.nationalId || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-700">{member.phoneNumber || 'N/A'}</div>
                                        <div className="text-xs text-slate-500">{member.email || ''}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full border ${statusStyle(member.status)}`}>
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-600">
                                        {new Date(member.createdAt).toLocaleDateString(undefined, {
                                            year: 'numeric', month: 'short', day: 'numeric',
                                        })}
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile card list */}
                <div className="sm:hidden">
                    {loading ? (
                        <div className="p-6 flex flex-col items-center text-slate-500">
                            <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                            Loading records...
                        </div>
                    ) : members.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">
                            No members found matching your search criteria.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {members.map((member) => (
                                <div key={member.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-emerald-700 text-sm">{member.memberNumber}</span>
                                                <span className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full border ${statusStyle(member.status)}`}>
                                                    {member.status}
                                                </span>
                                            </div>
                                            <p className="font-semibold text-slate-900 text-sm mt-1">
                                                {member.firstName} {member.middleName ? member.middleName + ' ' : ''}{member.lastName}
                                            </p>
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                {member.phoneNumber && (
                                                    <span className="text-xs text-slate-500">{member.phoneNumber}</span>
                                                )}
                                                {member.email && (
                                                    <span className="text-xs text-slate-500 truncate">{member.email}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-400 text-right shrink-0">
                                            {new Date(member.createdAt).toLocaleDateString(undefined, {
                                                month: 'short', day: 'numeric', year: 'numeric',
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {pageData && pageData.totalPages > 1 && (
                    <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                        <span className="text-sm text-slate-600 font-medium">
                            Page {pageData.number + 1} of {pageData.totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                                disabled={pageData.number === 0 || loading}
                                className="px-3 sm:px-4 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-50 transition-colors"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(pageData.totalPages - 1, p + 1))}
                                disabled={pageData.number >= pageData.totalPages - 1 || loading}
                                className="px-3 sm:px-4 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-50 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <CreateMemberModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    setCurrentPage(0);
                    void fetchMembers(appliedSearchTerm, statusFilter, 0);
                }}
            />
        </div>
    );
};

export default MemberListPage;