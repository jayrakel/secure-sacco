import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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
                    <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>

                    <div className="space-y-6 text-slate-700 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">1. Agreement to Terms</h2>
                            <p>
                                By accessing and using the Secure SACCO System, you accept and agree to be bound by and comply with these Terms and Conditions. If you do not agree to abide by the above, please do not use this service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">2. Use License</h2>
                            <p>
                                Permission is granted to temporarily download one copy of the materials (information or software) on the Secure SACCO System for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                            </p>
                            <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                                <li>Modify or copy the materials</li>
                                <li>Use the materials for any commercial purpose or for any public display</li>
                                <li>Attempt to decompile or reverse engineer any software contained on the system</li>
                                <li>Remove any copyright or other proprietary notations from the materials</li>
                                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">3. Disclaimer</h2>
                            <p>
                                The materials on the Secure SACCO System are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">4. Limitations</h2>
                            <p>
                                In no event shall the Secure SACCO System or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the Secure SACCO System.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">5. Accuracy of Materials</h2>
                            <p>
                                The materials appearing on the Secure SACCO System could include technical, typographical, or photographic errors. We do not warrant that any of the materials on the Secure SACCO System are accurate, complete, or current. We may make changes to the materials contained on the Secure SACCO System at any time without notice.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">6. Links</h2>
                            <p>
                                We have not reviewed all of the sites linked to our site and are not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by us of the site. Use of any such linked website is at the user's own risk.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">7. Modifications</h2>
                            <p>
                                We may revise these Terms and Conditions for the Secure SACCO System at any time without notice. By using this system, you are agreeing to be bound by the then current version of these Terms and Conditions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-3">8. Governing Law</h2>
                            <p>
                                These Terms and Conditions are governed by and construed in accordance with the laws of the jurisdiction in which the SACCO operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
                            </p>
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

