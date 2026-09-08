import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Plus, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { maintenanceApi } from '../api/maintenanceApi';
import type { MaintenanceEvent, CreateMaintenanceRequest } from '../api/maintenanceApi';
import { format } from 'date-fns';
import { Input } from '../../../shared/components/ui/input';

export default function SystemMaintenancePage() {
    const [events, setEvents] = useState<MaintenanceEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    
    const [formData, setFormData] = useState<CreateMaintenanceRequest>({
        title: '',
        description: '',
        maintenanceStartTime: '',
        maintenanceEndTime: '',
        notifyMembersApp: true,
        notifyMembersSms: false,
        notifyMembersEmail: false,
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadEvents = async () => {
        try {
            setLoading(true);
            const data = await maintenanceApi.getAll();
            setEvents(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        
        try {
            // Convert datetime-local to full ISO string before sending
            const payload = {
                ...formData,
                maintenanceStartTime: new Date(formData.maintenanceStartTime).toISOString(),
                maintenanceEndTime: new Date(formData.maintenanceEndTime).toISOString()
            };
            
            await maintenanceApi.schedule(payload);
            setOpenDialog(false);
            setFormData({
                title: '',
                description: '',
                maintenanceStartTime: '',
                maintenanceEndTime: '',
                notifyMembersApp: true,
                notifyMembersSms: false,
                notifyMembersEmail: false,
            });
            loadEvents();
        } catch (err: any) {
            setError(err.response?.data?.error || 'An error occurred while scheduling.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">System Maintenance</h1>
                    <p className="text-sm text-slate-500 mt-1">Schedule system downtime and automate broadcast notifications.</p>
                </div>
                
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpenDialog(true)}>
                    <Plus size={16} className="mr-2" />
                    Schedule Maintenance
                </Button>
            </div>
            
            {openDialog && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-lg font-semibold text-slate-800">Schedule Maintenance</h2>
                            <p className="text-sm text-slate-500 mt-1">Set the downtime window. Members and admins will be automatically notified based on your preferences.</p>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="maintenance-form" onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-start gap-2">
                                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}
                                
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Title</label>
                                    <Input 
                                        required 
                                        placeholder="e.g. Scheduled System Upgrade"
                                        value={formData.title}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>
                                
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Message/Description</label>
                                    <textarea 
                                        required 
                                        className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="The system will be unavailable due to..."
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Start Time</label>
                                        <Input 
                                            type="datetime-local" 
                                            required
                                            value={formData.maintenanceStartTime}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, maintenanceStartTime: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">End Time</label>
                                        <Input 
                                            type="datetime-local" 
                                            required
                                            value={formData.maintenanceEndTime}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, maintenanceEndTime: e.target.value})}
                                        />
                                    </div>
                                </div>
                                
                                <div className="border border-slate-200 rounded-lg p-4 space-y-4 mt-4">
                                    <h4 className="text-sm font-semibold text-slate-700">Notification Preferences</h4>
                                    
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <div className="space-y-0.5">
                                            <div className="text-base font-medium">In-App Banner</div>
                                            <p className="text-xs text-slate-500">Show a global alert banner in the dashboard.</p>
                                        </div>
                                        <input 
                                            type="checkbox"
                                            className="w-5 h-5 accent-emerald-600 rounded border-slate-300"
                                            checked={formData.notifyMembersApp} 
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, notifyMembersApp: e.target.checked})} 
                                        />
                                    </label>
                                    
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <div className="space-y-0.5">
                                            <div className="text-base font-medium">SMS Broadcast</div>
                                            <p className="text-xs text-slate-500">Send an SMS alert to all active members immediately.</p>
                                        </div>
                                        <input 
                                            type="checkbox"
                                            className="w-5 h-5 accent-emerald-600 rounded border-slate-300"
                                            checked={formData.notifyMembersSms} 
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, notifyMembersSms: e.target.checked})} 
                                        />
                                    </label>
                                    
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <div className="space-y-0.5">
                                            <div className="text-base font-medium">Email Broadcast</div>
                                            <p className="text-xs text-slate-500">Send an email alert to all active members immediately.</p>
                                        </div>
                                        <input 
                                            type="checkbox"
                                            className="w-5 h-5 accent-emerald-600 rounded border-slate-300"
                                            checked={formData.notifyMembersEmail} 
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, notifyMembersEmail: e.target.checked})} 
                                        />
                                    </label>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
                            <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
                            <Button form="maintenance-form" type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
                                {isSubmitting && <Loader2 size={16} className="mr-2 animate-spin" />}
                                {isSubmitting ? 'Scheduling...' : 'Schedule'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle>Maintenance History</CardTitle>
                    <CardDescription>A log of all past and upcoming maintenance windows.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 flex justify-center text-slate-400">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                            <p className="text-sm font-medium text-slate-600">No events scheduled</p>
                            <p className="text-xs text-slate-400 mt-1">There are no upcoming or past maintenance events.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead>
                                    <tr className="text-slate-500 border-b border-slate-200">
                                        <th className="pb-3 font-medium">Title</th>
                                        <th className="pb-3 font-medium">Start Time</th>
                                        <th className="pb-3 font-medium">End Time</th>
                                        <th className="pb-3 font-medium">Notifications</th>
                                        <th className="pb-3 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {events.sort((a, b) => new Date(b.maintenanceStartTime).getTime() - new Date(a.maintenanceStartTime).getTime()).map(event => {
                                        const isPast = new Date(event.maintenanceEndTime) < new Date();
                                        const isActive = new Date(event.maintenanceStartTime) <= new Date() && new Date(event.maintenanceEndTime) >= new Date();
                                        
                                        return (
                                            <tr key={event.id} className="text-slate-700 hover:bg-slate-50 transition-colors">
                                                <td className="py-3 font-medium">{event.title}</td>
                                                <td className="py-3">{format(new Date(event.maintenanceStartTime), 'MMM dd, yyyy HH:mm')}</td>
                                                <td className="py-3">{format(new Date(event.maintenanceEndTime), 'MMM dd, yyyy HH:mm')}</td>
                                                <td className="py-3">
                                                    <div className="flex gap-2">
                                                        {event.notifyMembersApp && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-200">App</span>}
                                                        {event.notifyMembersSms && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium border border-amber-200">SMS</span>}
                                                        {event.notifyMembersEmail && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium border border-purple-200">Email</span>}
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    {isPast ? (
                                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200">Completed</span>
                                                    ) : isActive ? (
                                                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium border border-green-200 flex items-center gap-1.5 w-max">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                            Ongoing
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-200">Upcoming</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
