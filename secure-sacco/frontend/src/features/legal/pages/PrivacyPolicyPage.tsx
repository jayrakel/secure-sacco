import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
    const navigate = useNavigate();

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
                    <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>

                    <div className="space-y-6 text-slate-700 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">1. Introduction</h2>
                            <p>
                                We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Secure SACCO System.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">2. Information We Collect</h2>
                            <p>We may collect information about you in a variety of ways. The information we may collect on the site includes:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                                <li>Personal identification information (name, email address, phone number, etc.)</li>
                                <li>Financial information (account balances, transaction history)</li>
                                <li>Device information (IP address, browser type, operating system)</li>
                                <li>Usage data and analytics</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">3. Use of Your Information</h2>
                            <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the site to:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                                <li>Process transactions and send related information</li>
                                <li>Email regarding your account or order</li>
                                <li>Fulfill and manage purchases, orders, or payments</li>
                                <li>Generate a personal profile about you to make future visits to the site easier</li>
                                <li>Increase the efficiency and operation of the site</li>
                                <li>Monitor and analyze usage and trends to improve your experience</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">4. Disclosure of Your Information</h2>
                            <p>We may share your information in the following situations:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                                <li>By Law or to Protect Rights</li>
                                <li>Third-Party Service Providers</li>
                                <li>Affiliates and Partners</li>
                                <li>Business Transfers</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">5. Security of Your Information</h2>
                            <p>
                                We use administrative, technical, and physical security measures to protect your personal information. However, perfect security does not exist on the Internet.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">6. Contact Us</h2>
                            <p>
                                If you have questions or comments about this Privacy Policy, please contact us at:
                            </p>
                            <p className="mt-2 font-semibold">support@sacco.local</p>
                        </section>

                        <section>
                            <p className="text-slate-500 text-sm mt-8">Last updated: {new Date().toLocaleDateString()}</p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

