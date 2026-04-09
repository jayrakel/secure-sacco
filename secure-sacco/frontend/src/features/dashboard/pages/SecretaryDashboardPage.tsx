import React, { useState, useEffect, useCallback } from 'react';
import {
    CalendarClock, Users, UserPlus, ClipboardList,
    CheckCircle2, CalendarDays, BarChart3, FileText,
} from 'lucide-react';
import { dashboardApi, type StaffDashboardDTO } from '../api/dashboard-api';
import { useAuth } from '../../auth/context/AuthProvider';
import { StatCard, QuickLink, DashboardHeader, fmtCount } from '../components/DashboardWidgets';

/**
 * Dashboard for SECRETARY and DEPUTY_SECRETARY.
 * Focus: upcoming meetings, this month's meetings, pending member activations, members.
 */
const SecretaryDashboard: React.FC = () => {
    const { user } = useAuth();
    const [data, setData]       = useState<StaffDashboardDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setData(await dashboardApi.getStaffDashboard());
        } catch {
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    const isDeputy = user?.roles?.includes('ROLE_DEPUTY_SECRETARY');

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            <DashboardHeader
                name={fullName}
                roleLabel={isDeputy ? 'Deputy Secretary' : 'Secretary'}
                onRefresh={load}
                loading={loading}
                icon={ClipboardList}
                iconColor="text-violet-600"
            />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
            )}

            {/* ── Meetings ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Meetings</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        label="Upcoming Meetings"
                        value={fmtCount(data?.upcomingMeetings)}
                        icon={CalendarClock}
                        iconBg="bg-violet-50"
                        iconColor="text-violet-600"
                        loading={loading}
                        badge={data?.upcomingMeetings}
                        badgeColor="orange"
                        linkTo="/meetings"
                        accent="border-t-4 border-t-violet-500"
                    />
                    <StatCard
                        label="Meetings This Month"
                        value={fmtCount(data?.meetingsThisMonth)}
                        icon={CalendarDays}
                        iconBg="bg-blue-50"
                        iconColor="text-blue-600"
                        loading={loading}
                        linkTo="/meetings"
                    />
                    <StatCard
                        label="Active Members"
                        value={fmtCount(data?.activeMembers)}
                        icon={CheckCircle2}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-600"
                        loading={loading}
                    />
                </div>
            </section>

            {/* ── Membership ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Membership</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        label="Total Members"
                        value={fmtCount(data?.totalMembers)}
                        icon={Users}
                        iconBg="bg-blue-50"
                        iconColor="text-blue-600"
                        loading={loading}
                        linkTo="/members"
                    />
                    <StatCard
                        label="Pending Activations"
                        value={fmtCount(data?.pendingActivations)}
                        icon={UserPlus}
                        iconBg="bg-amber-50"
                        iconColor="text-amber-600"
                        loading={loading}
                        badge={data?.pendingActivations}
                        badgeColor="orange"
                        linkTo="/members"
                        accent={data?.pendingActivations ? 'border-t-4 border-t-amber-400' : ''}
                    />
                    <StatCard
                        label="Pending Loan Applications"
                        value={fmtCount(data?.pendingLoanApplications)}
                        icon={ClipboardList}
                        iconBg="bg-slate-50"
                        iconColor="text-slate-600"
                        loading={loading}
                        linkTo="/loans"
                    />
                </div>
            </section>

            {/* ── Quick actions ── */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <QuickLink label="Meetings"          to="/meetings"           icon={CalendarClock} color="bg-violet-50"  textColor="text-violet-700" />
                    <QuickLink label="Members"           to="/members"            icon={Users}         color="bg-blue-50"    textColor="text-blue-700" />
                    <QuickLink label="Member Statement"  to="/reports/statements" icon={FileText}      color="bg-slate-100"  textColor="text-slate-700" />
                    <QuickLink label="Reports"           to="/reports"            icon={BarChart3}     color="bg-emerald-50" textColor="text-emerald-700" />
                </div>
            </section>
        </div>
    );
};

export default SecretaryDashboard;