import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, type CameraDevice } from 'html5-qrcode';
import { Camera, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import apiClient from '../../../shared/api/api-client';

interface MeetingQrScannerProps {
    onClose: () => void;
    onScanSuccess: (memberId: number) => void;
}

export function MeetingQrScanner({ onClose, onScanSuccess }: MeetingQrScannerProps) {
    const scannerRef   = useRef<HTMLDivElement>(null);
    const html5QrCode  = useRef<Html5Qrcode | null>(null);
    const isStarting   = useRef(false); // prevent double-start race condition

    const [status, setStatus]   = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('LOADING');
    const [message, setMessage] = useState('Starting camera...');

    /**
     * Called when the scanner decodes a QR code.
     * The QR value is the full check-in URL:
     *   https://betterlinkventureslimited.co.ke/meetings/checkin/{token}
     * We extract the token and call our existing /meetings/qr/{token}/checkin endpoint.
     */
    const handleQrDecode = useCallback(async (qrData: string) => {
        if (html5QrCode.current?.isScanning) {
            await html5QrCode.current.pause();
        }
        setStatus('LOADING');
        setMessage('Verifying attendance...');

        try {
            // Extract token from URL or use raw value if already just a token
            let token = qrData;
            const urlMatch = qrData.match(/\/meetings\/checkin\/([^/?#]+)/);
            if (urlMatch) token = urlMatch[1];

            const res = await apiClient.post(`/meetings/qr/${token}/checkin`);
            setStatus('SUCCESS');
            setMessage(`${res.data.memberName ?? 'Member'} marked as ${res.data.status}.`);

            setTimeout(() => {
                onScanSuccess(res.data.memberId ?? 0);
            }, 2000);

        } catch (error: unknown) {
            setStatus('ERROR');
            const err = error as { response?: { data?: { error?: string; message?: string } } };
            const msg = err.response?.data?.error
                ?? err.response?.data?.message
                ?? 'Invalid or expired QR code.';
            setMessage(msg);

            // Auto-resume scanning after 3 seconds
            setTimeout(async () => {
                setStatus('IDLE');
                setMessage('');
                try {
                    if (html5QrCode.current && !html5QrCode.current.isScanning) {
                        await html5QrCode.current.resume();
                    }
                } catch { /* ignore resume errors */ }
            }, 3000);
        }
    }, [onScanSuccess]);

    // Initialise scanner and get camera list once on mount
    useEffect(() => {
        const el = scannerRef.current;
        if (!el) return;

        // html5QrCode needs the element to already be in DOM — it uses the id to find it
        html5QrCode.current = new Html5Qrcode('reader', {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
        });

        Html5Qrcode.getCameras()
            .then((devices: CameraDevice[]) => {
                if (!devices?.length) {
                    setStatus('ERROR');
                    setMessage('No cameras found on this device.');
                    return;
                }
                // Prefer back camera on mobile
                const back = devices.find(d =>
                    d.label.toLowerCase().includes('back') ||
                    d.label.toLowerCase().includes('rear') ||
                    d.label.toLowerCase().includes('environment')
                );
                const chosen = back ?? devices[0];
                startCamera(chosen.id);
            })
            .catch(() => {
                setStatus('ERROR');
                setMessage('Camera permission denied. Please allow camera access and try again.');
            });

        return () => {
            // Cleanup on unmount
            if (html5QrCode.current?.isScanning) {
                html5QrCode.current.stop().catch(() => {});
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startCamera = async (cameraId: string) => {
        if (isStarting.current) return;  // guard against double-start
        isStarting.current = true;

        try {
            if (html5QrCode.current?.isScanning) {
                await html5QrCode.current.stop();
            }

            await html5QrCode.current?.start(
                cameraId,
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                (decoded) => handleQrDecode(decoded),
                () => {} // scan failure — ignore, happens constantly until a QR is found
            );
            setStatus('IDLE');
            setMessage('');
        } catch {
            setStatus('ERROR');
            setMessage('Could not access the camera. Make sure camera permissions are granted.');
        } finally {
            isStarting.current = false;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Camera size={20} className="text-blue-600" />
                        Scan Meeting QR Code
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Camera viewfinder */}
                <div className="relative bg-black w-full aspect-square flex items-center justify-center">
                    <div id="reader" ref={scannerRef} className="w-full h-full" />

                    {/* Scanning guide frame */}
                    {status === 'IDLE' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-56 h-56 border-2 border-white/60 rounded-lg" />
                        </div>
                    )}

                    {status === 'LOADING' && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                            <Loader2 size={40} className="animate-spin mb-3 text-blue-400" />
                            <p className="font-medium text-sm">{message}</p>
                        </div>
                    )}
                    {status === 'SUCCESS' && (
                        <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                            <CheckCircle size={56} className="mb-3" />
                            <p className="font-bold text-lg text-center px-6">{message}</p>
                        </div>
                    )}
                    {status === 'ERROR' && (
                        <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                            <AlertCircle size={48} className="mb-3 text-red-300" />
                            <p className="font-bold text-center px-6 text-sm">{message}</p>
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 bg-slate-50 text-center">
                    <p className="text-xs text-slate-500">
                        Point your camera at the meeting QR code displayed by staff
                    </p>
                </div>
            </div>
        </div>
    );
}