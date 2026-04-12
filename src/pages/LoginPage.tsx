import React, { useState } from 'react';
import logo from '../assets/lectra_logo.png';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { Card } from '../components/Card';
import { Mail, Lock, Sparkles } from 'lucide-react';
import { getUserByEmail } from '../lib/mockData';

interface LoginPageProps {
  onLogin: (user: any, token?: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.user || data, data.token); // Handle both old and new response formats during transition
      } else {
        setError(data.error || 'Login failed');
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
      {/* Animated background elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite]"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}></div>

      <Card className="w-full max-w-md relative z-10 animate-[scaleIn_0.5s_ease-out] backdrop-blur-sm">
        <div className="text-center mb-[var(--space-xl)] flex flex-col items-center">
          <div className="relative inline-block mb-[var(--space-sm)]">
            <img
              src={logo}
              alt="Lectra Logo"
              className="h-16 w-auto object-contain animate-[fadeIn_0.5s_ease-out] mt-5 mb-5"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-[var(--space-lg)]">
          <Input
            label="Email Address"
            type="email"
            placeholder="Enter your e-mail address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
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
            error={error}
          />

          <div className="flex items-center justify-between">
            <Checkbox
              label="Remember me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              labelClassName="text-[13px] text-[var(--color-text-secondary)]"
            />
            <button
              type="button"
              className="text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:underline transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>

          <p className="mt-[var(--space-md)] text-center text-[14px] text-[var(--color-text-secondary)]">
            If you don't have an account,<br></br> please contact the administration.
          </p>
        </form>

        <div className="mt-[var(--space-xl)] pt-[var(--space-lg)] border-t border-[#E2E8F0]">
          <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)] text-center">
            Demo credentials available for testing:
          </p>
          <div className="mt-[var(--space-md)] space-y-[var(--space-xs)] text-[var(--font-size-small)] text-center">
            <p><strong>Main Coordinator:</strong> main.coordinator@university.edu</p>
            <p><strong>Sub Coordinator:</strong> sub.coordinator@university.edu</p>
            <p><strong>Lecturer:</strong> lecturer1@example.com</p>
            <p><strong>Staff:</strong> staff@university.edu</p>
            <p className="text-[var(--color-text-disabled)] mt-[var(--space-sm)]">Password: password123</p>
          </div>
        </div>

        <p className="mt-[var(--space-lg)] text-[var(--font-size-tiny)] text-[var(--color-text-secondary)] text-center">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </Card>
    </div>
  );
}