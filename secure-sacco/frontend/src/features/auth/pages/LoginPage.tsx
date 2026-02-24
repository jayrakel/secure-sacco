import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import apiClient from '../../../shared/api/api-client';

const LoginPage: React.FC = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ identifier?: string; password?: string; general?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login } = useAuth(); //
    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors: typeof errors = {};

        // 1. Identifier Validation (Email or Phone Number)
        // Matches logic in LoginIdentifierUserDetailsService
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[1-9]\d{1,14}$/; // Generic E.164 phone validation

        if (!identifier) {
            newErrors.identifier = 'Email or Phone Number is required.';
        } else if (!emailRegex.test(identifier) && !phoneRegex.test(identifier)) {
            newErrors.identifier = 'Enter a valid email or phone number.';
        }

        // 2. Password Complexity Validation
        // Enforces the 12-character policy defined in PasswordValidator
        if (password.length < 12) {
            newErrors.password = 'Password must be at least 12 characters long.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            // Sends credentials with automatic CSRF header injection
            const response = await apiClient.post('/auth/login', {
                identifier: identifier.trim(),
                password,
            });

            login(response.data); //
            navigate('/dashboard');
        } catch (err: any) {
            setErrors({
                general: err.response?.data?.message || 'Authentication failed. Please check your credentials.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Secure SACCO Login</h2>

                {errors.general && (
                    <div className="alert alert-error">{errors.general}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email or Phone Number</label>
                        <input
                            type="text"
                            className={errors.identifier ? 'input-error' : ''}
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="e.g. admin@sacco.org or +254..."
                        />
                        {errors.identifier && <span className="error-text">{errors.identifier}</span>}
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            className={errors.password ? 'input-error' : ''}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                        />
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Verifying...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;