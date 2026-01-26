import React, { useState } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Mail, ArrowLeft, Sparkles } from 'lucide-react';
import logo from '../assets/lectra_logo.png';

interface ForgotPasswordPageProps {
    onNavigate: (page: string) => void;
}

export function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:5000/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
            } else {
                setError(data.error || 'Request failed');
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
                        Reset Password
                    </h2>
                    <p className="text-[var(--color-text-secondary)] text-[var(--font-size-small)] mt-2">
                        Enter your email to receive a reset link
                    </p>
                </div>

                {message ? (
                    <div className="text-center space-y-4">
                        <div className="p-4 bg-green-50 text-green-700 rounded-md">
                            {message}
                        </div>
                        <Button
                            variant="outline"
                            fullWidth
                            onClick={() => onNavigate('login')}
                        >
                            Back to Login
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-[var(--space-lg)]">
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="your.email@university.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            fullWidth
                            autoComplete="email"
                            icon={<Mail />}
                            error={error}
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            fullWidth
                            disabled={isLoading}
                        >
                            {isLoading ? 'Sending Link...' : 'Send Reset Link'}
                        </Button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => onNavigate('login')}
                                className="text-[var(--font-size-small)] text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                            >
                                <ArrowLeft size={14} /> Back to Login
                            </button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
}
