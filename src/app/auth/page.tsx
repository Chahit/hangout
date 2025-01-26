'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email.endsWith('@snu.edu.in')) {
        setError('Please use your SNU email address.');
        return;
      }

      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setShowOtpInput(true);
    } catch (error) {
      console.error('Send OTP error:', error);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      router.push(data.redirectTo);
    } catch (error) {
      console.error('Verify OTP error:', error);
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md space-y-8 p-6 rounded-xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text font-clash-display">
            SNU Hangout
          </h1>
          <p className="text-zinc-400">
            Your campus, your community, your vibe
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
            <div className="flex">
              <div className="flex-1 text-sm text-red-400">{error}</div>
            </div>
          </div>
        )}

        <form onSubmit={showOtpInput ? handleVerifyOTP : handleSendOTP} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-zinc-300">
              SNU Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name.lastname@snu.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 p-3 bg-zinc-900/50 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              disabled={loading || showOtpInput}
            />
          </div>

          {showOtpInput && (
            <div>
              <label htmlFor="otp" className="block text-sm font-medium mb-2 text-zinc-300">
                Enter OTP
              </label>
              <input
                id="otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 p-3 bg-zinc-900/50 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                maxLength={6}
                disabled={loading}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading 
              ? 'Processing...' 
              : showOtpInput 
                ? 'Verify OTP' 
                : 'Send OTP'
            }
          </button>

          {showOtpInput && (
            <button
              type="button"
              onClick={() => {
                setShowOtpInput(false);
                setOtp('');
                setError(null);
              }}
              className="w-full py-2 px-4 bg-transparent text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              Back to Email
            </button>
          )}
        </form>
      </div>
    </div>
  );
} 