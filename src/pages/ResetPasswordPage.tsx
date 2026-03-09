import React, { useState, useEffect } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Lock, Sparkles } from 'lucide-react';
import logo from '../assets/lectra_logo.png';

interface ResetPasswordPageProps {
    onNavigate: (page: string) => void;
}

export function ResetPasswordPage({ onNavigate }: ResetPasswordPageProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setToken(params.get('token'));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!token) {
            setError("Invalid or missing token");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:5000/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setTimeout(() => {
                    // clear query params
                    window.history.pushState({}, '', '/');
                    onNavigate('login');
                }, 3000);
            } else {
                setError(data.error || 'Reset failed');
            }
        } catch (err) {
            console.error(err);
            setError('Connection to server failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-secondary)] to-[#0a3a5a] p-[var(--space-lg)] relative overflow-hidden">
            {/* Animated background elements matching login page */}
            <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}></div>

            <Card className="w-full max-w-md relative z-10 animate-[scaleIn_0.5s_ease-out] backdrop-blur-sm">
                <div className="text-center mb-[var(--space-xl)]">
                    <div className="relative inline-block">
                        <img src={logo} alt="Lectra" className="h-16 w-auto mb-[var(--space-sm)]" />
                        <Sparkles className="absolute -top-2 -right-6 w-5 h-5 text-[var(--color-primary)] animate-[spin_3s_linear_infinite]" />
                    </div>
                    <h2 className="text-[var(--font-size-xlarge)] font-bold text-[var(--color-text-primary)] mt-2">
                        Set New Password
                    </h2>
                </div>

                {message ? (
                    <div className="text-center space-y-4">
                        <div className="p-4 bg-green-50 text-green-700 rounded-md">
                            {message}
                        </div>
                        <p className="text-sm text-gray-500">Redirecting to login...</p>
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={() => {
                                window.history.pushState({}, '', '/');
                                onNavigate('login')
                            }}
                        >
                            Go to Login Now
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-[var(--space-lg)]">
                        <Input
                            label="New Password"
                            type="password"
                            placeholder="Enter new password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            fullWidth
                            autoComplete="new-password"
                            icon={<Lock />}
                        />
                        <Input
                            label="Confirm Password"
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            fullWidth
                            autoComplete="new-password"
                            icon={<Lock />}
                            error={error}
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            fullWidth
                            disabled={isLoading}
                        >
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </form>
                )}
            </Card>
        </div>
    );
}
