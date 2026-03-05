import React, { useState, useEffect, useMemo } from 'react';
import { savingsApi, type StatementTransactionResponse } from '../api/savings-api';
import { memberApi, type Member } from '../../members/api/member-api';
import HasPermission from '../../../shared/components/HasPermission';
import { ManualTransactionModal } from '../components/ManualTransactionModal';
import { Search, User, ArrowDownCircle, ArrowUpCircle, Download, Clock } from 'lucide-react';
import { format } from 'date-fns';

const SavingsManagementPage: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);

    const [statement, setStatement] = useState<StatementTransactionResponse[]>([]);
    const [isLoadingStatement, setIsLoadingStatement] = useState(false);

    const [modalConfig, setModalConfig] = useState<{isOpen: boolean, type: 'DEPOSIT' | 'WITHDRAWAL'}>({ isOpen: false, type: 'DEPOSIT' });

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                // The API returns { content: [...members], page, size, etc }
                const response = await memberApi.getMembers();

                // Safely extract the array (fallback to empty array if undefined)
                const membersArray = response.content || [];

                setMembers(membersArray.filter((m: Member) => m.status === 'ACTIVE'));
            } catch (err) {
                console.error("Failed to load members", err);
            }
        };
        fetchMembers();
    }, []);

    const loadStatement = async (memberId: string) => {
        setIsLoadingStatement(true);
        try {
            const data = await savingsApi.getMemberStatement(memberId);
            setStatement(data);
        } catch (err) {
            console.error("Failed to load statement", err);
            setStatement([]);
        } finally {
            setIsLoadingStatement(false);
        }
    };

    const handleSelectMember = (member: Member) => {
        setSelectedMember(member);
        setSearchTerm('');
        loadStatement(member.id);
    };

    // Calculate current balance based on the newest transaction in the statement (which is at index 0 because backend reverses it)
    const currentBalance = statement.length > 0 ? statement[0].runningBalance : 0;

    const filteredMembers = useMemo(() => {
        if (!searchTerm) return [];
        return members.filter(m =>
            m.memberNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5); // Max 5 suggestions
    }, [members, searchTerm]);

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Savings Management</h1>
                    <p className="text-slate-500 text-sm mt-1">View member statements and post manual branch transactions.</p>
                </div>
            </div>

            {/* Search Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="relative max-w-xl">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Search Member</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Enter Member Name or Number (e.g., MEM-000001)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                    </div>

                    {/* Search Suggestions Dropdown */}
                    {searchTerm && filteredMembers.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                            {filteredMembers.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => handleSelectMember(member)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{member.firstName} {member.lastName}</p>
                                            <p className="text-xs text-slate-500">{member.memberNumber}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Member Profile & Actions */}
            {selectedMember && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Stats & Actions */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-6 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-3 mb-6 opacity-90">
                                <User size={24} />
                                <div>
                                    <h2 className="font-bold text-lg">{selectedMember.firstName} {selectedMember.lastName}</h2>
                                    <p className="text-sm font-mono">{selectedMember.memberNumber}</p>
                                </div>
                            </div>
                            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">Available Savings</p>
                            <h3 className="text-4xl font-bold">KES {currentBalance.toLocaleString()}</h3>
                        </div>

                        <HasPermission permission="SAVINGS_MANUAL_POST">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-3">
                                <h3 className="font-semibold text-slate-800 mb-2">Teller Actions</h3>
                                <button
                                    onClick={() => setModalConfig({isOpen: true, type: 'DEPOSIT'})}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-medium transition-colors"
                                >
                                    <ArrowDownCircle size={18} /> Receive Cash Deposit
                                </button>
                                <button
                                    onClick={() => setModalConfig({isOpen: true, type: 'WITHDRAWAL'})}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg font-medium transition-colors"
                                >
                                    <ArrowUpCircle size={18} /> Payout Cash Withdrawal
                                </button>
                            </div>
                        </HasPermission>
                    </div>

                    {/* Right Column: Statement */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Clock size={18} className="text-slate-500"/>
                                Official Statement
                            </h3>
                            <button className="text-slate-600 hover:text-slate-800 text-sm font-medium flex items-center gap-1">
                                <Download size={16} /> Export
                            </button>
                        </div>

                        <div className="p-0 overflow-x-auto">
                            {isLoadingStatement ? (
                                <div className="p-8 text-center text-slate-500">Loading statement...</div>
                            ) : statement.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                        <Clock className="text-slate-400" size={32} />
                                    </div>
                                    <p className="text-slate-600 font-medium">No transactions found</p>
                                    <p className="text-sm text-slate-400 mt-1">This member has not made any savings deposits yet.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Type & Ref</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Amount (KES)</th>
                                        <th className="px-4 py-3 text-right">Balance</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                    {statement.map((tx) => (
                                        <tr key={tx.transactionId} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-600">
                                                {format(new Date(tx.postedAt), 'MMM dd, yyyy HH:mm')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm ${tx.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {tx.type}
                                                        </span>
                                                    <span className="text-slate-500 font-mono text-xs">{tx.reference}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${tx.status === 'POSTED' ? 'bg-emerald-50 text-emerald-600' : tx.status === 'PENDING' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                                                        {tx.status}
                                                    </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-medium ${tx.type === 'DEPOSIT' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                {tx.runningBalance.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ManualTransactionModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({...modalConfig, isOpen: false})}
                memberId={selectedMember?.id || ''}
                memberName={selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : ''}
                type={modalConfig.type}
                onSuccess={() => loadStatement(selectedMember!.id)}
            />
        </div>
    );
};

export default SavingsManagementPage;