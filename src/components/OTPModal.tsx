import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Shield, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otpCode: string) => Promise<void>;
  onResend: () => Promise<void>;
  purpose: string;
}

export function OTPModal({ isOpen, onClose, onVerify, onResend, purpose }: OTPModalProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      setTimer(60);
      setError('');
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, timer]);

  const handleChange = (index: number, value: string) => {
    if (Object.is(NaN, Number(value))) return;
    
    // Only allow single character
    const newVal = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = newVal;
    setOtp(newOtp);
    setError('');

    // Auto-focus next
    if (newVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');
    try {
      await onVerify(code);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    
    setIsResending(true);
    try {
      await onResend();
      setTimer(60);
      toast.success('Verification code resent');
    } catch (err: any) {
      toast.error('Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Security Verification"
      size="sm"
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-[var(--color-primary)]" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 mb-2">Check your email</h3>
        <p className="text-slate-500 mb-8 max-w-[280px]">
          We've sent a 6-digit verification code to your email for <span className="font-semibold text-slate-700">{purpose.replace(/_/g, ' ').toLowerCase()}</span>.
        </p>

        <div className="flex gap-2 mb-8">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 border-2 border-slate-200 rounded-xl text-center text-2xl font-bold focus:border-[var(--color-primary)] focus:ring-4 focus:ring-blue-50 outline-none transition-all"
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 mb-6 animate-shake">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <Button
          onClick={handleVerify}
          fullWidth
          disabled={isVerifying}
          className="mb-6 h-12"
        >
          {isVerifying ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying...</span>
            </div>
          ) : (
            'Verify & Proceed'
          )}
        </Button>

        <div className="text-sm text-slate-500">
          Didn't receive the code?{' '}
          {timer > 0 ? (
            <span className="text-slate-400">Resend in {formatTimer(timer)}</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-[var(--color-primary)] font-semibold hover:underline flex items-center gap-1 mx-auto"
            >
              {isResending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Resend now
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
