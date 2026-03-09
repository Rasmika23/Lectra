import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { Card } from '../components/Card';
import { Mail, Lock, Sparkles, KeyRound, ArrowLeft } from 'lucide-react';
import logo from '../assets/lectra_logo.png';


interface LoginPageProps {
  onLogin: (user: any, remember: boolean) => void;
  onNavigate: (page: string) => void;
}

interface LoginFormInputs {
  email: string;
  password?: string;
  otp?: string;
  rememberMe: boolean;
}

export function LoginPage({ onLogin, onNavigate }: LoginPageProps) {
  const [otpSent, setOtpSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    resetField
  } = useForm<LoginFormInputs>({
    defaultValues: {
      email: '',
      password: '',
      otp: '',
      rememberMe: false
    }
  });

  const email = watch('email');

  const onSubmit = async (data: LoginFormInputs) => {
    setServerError('');
    setSuccessMessage('');
    setIsLoading(true);

    const endpoint = otpSent ? 'http://localhost:5000/verify-otp' : 'http://localhost:5000/login';
    const body = otpSent
      ? { email: data.email, otp: data.otp }
      : { email: data.email, password: data.password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        if (!otpSent && result.status === 'OTP_REQUIRED') {
          // Step 1 Success: OTP Sent
          setOtpSent(true);
          setSuccessMessage(result.message);

          // Clear password validation as we switch modes
          // but we keep the email value
          setValue('otp', '');

          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          // Step 2 Success: Login Complete
          onLogin(result, data.rememberMe);
        }
      } else {
        setServerError(result.error || 'Authentication failed');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error(err);
      setServerError('Connection to server failed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setOtpSent(false);
    setValue('otp', '');
    setServerError('');
    setSuccessMessage('');
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
        {successMessage && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-md border border-blue-200">
            {successMessage}
          </div>
        )}
        {serverError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-[var(--space-lg)]">
          {!otpSent ? (
            // Step 1: Email & Password
            <>
              <Input
                label="Email Address"
                type="email"
                placeholder="your.email@university.edu"
                autoComplete="email"
                icon={<Mail />}
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address"
                  }
                })}
                error={errors.email?.message}
                fullWidth
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                icon={<Lock />}
                {...register("password", {
                  required: "Password is required"
                })}
                error={errors.password?.message}
                fullWidth
              />

              <div className="flex items-center justify-between">
                <Checkbox
                  label="Remember me"
                  {...register("rememberMe")}
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

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Verifying as:</p>
                <p className="font-medium text-gray-900">{email}</p>
              </div>

              <Input
                label="One-Time Password (OTP)"
                type="text"
                placeholder="Enter 6-digit code"
                autoFocus
                icon={<KeyRound />}
                helperText="Check your email for the verification code"
                {...register("otp", {
                  required: "OTP is required",
                  minLength: {
                    value: 6,
                    message: "OTP must be exactly 6 digits"
                  },
                  maxLength: {
                    value: 6,
                    message: "OTP must be exactly 6 digits"
                  },
                  pattern: {
                    value: /^[0-9]+$/,
                    message: "OTP must contain only numbers"
                  }
                })}
                error={errors.otp?.message}
                fullWidth
                // Enforce numeric input
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  target.value = target.value.replace(/\D/g, '').slice(0, 6);
                  setValue('otp', target.value);
                }}
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