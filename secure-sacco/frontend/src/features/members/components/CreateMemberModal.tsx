import React, { useState } from 'react';
import { memberApi } from '../api/member-api';
import type { CreateMemberRequest } from '../api/member-api';

interface CreateMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateMemberModal: React.FC<CreateMemberModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState<CreateMemberRequest>({
        firstName: '',
        middleName: '',
        lastName: '',
        nationalId: '',
        phoneNumber: '',
        email: '',
        dateOfBirth: '',
        gender: 'PREFER_NOT_TO_SAY'
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            // Clean up empty strings before sending to backend
            const payload = { ...formData };
            if (!payload.middleName) delete payload.middleName;
            if (!payload.nationalId) delete payload.nationalId;
            if (!payload.phoneNumber) delete payload.phoneNumber;
            if (!payload.email) delete payload.email;
            if (!payload.dateOfBirth) delete payload.dateOfBirth;

            await memberApi.createMember(payload);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to create member');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-slate-800">Register New Member</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors text-2xl leading-none">
                        &times;
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form id="create-member-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">First Name *</label>
                                <input type="text" name="firstName" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.firstName} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Middle Name</label>
                                <input type="text" name="middleName" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.middleName} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name *</label>
                                <input type="text" name="lastName" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.lastName} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">National ID</label>
                                <input type="text" name="nationalId" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.nationalId} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                                <input type="text" name="phoneNumber" placeholder="e.g., +254700000000" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.phoneNumber} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                                <input type="email" name="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.email} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Date of Birth</label>
                                <input type="date" name="dateOfBirth" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.dateOfBirth} onChange={handleChange} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Gender</label>
                            <select name="gender" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.gender} onChange={handleChange}>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="OTHER">Other</option>
                                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                            </select>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 mt-auto shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button form="create-member-form" type="submit" disabled={isSubmitting} className="px-5 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2">
                        {isSubmitting && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>}
                        {isSubmitting ? 'Registering...' : 'Complete Registration'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateMemberModal;