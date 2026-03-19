import React, { useState, useEffect } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { User, Lock, Sparkles, CheckCircle } from 'lucide-react';
import { useScrollToTop } from '../lib/hooks';

interface SetupAccountPageProps {
    onNavigate: (page: string) => void;
    onLogin: (user: any, token?: string) => void;
}

export function SetupAccountPage({ onNavigate, onLogin }: SetupAccountPageProps) {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useScrollToTop(null, [error]);

    useEffect(() => {
        // Extract email from URL parameters
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('http://localhost:5000/users/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, name, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Auto-login the user after setup using the returned user and token
                if (data.user && data.token) {
                    onLogin(data.user, data.token);
                } else {
                    setIsSuccess(true);
                }
            } else {
                setError(data.error || 'Failed to setup account');
            }
        } catch (err) {
            console.error(err);
            setError('Connection to server failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-secondary)] to-[#0a3a5a] p-[var(--space-lg)]">
                <Card className="w-full max-w-md animate-[scaleIn_0.5s_ease-out] backdrop-blur-sm text-center p-[var(--space-xl)]">
                    <div className="flex justify-center mb-[var(--space-lg)]">
                        <CheckCircle className="w-16 h-16 text-[var(--color-success)]" />
                    </div>
                    <h1 className="text-[var(--font-size-h2)] font-bold text-[var(--color-text-primary)] mb-[var(--space-md)]">
                        Account Setup Complete!
                    </h1>
                    <p className="text-[var(--color-text-secondary)] mb-[var(--space-xl)]">
                        Your account has been successfully configured. You can now log in with your new credentials.
                    </p>
                    <Button
                        onClick={() => {
                            // Clear URL params and navigate to login
                            window.history.pushState({}, '', '/');
                            onNavigate('login');
                        }}
                        variant="primary"
                        size="lg"
                        fullWidth
                    >
                        Go to Login
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-secondary)] to-[#0a3a5a] p-[var(--space-lg)] relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}></div>

            <Card className="w-full max-w-md relative z-10 animate-[scaleIn_0.5s_ease-out] backdrop-blur-sm">
                <div className="text-center mb-[var(--space-xl)]">
                    <div className="relative inline-block">
                        <h1 className="text-[var(--font-size-h1)] font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent mb-[var(--space-sm)]">
                            Welcome to Lectra
                        </h1>
                        <Sparkles className="absolute -top-2 -right-6 w-5 h-5 text-[var(--color-primary)] animate-[spin_3s_linear_infinite]" />
                    </div>
                    <p className="text-[var(--color-text-secondary)]">
                        Set up your account details
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-[var(--space-lg)]">


                    <Input
                        label="Full Name"
                        type="text"
                        placeholder="e.g. John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        fullWidth
                        icon={<User />}
                    />

                    <Input
                        label="New Password"
                        type="password"
                        placeholder="Choose a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        fullWidth
                        icon={<Lock />}
                    />

                    <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        fullWidth
                        error={error}
                        icon={<Lock />}
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Setting up...' : 'Complete Setup'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
