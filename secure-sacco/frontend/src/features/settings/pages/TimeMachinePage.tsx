import React, { useState, useEffect, useCallback } from 'react';
import { Clock, FastForward, RotateCcw, AlertTriangle, Play, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { timeTravelApi, type TimeTravelStatus } from '../../core/api/time-travel-api';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage';

const TimeMachinePage: React.FC = () => {
    const [status, setStatus] = useState<TimeTravelStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [targetDate, setTargetDate] = useState('');
    const [error, setError] = useState('');

    const fetchStatus = useCallback(async () => {
        try {
            const data = await timeTravelApi.getStatus();
            setStatus(data);
            // Default the input to whatever the current system date is
            if (data.currentTime) {
                setTargetDate(data.currentTime.split('T')[0]);
            }
        } catch (err) {
            setError(getApiErrorMessage(err, 'Failed to fetch time machine status.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleJump = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetDate) return;

        setActionLoading(true);
        setError('');
        try {
            const data = await timeTravelApi.jumpToDate({ targetDate });
            setStatus(data);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Failed to time travel.'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleReset = async () => {
        setActionLoading(true);
        setError('');
        try {
            const data = await timeTravelApi.resetTime();
            setStatus(data);
            setTargetDate(data.currentTime.split('T')[0]);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Failed to reset timeline.'));
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-slate-400">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="text-indigo-600" size={24} />
                    System Time Machine
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Simulate future dates to test cron jobs, penalty generations, and loan interest accruals.
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Real Time Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Real World Time</p>
                    <p className="text-lg font-mono text-slate-600">
                        {status?.realTime ? format(parseISO(status.realTime), 'dd MMM yyyy, HH:mm:ss') : '—'}
                    </p>
                </div>

                {/* System Time Card */}
                <div className={`rounded-2xl border shadow-sm p-6 text-center transition-colors ${
                    status?.isTimeTraveling
                        ? 'bg-indigo-50 border-indigo-200 shadow-indigo-100/50'
                        : 'bg-white border-slate-200'
                }`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${status?.isTimeTraveling ? 'text-indigo-500' : 'text-slate-400'}`}>
                        Active System Time
                    </p>
                    <p className={`text-2xl font-mono font-bold ${status?.isTimeTraveling ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {status?.currentTime ? format(parseISO(status.currentTime), 'dd MMM yyyy, HH:mm:ss') : '—'}
                    </p>
                    {status?.isTimeTraveling && (
                        <span className="inline-block mt-2 px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                            +{status.offsetDays} Days Offset
                        </span>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <FastForward size={18} className="text-slate-500" />
                    <h3 className="font-bold text-slate-800">Time Travel Controls</h3>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
                        <AlertTriangle size={20} className="shrink-0 text-amber-600" />
                        <div>
                            <p className="font-bold mb-1">Warning: Irreversible Database Effects</p>
                            <p>Jumping forward in time will instantly trigger all midnight cron jobs between the current date and your target date. This will generate permanent financial records, penalties, and interest logs.</p>
                        </div>
                    </div>

                    <form onSubmit={handleJump} className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
                            <input
                                type="date"
                                required
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={actionLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
                        >
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                            Jump to Date
                        </button>
                    </form>

                    <hr className="border-slate-100" />

                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-bold text-slate-800">Restore Timeline</p>
                            <p className="text-xs text-slate-500">Snap the system back to the real-world date.</p>
                        </div>
                        <button
                            onClick={handleReset}
                            disabled={actionLoading || !status?.isTimeTraveling}
                            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-2"
                        >
                            <RotateCcw size={16} />
                            Reset to Real Time
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeMachinePage;