import React, { useState } from 'react';
import { savingsApi } from '../api/savings-api';
import { X, Smartphone, CheckCircle2 } from 'lucide-react';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage.ts';
import { Card, Button } from '../../../shared/components';
import { PRIMITIVE_TOKENS } from '@/shared/design';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const MpesaDepositModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'INPUT' | 'PROCESSING' | 'SUCCESS'>('INPUT');
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await savingsApi.initiateMpesaDeposit({
                phoneNumber,
                amount: Number(amount),
            });
            setMessage(response.customerMessage || 'Please check your phone for the M-Pesa PIN prompt.');
            setStep('SUCCESS');
            onSuccess();
        } catch (error: unknown) {
            setError(getApiErrorMessage(error, 'Failed to initiate M-Pesa push'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setStep('INPUT');
        setAmount('');
        setPhoneNumber('');
        setError('');
        setIsLoading(false);
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: PRIMITIVE_TOKENS.blur.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
                padding: PRIMITIVE_TOKENS.spacing[4],
            }}
        >
            <Card
                variant="solid"
                padding="lg"
                style={{
                    maxWidth: '28rem',
                    width: '100%',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: PRIMITIVE_TOKENS.spacing[4],
                        paddingBottom: PRIMITIVE_TOKENS.spacing[4],
                        borderBottom: `1px solid var(--border-light)`,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: PRIMITIVE_TOKENS.spacing[2] }}>
                        <Smartphone size={20} color="var(--brand-primary)" />
                        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>M-Pesa Savings Deposit</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            padding: 0,
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {step === 'INPUT' && (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: PRIMITIVE_TOKENS.spacing[4] }}>
                        <p style={{ fontSize: PRIMITIVE_TOKENS.fontSize.sm[0], color: 'var(--text-secondary)', margin: 0 }}>
                            Enter your M-Pesa phone number and the amount you wish to save. We will send a secure prompt directly to your phone.
                        </p>

                        {error && (
                            <div
                                style={{
                                    padding: PRIMITIVE_TOKENS.spacing[3],
                                    background: 'color-mix(in srgb, var(--brand-error) 10%, white)',
                                    border: `1px solid color-mix(in srgb, var(--brand-error) 30%, white)`,
                                    borderRadius: PRIMITIVE_TOKENS.radius.md,
                                    color: 'var(--brand-error)',
                                    fontSize: PRIMITIVE_TOKENS.fontSize.sm[0],
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', fontSize: PRIMITIVE_TOKENS.fontSize.sm[0], fontWeight: 'bold', marginBottom: PRIMITIVE_TOKENS.spacing[1], color: 'var(--text-primary)' }}>
                                M-Pesa Phone Number
                            </label>
                            <input
                                type="text"
                                required
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: PRIMITIVE_TOKENS.spacing[2],
                                    border: `1px solid var(--border-default)`,
                                    borderRadius: PRIMITIVE_TOKENS.radius.md,
                                    background: 'var(--surface-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: PRIMITIVE_TOKENS.fontSize.base[0],
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'monospace',
                                }}
                                placeholder="e.g. 0712345678"
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--brand-primary)';
                                    e.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--brand-primary) 20%, transparent)`;
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border-default)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: PRIMITIVE_TOKENS.fontSize.sm[0], fontWeight: 'bold', marginBottom: PRIMITIVE_TOKENS.spacing[1], color: 'var(--text-primary)' }}>
                                Amount (KES)
                            </label>
                            <input
                                type="number"
                                min="1"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                                style={{
                                    width: '100%',
                                    padding: PRIMITIVE_TOKENS.spacing[2],
                                    border: `1px solid var(--border-default)`,
                                    borderRadius: PRIMITIVE_TOKENS.radius.md,
                                    background: 'var(--surface-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: PRIMITIVE_TOKENS.fontSize.base[0],
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'monospace',
                                }}
                                placeholder="e.g. 1000"
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--brand-primary)';
                                    e.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--brand-primary) 20%, transparent)`;
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border-default)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                gap: PRIMITIVE_TOKENS.spacing[3],
                                marginTop: PRIMITIVE_TOKENS.spacing[2],
                            }}
                        >
                            <Button variant="secondary" size="md" onClick={handleClose} style={{ flex: 1 }}>
                                Cancel
                            </Button>
                            <Button
                                variant="success"
                                size="md"
                                state={isLoading ? 'loading' : !amount || !phoneNumber ? 'disabled' : 'idle'}
                                style={{ flex: 1 }}
                            >
                                {isLoading ? 'Sending...' : 'Send Prompt'}
                            </Button>
                        </div>
                    </form>
                )}

                {step === 'SUCCESS' && (
                    <div
                        style={{
                            padding: PRIMITIVE_TOKENS.spacing[8],
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: PRIMITIVE_TOKENS.spacing[4],
                        }}
                    >
                        <div
                            style={{
                                width: '4rem',
                                height: '4rem',
                                background: 'color-mix(in srgb, var(--brand-success) 15%, white)',
                                color: 'var(--brand-success)',
                                borderRadius: PRIMITIVE_TOKENS.radius.full,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto',
                            }}
                        >
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 style={{ fontSize: PRIMITIVE_TOKENS.fontSize.xl[0], fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                            Prompt Sent!
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: PRIMITIVE_TOKENS.fontSize.sm[0], margin: 0, lineHeight: '1.5' }}>
                            {message}
                        </p>
                        <div style={{ marginTop: PRIMITIVE_TOKENS.spacing[4] }}>
                            <Button variant="primary" size="md" onClick={handleClose} fullWidth>
                                Done
                            </Button>
                        </div>
                        <p style={{ fontSize: PRIMITIVE_TOKENS.fontSize.xs[0], color: 'var(--text-secondary)', margin: 0, marginTop: PRIMITIVE_TOKENS.spacing[4], fontStyle: 'italic' }}>
                            Once you enter your PIN, refresh your dashboard to see your updated balance.
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );
};