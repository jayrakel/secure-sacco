import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import HasPermission from '../../../shared/components/HasPermission';

export const ReportsHubPage: React.FC = () => {
    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Access Sacco financial analytics, member statements, and performance reports.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

                {/* 1. Member Statements */}
                <HasPermission permission="REPORTS_READ">
                    <Link to="/reports/statements" className="block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg mb-4">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <h5 className="mb-2 text-lg font-bold tracking-tight text-gray-900">Member Statements</h5>
                        <p className="font-normal text-sm text-gray-500">View and export unified chronological member statements (Savings, Loans, Fines).</p>
                    </Link>
                </HasPermission>

                {/* 2. Loan Arrears Aging */}
                <HasPermission permission="REPORTS_READ">
                    <Link to="/reports/arrears" className="block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-red-300 transition-all">
                        <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-lg mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <h5 className="mb-2 text-lg font-bold tracking-tight text-gray-900">Loan Arrears Aging</h5>
                        <p className="font-normal text-sm text-gray-500">Track non-performing active loans categorized by specific aging buckets.</p>
                    </Link>
                </HasPermission>

                {/* 3. Daily Collections */}
                <HasPermission permission="REPORTS_READ">
                    <Link to="/reports/collections" className="block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-green-300 transition-all">
                        <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-lg mb-4">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <h5 className="mb-2 text-lg font-bold tracking-tight text-gray-900">Daily Collections</h5>
                        <p className="font-normal text-sm text-gray-500">Review daily liquidity and incoming cashflow grouped by channel and purpose.</p>
                    </Link>
                </HasPermission>

                {/* 4. Income Report */}
                <HasPermission permission="REPORTS_READ">
                    <Link to="/reports/income" className="block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-300 transition-all">
                        <div className="flex items-center justify-center w-12 h-12 bg-purple-50 rounded-lg mb-4">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                        <h5 className="mb-2 text-lg font-bold tracking-tight text-gray-900">Income Report</h5>
                        <p className="font-normal text-sm text-gray-500">P&L Proxy: Aggregate General Ledger income accounts (Fees, Interest, Penalties).</p>
                    </Link>
                </HasPermission>

            </div>
        </div>
    );
};