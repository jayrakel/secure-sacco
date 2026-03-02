import React, { useState } from 'react';
import { paymentApi } from '../api/payment-api';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    accountReference: string;
    title?: string;
    description?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
                                                              isOpen,
                                                              onClose,
                                                              amount,
                                                              accountReference,
                                                              title = 'Make a Payment',
                                                              description = 'Enter your M-Pesa phone number to receive a payment prompt.'
                                                          }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    if (!isOpen) return null;

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            const response = await paymentApi.initiateStkPush({
                phoneNumber,
                amount,
                accountReference
            });
            setSuccessMessage(response.customerMessage || 'Please check your phone to complete the payment.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        // Reset state on close
        setPhoneNumber('');
        setError('');
        setSuccessMessage('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                    <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none">&times;</button>
                </div>

                <p className="text-gray-600 mb-4 text-sm">{description}</p>
                <div className="mb-6 bg-blue-50 text-blue-800 p-3 rounded-md text-sm border border-blue-100 flex justify-between items-center">
                    <span className="font-semibold">Amount to pay:</span>
                    <span className="font-bold text-lg">KES {amount.toLocaleString()}</span>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                        {error}
                    </div>
                )}

                {successMessage ? (
                    <div className="text-center py-4">
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
                            <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="font-medium text-base mb-1">Request Sent Successfully!</p>
                            <p>{successMessage}</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition font-medium w-full"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handlePayment}>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-semibold mb-2">
                                M-Pesa Phone Number
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    className="pl-10 shadow-sm appearance-none border border-gray-300 rounded-md w-full py-2.5 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="e.g. 0712345678"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md font-medium transition"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !phoneNumber}
                                className={`bg-green-600 text-white px-5 py-2 rounded-md font-medium hover:bg-green-700 transition flex items-center shadow-sm ${isLoading || !phoneNumber ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending...
                                    </>
                                ) : (
                                    'Pay via M-Pesa'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};