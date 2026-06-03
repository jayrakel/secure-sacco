import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, type CameraDevice } from 'html5-qrcode';
import { Camera, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { meetingsApi } from '../api/meetings-api';

interface MeetingQrScannerProps {
    meetingId: number | string;
    onClose: () => void;
    onScanSuccess: (memberId: number) => void;
}

export function MeetingQrScanner({ meetingId, onClose, onScanSuccess }: MeetingQrScannerProps) {
    const scannerRef = useRef<HTMLDivElement>(null);
    const html5QrCode = useRef<Html5Qrcode | null>(null);

    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('LOADING');
    const [message, setMessage] = useState('');
    const [activeCameraId, setActiveCameraId] = useState<string>('');

    // DECLARE BEFORE USE AND WRAP IN USECALLBACK
    const handleQrDecode = useCallback(async (qrData: string) => {
        if (html5QrCode.current?.isScanning) await html5QrCode.current.pause();
        setStatus('LOADING');
        setMessage('Verifying attendance...');

        try {
            const response = await meetingsApi.scanAttendance(Number(meetingId), { token: qrData });
            setStatus('SUCCESS');
            setMessage(`${response.memberName} marked as PRESENT.`);

            setTimeout(() => { onScanSuccess(response.memberId); }, 2000);
        } catch (error: unknown) {
            setStatus('ERROR');
            // Safely cast error to access response message
            const err = error as { response?: { data?: { message?: string } } };
            setMessage(err.response?.data?.message || 'Invalid or expired QR code.');

            setTimeout(() => {
                setStatus('IDLE');
                setMessage('');
                if (html5QrCode.current?.getState() === 2) html5QrCode.current.resume();
            }, 3000);
        }
    }, [meetingId, onScanSuccess]);

    useEffect(() => {
        if (!scannerRef.current) return;

        html5QrCode.current = new Html5Qrcode("reader", {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false
        });

        Html5Qrcode.getCameras()
            .then((devices: CameraDevice[]) => {
                if (devices && devices.length) {
                    const backCamera = devices.find(d => d.label.toLowerCase().includes('back'));
                    // FIXED: Changed from .deviceId to .id
                    setActiveCameraId(backCamera ? backCamera.id : devices[0].id);
                } else {
                    setStatus('ERROR');
                    setMessage('No cameras found on this device.');
                }
            })
            .catch(() => {
                setStatus('ERROR');
                setMessage('Camera permission denied or unavailable.');
            });

        return () => {
            if (html5QrCode.current && html5QrCode.current.isScanning) {
                html5QrCode.current.stop().catch(console.error);
            }
        };
    }, []);

    useEffect(() => {
        if (!activeCameraId || !html5QrCode.current || status === 'ERROR') return;

        const startScanning = async () => {
            try {
                if (html5QrCode.current?.isScanning) await html5QrCode.current.stop();
                setStatus('IDLE');

                await html5QrCode.current?.start(
                    activeCameraId,
                    { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                    (decodedText) => handleQrDecode(decodedText),
                    () => {}
                );
            } catch {
                setStatus('ERROR');
                setMessage("Could not access the selected camera.");
            }
        };

        startScanning();
    }, [activeCameraId, handleQrDecode, status]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Camera size={20} className="text-blue-600"/> Scan to Check In
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="relative bg-black w-full aspect-square flex items-center justify-center">
                    <div id="reader" ref={scannerRef} className="w-full h-full" />

                    {status === 'LOADING' && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                            <Loader2 size={40} className="animate-spin mb-3 text-blue-500" />
                            <p className="font-medium text-sm">{message || 'Processing...'}</p>
                        </div>
                    )}
                    {status === 'SUCCESS' && (
                        <div className="absolute inset-0 bg-green-600/90 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                            <CheckCircle size={56} className="mb-3" />
                            <p className="font-bold text-lg text-center px-6">{message}</p>
                        </div>
                    )}
                    {status === 'ERROR' && (
                        <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                            <AlertCircle size={48} className="mb-3 text-red-300" />
                            <p className="font-bold text-center px-6">{message}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}