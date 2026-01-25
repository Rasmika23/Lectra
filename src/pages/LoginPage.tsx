import React, { useState } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { Card } from '../components/Card';
import { Mail, Lock, Sparkles } from 'lucide-react';
import { getUserByEmail } from '../lib/mockData';

interface LoginPageProps {
  onLogin: (user: any) => void;
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
        onLogin(data);
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
        <div className="text-center mb-[var(--space-xl)]">
          <div className="relative inline-block">
            <h1 className="text-[var(--font-size-h1)] font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent mb-[var(--space-sm)]">
              Lectra
            </h1>
            <Sparkles className="absolute -top-2 -right-6 w-5 h-5 text-[var(--color-primary)] animate-[spin_3s_linear_infinite]" />
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Visiting Lecturers Management System
          </p>
        </div>

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
              className="text-[var(--font-size-small)] text-[var(--color-primary)] hover:underline"
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