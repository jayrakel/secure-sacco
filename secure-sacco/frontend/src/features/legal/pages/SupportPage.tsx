import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MessageSquare } from 'lucide-react';

export default function SupportPage() {
    const navigate = useNavigate();
    const [messageStatus, setMessageStatus] = useState('');

    const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessageStatus('Message sent successfully! We will respond within 24 hours.');
        const form = e.target as HTMLFormElement;
        form.reset();
        setTimeout(() => setMessageStatus(''), 5000);
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-8 font-semibold"
                >
                    <ArrowLeft size={18} /> Back to Login
                </button>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Support Center</h1>
                    <p className="text-slate-600 mb-8">We're here to help. Get in touch with our support team.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {/* Contact Methods */}
                        <div className="p-6 bg-emerald-50 rounded-lg border border-emerald-200">
                            <div className="flex items-center gap-3 mb-4">
                                <Mail className="text-emerald-600" size={24} />
                                <h3 className="text-lg font-bold text-slate-800">Email</h3>
                            </div>
                            <p className="text-slate-700">support@sacco.local</p>
                            <p className="text-slate-500 text-sm mt-2">Response time: 24 hours</p>
                        </div>

                        <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-3 mb-4">
                                <Phone className="text-blue-600" size={24} />
                                <h3 className="text-lg font-bold text-slate-800">Phone</h3>
                            </div>
                            <p className="text-slate-700">+254 (0) 123 456 789</p>
                            <p className="text-slate-500 text-sm mt-2">Mon-Fri, 9 AM - 5 PM</p>
                        </div>

                        <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-3 mb-4">
                                <MessageSquare className="text-purple-600" size={24} />
                                <h3 className="text-lg font-bold text-slate-800">Live Chat</h3>
                            </div>
                            <p className="text-slate-700">Available 9 AM - 5 PM</p>
                            <p className="text-slate-500 text-sm mt-2">Ask a question now</p>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="border-t pt-8">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Send us a Message</h2>

                        {messageStatus && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                                {messageStatus}
                            </div>
                        )}

                        <form onSubmit={handleContactSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Your name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="your@email.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="How can we help?"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                                <textarea
                                    required
                                    rows={5}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Tell us more about your issue..."
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition"
                            >
                                Send Message
                            </button>
                        </form>
                    </div>

                    {/* FAQ Section */}
                    <div className="border-t mt-8 pt-8">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Frequently Asked Questions</h2>

                        <div className="space-y-4">
                            <details className="p-4 bg-slate-50 rounded-lg">
                                <summary className="font-semibold text-slate-800 cursor-pointer">How do I reset my password?</summary>
                                <p className="mt-2 text-slate-700">Click "Forgot Password?" on the login page and follow the instructions sent to your email.</p>
                            </details>

                            <details className="p-4 bg-slate-50 rounded-lg">
                                <summary className="font-semibold text-slate-800 cursor-pointer">What if I forgot my username?</summary>
                                <p className="mt-2 text-slate-700">Contact our support team with your registered email or phone number and we'll help you recover your account.</p>
                            </details>

                            <details className="p-4 bg-slate-50 rounded-lg">
                                <summary className="font-semibold text-slate-800 cursor-pointer">Is my account secure?</summary>
                                <p className="mt-2 text-slate-700">Yes, we use industry-leading encryption and security measures to protect your data. Never share your password with anyone.</p>
                            </details>

                            <details className="p-4 bg-slate-50 rounded-lg">
                                <summary className="font-semibold text-slate-800 cursor-pointer">How do I enable two-factor authentication?</summary>
                                <p className="mt-2 text-slate-700">Once logged in, go to Settings &gt; Security Settings to enable two-factor authentication for added protection.</p>
                            </details>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

