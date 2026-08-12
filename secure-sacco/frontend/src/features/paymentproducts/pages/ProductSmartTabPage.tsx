import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthProvider';
import { paymentProductsApi, type PaymentProduct, type ProductTransactionPage } from '../api/payment-products-api';
import { Download, ChevronLeft, CalendarClock, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import apiClient from '../../../shared/api/api-client';
import { Button } from '../../../shared/components/ui/button';

const fmtKES = (n: number | null | undefined) =>
    `KES ${(n ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (dStr: string | null) =>
    dStr ? new Date(dStr).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export const ProductSmartTabPage = () => {
    const { productId } = useParams<{ productId: string }>();
    const { user } = useAuth();
    
    const isStaff = user?.roles?.some(role => role !== 'ROLE_MEMBER');

    const [product, setProduct] = useState<PaymentProduct | null>(null);
    const [pageData, setPageData] = useState<ProductTransactionPage | null>(null);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    useEffect(() => {
        const load = async () => {
            if (!productId) return;
            setLoading(true);
            try {
                // Determine which products list to query based on role
                const products = isStaff 
                    ? await paymentProductsApi.getAll() 
                    : await paymentProductsApi.getActive();
                const found = products.find(p => p.id === productId);
                if (!found) {
                    setError('Product not found or unavailable.');
                    return;
                }
                setProduct(found);
                
                const data = isStaff
                    ? await paymentProductsApi.getTransactions(productId, page, 20)
                    : await paymentProductsApi.getMyTransactions(productId, page, 20);
                setPageData(data);
                
            } catch (err: unknown) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const error = err as any;
                setError(error.response?.data?.message || error.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [productId, page, isStaff]);
    
    const downloadStatement = async () => {
        if (!productId) return;
        try {
            // For now, only staff download statement is implemented on backend.
            if (isStaff) {
                const res = await apiClient.get(`/payment-products/${productId}/statement`, { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${product?.name || 'product'}_statement.csv`);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
            }
        } catch (err) {
            console.error('Failed to download statement', err);
        }
    };
    
    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse bg-slate-200 h-8 w-48 mb-6 rounded"></div>
                <div className="animate-pulse bg-slate-100 h-32 w-full rounded-xl"></div>
            </div>
        );
    }
    
    if (error || !product || !pageData) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 mt-0.5" />
                    <div>
                        <h3 className="font-semibold">Error</h3>
                        <p className="text-sm">{error || 'Failed to load data.'}</p>
                    </div>
                </div>
            </div>
        );
    }
    
    const StatusIcon = ({ status }: { status: string }) => {
        if (status === 'ROUTED') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        if (status === 'PENDING') return <CalendarClock className="w-4 h-4 text-amber-500" />;
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    };
    
    const progressPerc = product.requiredAmount && product.requiredAmount > 0 
        ? Math.min(100, Math.max(0, (pageData.totalAmount / product.requiredAmount) * 100))
        : null;

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">{product.name}</h1>
                        {product.description && (
                            <p className="text-sm text-slate-500">{product.description}</p>
                        )}
                    </div>
                </div>
                {isStaff && (
                    <Button variant="outline" onClick={downloadStatement}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Statement
                    </Button>
                )}
            </header>
            
            <main className="p-6 max-w-6xl mx-auto space-y-6">
                
                {/* Summary Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-slate-500 mb-1">
                            {isStaff ? 'Total Global Collections' : 'My Total Paid'}
                        </p>
                        <h2 className="text-3xl font-bold text-emerald-600">
                            {fmtKES(pageData.totalAmount)}
                        </h2>
                        {product.requiredAmount != null && product.requiredAmount > 0 && !isStaff && (
                            <p className="text-sm text-slate-500 mt-2">
                                Target: {fmtKES(product.requiredAmount)}
                            </p>
                        )}
                    </div>
                    
                    {!isStaff && progressPerc != null && (
                        <div className="w-full md:w-64">
                            <div className="flex justify-between text-sm mb-1.5 font-medium">
                                <span className="text-slate-500">Progress</span>
                                <span className={progressPerc >= 100 ? 'text-emerald-600' : 'text-slate-700'}>
                                    {progressPerc.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${progressPerc >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                    style={{ width: `${progressPerc}%` }} 
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Transactions List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-semibold text-slate-800">Transaction History</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    {isStaff && <th className="px-6 py-3">Member</th>}
                                    <th className="px-6 py-3 text-right">Amount</th>
                                    <th className="px-6 py-3">Reference</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pageData.items.map(item => (
                                    <tr key={item.allocationId} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                                            {fmtDate(item.createdAt)}
                                        </td>
                                        {isStaff && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-slate-800">{item.memberName}</div>
                                                <div className="text-xs text-slate-400">{item.memberNumber}</div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-slate-800">
                                            {fmtKES(item.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                                            {item.reference}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                                                ${item.status === 'ROUTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                                  item.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                                                  'bg-red-50 text-red-700 border-red-100'}`}>
                                                <StatusIcon status={item.status} />
                                                {item.status}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {pageData.items.length === 0 && (
                                    <tr>
                                        <td colSpan={isStaff ? 5 : 4} className="px-6 py-8 text-center text-slate-400">
                                            No transactions found for this product.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {pageData.totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                            <span className="text-sm text-slate-500">
                                Page {page + 1} of {pageData.totalPages}
                            </span>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" size="sm" 
                                    disabled={page === 0} 
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Previous
                                </Button>
                                <Button 
                                    variant="outline" size="sm" 
                                    disabled={page >= pageData.totalPages - 1} 
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                
            </main>
        </div>
    );
};
