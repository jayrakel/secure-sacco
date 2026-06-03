import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { X, RefreshCw, Download, QrCode } from 'lucide-react';
import apiClient from '../../../shared/api/api-client';

interface MeetingQrModalProps {
    meeting: {
        id: string;
        title: string;
        startAt: string;
        qrToken: string;
    };
    onClose: () => void;
    onTokenRegenerated: (newToken: string) => void;
}

export const MeetingQrModal: React.FC<MeetingQrModalProps> = ({
                                                                  meeting, onClose, onTokenRegenerated
                                                              }) => {
    const [regenerating, setRegenerating] = React.useState(false);
    const [token, setToken] = React.useState(meeting.qrToken);
    const printRef = useRef<HTMLDivElement>(null);

    // Auto-regenerate if the meeting has no QR token (pre-V78 meetings)
    React.useEffect(() => {
        if (!token) {
            setRegenerating(true);
            apiClient.post(`/meetings/${meeting.id}/regenerate-qr`)
                .then(res => {
                    setToken(res.data.qrToken);
                    onTokenRegenerated(res.data.qrToken);
                })
                .catch(() => setRegenerating(false))
                .finally(() => setRegenerating(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkInUrl = `${window.location.origin}/meetings/checkin/${token}`;

    const handleRegenerate = async () => {
        if (!window.confirm('This will invalidate the current QR code. Members with the old code cannot check in. Continue?')) return;
        setRegenerating(true);
        try {
            const res = await apiClient.post(`/meetings/${meeting.id}/regenerate-qr`);
            const newToken = res.data.qrToken;
            setToken(newToken);
            onTokenRegenerated(newToken);
        } catch {
            alert('Failed to regenerate QR code.');
        } finally {
            setRegenerating(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const qrSvg = printRef.current?.querySelector('svg')?.outerHTML ?? '';
        printWindow.document.write(`
            <html><head><title>Meeting QR — ${meeting.title}</title>
            <style>
                body { font-family: sans-serif; text-align: center; padding: 40px; }
                h2 { font-size: 24px; margin-bottom: 4px; }
                p { color: #64748b; font-size: 14px; margin: 4px 0; }
                .qr { margin: 24px auto; display: inline-block; }
                .url { font-size: 11px; color: #94a3b8; word-break: break-all; margin-top: 16px; }
                .instruction { font-size: 16px; font-weight: 600; margin-top: 20px; color: #1e293b; }
            </style></head>
            <body>
                <h2>${meeting.title}</h2>
                <p>${new Date(meeting.startAt).toLocaleString('en-KE', { dateStyle: 'full', timeStyle: 'short' })}</p>
                <div class="qr">${qrSvg}</div>
                <p class="instruction">Scan to mark your attendance</p>
                <p class="url">${checkInUrl}</p>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-50 rounded-lg">
                            <QrCode size={16} className="text-emerald-600" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">Meeting QR Code</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                        <X size={16} className="text-slate-500" />
                    </button>
                </div>

                {/* QR Code */}
                <div className="px-5 py-6 text-center">
                    <p className="text-sm font-semibold text-slate-800 mb-1">{meeting.title}</p>
                    <p className="text-xs text-slate-400 mb-5">
                        {new Date(meeting.startAt).toLocaleString('en-KE', {
                            dateStyle: 'medium', timeStyle: 'short'
                        })}
                    </p>

                    {/* QR */}
                    <div ref={printRef} className="inline-block p-4 bg-white border-2 border-slate-100 rounded-xl">
                        {token
                            ? <QRCode value={checkInUrl} size={200} />
                            : <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-50 rounded-lg">
                                <div className="text-center">
                                    <RefreshCw size={24} className="animate-spin text-emerald-500 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400">Generating QR code...</p>
                                </div>
                            </div>
                        }
                    </div>

                    <p className="text-[10px] text-slate-400 mt-3 font-mono break-all px-2">{checkInUrl}</p>
                    <p className="text-xs text-slate-500 mt-3">
                        Members scan this with their phone camera to check in
                    </p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 px-5 pb-5">
                    <button onClick={handlePrint}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                        <Download size={14} />
                        Print / Save
                    </button>
                    <button onClick={handleRegenerate} disabled={regenerating}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-100 transition disabled:opacity-50">
                        <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                        {regenerating ? 'Regenerating...' : 'New Code'}
                    </button>
                </div>
            </div>
        </div>
    );
};