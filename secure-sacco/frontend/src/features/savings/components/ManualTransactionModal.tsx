import React, { useState } from 'react';
import { savingsApi } from '../api/savings-api';
import { X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { getApiErrorMessage } from '../../../shared/utils/getApiErrorMessage.ts';
import { Card, Button } from '../../../shared/components';
import { PRIMITIVE_TOKENS } from '@/shared/design';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    memberId: string;
    memberName: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    onSuccess: () => void;
}

export const ManualTransactionModal: React.FC<Props> = ({
    isOpen,
    onClose,
    memberId,
    memberName,
    type,
    onSuccess,
}) => {
    const [amount, setAmount] = useState<number | ''>('');
    const [referenceNotes, setReferenceNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const payload = { memberId, amount: Number(amount), referenceNotes };

            if (type === 'DEPOSIT') {
                await savingsApi.manualDeposit(payload);
            } else {
                await savingsApi.manualWithdrawal(payload);
            }
            onSuccess();
            onClose();
            setAmount('');
            setReferenceNotes('');
        } catch (error: unknown) {
            setError(getApiErrorMessage(error) || 'Transaction failed');
        } finally {
            setIsLoading(false);
        }
    };

    const buttonVariant = type === 'DEPOSIT' ? 'success' : 'warning';

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
                        {type === 'DEPOSIT' ? (
                            <ArrowDownCircle size={20} color="var(--brand-success)" />
                        ) : (
                            <ArrowUpCircle size={20} color="var(--brand-warning)" />
                        )}
                        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
                            Post Cash {type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
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

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: PRIMITIVE_TOKENS.spacing[4] }}>
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

                    <Card variant="outline" padding="sm">
                        <p style={{ margin: 0, fontSize: PRIMITIVE_TOKENS.fontSize.sm[0], color: 'var(--text-secondary)' }}>
                            Member:{' '}
                            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{memberName}</span>
                        </p>
                    </Card>

                    <div>
                        <label style={{ display: 'block', fontSize: PRIMITIVE_TOKENS.fontSize.sm[0], fontWeight: 'bold', marginBottom: PRIMITIVE_TOKENS.spacing[1], color: 'var(--text-primary)' }}>
                            Amount (KES)
                        </label>
                        <input
                            type="number"
                            min="1"
                            step="0.01"
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
                            }}
                            placeholder="e.g. 5000"
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
                            Reference / Receipt Number
                        </label>
                        <input
                            type="text"
                            value={referenceNotes}
                            onChange={(e) => setReferenceNotes(e.target.value)}
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
                            }}
                            placeholder="Optional reference note"
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
                        <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>
                            Cancel
                        </Button>
                        <Button
                            variant={buttonVariant}
                            size="md"
                            state={isLoading ? 'loading' : !amount ? 'disabled' : 'idle'}
                            onClick={handleSubmit}
                            type="submit"
                            style={{ flex: 1 }}
                        >
                            {isLoading ? 'Processing...' : `Post ${type}`}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};