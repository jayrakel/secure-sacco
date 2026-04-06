
// Adjust these interfaces to match your actual report-api.ts response types
export interface PrintTransaction {
    id: string;
    date: string;
    description: string;
    reference: string;
    debit: number | null;
    credit: number | null;
    balance: number;
}

export interface BankStatementPrintableProps {
    memberDetails: {
        name: string;
        memberNumber: string;
        email: string;
        phone: string;
    };
    period: {
        startDate: string;
        endDate: string;
    };
    summary: {
        openingBalance: number;
        totalCredits: number;
        totalDebits: number;
        closingBalance: number;
    };
    transactions: PrintTransaction[];
}

const fmtKES = (n: number | null | undefined) =>
    n == null || n === 0 ? '-' : n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BankStatementPrintable({
                                                   memberDetails,
                                                   period,
                                                   summary,
                                                   transactions
                                               }: BankStatementPrintableProps) {
    return (
        /* THE MAGIC TRICK:
            Hidden on screen, but takes over the entire page during print.
            Absolute positioning breaks it out of parent overflow traps.
        */
    <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:z-[9999] print:text-black bg-white min-h-screen">

        {/* --- HEADER --- */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
            <div>
                {/* Replace with actual SACCO Logo if you have one */}
                <div className="text-3xl font-extrabold tracking-tight uppercase mb-1">
                    SECURE SACCO LTD.
                </div>
                <div className="text-sm text-slate-600">
                    P.O Box 12345 - 00100, Nairobi, Kenya<br />
                    Email: support@securesacco.co.ke<br />
                    Phone: +254 700 000 000
                </div>
            </div>
            <div className="text-right">
                <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Statement of Account
                </h1>
                <div className="text-sm border border-slate-300 p-3 rounded-lg inline-block text-left bg-slate-50">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <span className="font-semibold text-slate-600">Generated On:</span>
                        <span>{new Date().toLocaleDateString('en-KE')}</span>
                        <span className="font-semibold text-slate-600">Period:</span>
                        <span>{period.startDate} to {period.endDate}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* --- CUSTOMER & SUMMARY DETAILS --- */}
        <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Member Info */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                    Member Details
                </h3>
                <div className="font-bold text-lg">{memberDetails.name}</div>
                <div className="text-sm mt-1">
                    <span className="text-slate-500 w-24 inline-block">Member No:</span>
                    <span className="font-mono font-semibold">{memberDetails.memberNumber}</span>
                </div>
                <div className="text-sm mt-1">
                    <span className="text-slate-500 w-24 inline-block">Phone:</span>
                    {memberDetails.phone}
                </div>
                <div className="text-sm mt-1">
                    <span className="text-slate-500 w-24 inline-block">Email:</span>
                    {memberDetails.email}
                </div>
            </div>

            {/* Financial Summary */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                    Account Summary
                </h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">Opening Balance:</span>
                        <span className="font-mono">{fmtKES(summary.openingBalance)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2 text-emerald-600">
                        <span>Total Credits (In):</span>
                        <span className="font-mono">{fmtKES(summary.totalCredits)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2 text-rose-600">
                        <span>Total Debits (Out):</span>
                        <span className="font-mono">{fmtKES(summary.totalDebits)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold mt-3 pt-2 border-t border-slate-300">
                        <span>Closing Balance:</span>
                        <span className="font-mono">{fmtKES(summary.closingBalance)}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* --- TRANSACTIONS TABLE --- */}
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Transaction History
        </h3>
        <table className="w-full text-sm text-left border-collapse">
            <thead>
            <tr className="border-b-2 border-slate-800">
                <th className="py-2 pr-4 font-bold text-slate-700 w-24">Date</th>
                <th className="py-2 px-4 font-bold text-slate-700">Description</th>
                <th className="py-2 px-4 font-bold text-slate-700">Reference</th>
                <th className="py-2 px-4 font-bold text-slate-700 text-right w-28">Debit</th>
                <th className="py-2 px-4 font-bold text-slate-700 text-right w-28">Credit</th>
                <th className="py-2 pl-4 font-bold text-slate-700 text-right w-32">Balance</th>
            </tr>
            </thead>
            <tbody className="font-mono text-xs">
            {transactions.map((txn, index) => (
                <tr key={txn.id || index} className="border-b border-slate-200 break-inside-avoid">
                    <td className="py-2.5 pr-4 text-slate-600 font-sans">{txn.date}</td>
                    <td className="py-2.5 px-4 font-sans">{txn.description}</td>
                    <td className="py-2.5 px-4 text-slate-500">{txn.reference}</td>
                    <td className="py-2.5 px-4 text-right text-rose-600">{fmtKES(txn.debit)}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-600">{fmtKES(txn.credit)}</td>
                    <td className="py-2.5 pl-4 text-right font-bold text-slate-800">{fmtKES(txn.balance)}</td>
                </tr>
            ))}
            {transactions.length === 0 && (
                <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans italic">
                        No transactions found for this period.
                    </td>
                </tr>
            )}
            </tbody>
        </table>

        {/* --- FOOTER --- */}
        <div className="mt-16 pt-6 border-t border-slate-300 text-center text-xs text-slate-400 break-inside-avoid">
            <p>This is a computer-generated statement and does not require a physical signature.</p>
            <p className="mt-1">For any inquiries regarding this statement, please contact Secure Sacco support.</p>
            <div className="mt-8 flex justify-between items-end px-12">
                <div className="text-center w-48 border-t border-slate-400 pt-2">Authorized Signatory</div>
                <div className="text-center w-48 border-t border-slate-400 pt-2">Member Signature</div>
            </div>
        </div>

        {/* Force a page break if needed for multi-page prints */}
        <style type="text/css">
            {`
                    @media print {
                        @page { margin: 10mm; size: A4 portrait; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                `}
        </style>
    </div>
);
}