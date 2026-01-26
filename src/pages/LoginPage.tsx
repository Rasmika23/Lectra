import React, { useState } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { Card } from '../components/Card';
import { Mail, Lock, Sparkles, KeyRound, ArrowLeft } from 'lucide-react';
import logo from '../assets/lectra_logo.png';


interface LoginPageProps {
  onLogin: (user: any) => void;
  onNavigate: (page: string) => void;
}

export function LoginPage({ onLogin, onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    const endpoint = otpSent ? 'http://localhost:5000/verify-otp' : 'http://localhost:5000/login';
    const body = otpSent ? { email, otp } : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (!otpSent && data.status === 'OTP_REQUIRED') {
          // Step 1 Success: OTP Sent
          setOtpSent(true);
          setMessage(data.message);
        } else {
          // Step 2 Success: Login Complete
          onLogin(data);
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to server failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setOtpSent(false);
    setOtp('');
    setError('');
    setMessage('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-secondary)] to-[#0a3a5a] p-[var(--space-lg)] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite]"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}></div>

      <Card className="w-full max-w-md relative z-10 animate-[scaleIn_0.5s_ease-out] backdrop-blur-sm">
        <div className="text-center mb-[var(--space-xl)]">
          <div className="relative inline-block">
            <img src={logo} alt="Lectra" className="h-16 w-auto mb-[var(--space-sm)]" />
            <Sparkles className="absolute -top-2 -right-6 w-5 h-5 text-[var(--color-primary)] animate-[spin_3s_linear_infinite]" />
          </div>
        </div>

        {/* Status Messages */}
        {message && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-md border border-blue-200">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-[var(--space-lg)]">
          {!otpSent ? (
            // Step 1: Email & Password
            <>
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
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                autoComplete="current-password"
                icon={<Lock />}
              />

              <div className="flex items-center justify-between">
                <Checkbox
                  label="Remember me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-[var(--font-size-small)] text-[var(--color-primary)] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </>
          ) : (
            // Step 2: OTP Input
            <div className="animate-[fadeIn_0.3s_ease-in]">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <Input
                label="One-Time Password (OTP)"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                fullWidth
                autoFocus
                icon={<KeyRound />}
                helperText="Check your email for the verification code"
              />
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : otpSent ? 'Verify OTP & Login' : 'Continue'}
          </Button>
        </form>

        <p className="mt-[var(--space-lg)] text-[var(--font-size-tiny)] text-[var(--color-text-secondary)] text-center">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </Card>
    </div>
  );
}