import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  KeyRound,
  MessageSquare,
} from 'lucide-react';
import {
  loginUser,
  requestRegisterOtp,
  verifyRegisterOtp,
  resendRegisterOtp,
  requestForgotPassword,
  resetPassword,
} from '../services/api';

export default function AuthModal({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'forgot' | 'reset-otp'

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('email'); // 'email' | 'whatsapp'
  const [rememberMe, setRememberMe] = useState(true);

  // OTP Fields
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // State Management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Handle Initial Form Submission (Login OR Step 1 Register OTP)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    let cleanEmail = email.trim().toLowerCase();
    // Auto-fix common email domain typos
    cleanEmail = cleanEmail
      .replace(/@gmai\.com$/i, '@gmail.com')
      .replace(/@gamil\.com$/i, '@gmail.com')
      .replace(/@gmial\.com$/i, '@gmail.com')
      .replace(/@gmaill\.com$/i, '@gmail.com');
    setEmail(cleanEmail);

    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    // Login Flow
    if (!isRegister) {
      setIsLoading(true);
      try {
        const res = await loginUser(cleanEmail, password);
        if (res && res.user) {
          onLoginSuccess(res.user);
        }
      } catch (err) {
        setError(err.message || 'Invalid email or password.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Register Flow (Step 1: Request 6-digit OTP)
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestRegisterOtp({
        name: cleanName,
        email: cleanEmail,
        phone: phone.trim(),
        password,
        deliveryMethod,
      });

      if (res && res.success) {
        setStep('otp');
        setOtp('');
        setResendCooldown(60);
        setSuccessMessage(res.message || `Verification code sent to ${cleanEmail}`);
      }
    } catch (err) {
      setError(err.message || 'Could not send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyRegisterOtp({
        email: email.trim(),
        otp: cleanOtp,
      });

      if (res && res.user) {
        setSuccessMessage('Account verified successfully! Redirecting...');
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 600);
      }
    } catch (err) {
      setError(err.message || 'Verification code is invalid or has expired.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setIsLoading(true);

    try {
      const res = await resendRegisterOtp(email.trim());
      if (res && res.success) {
        setResendCooldown(60);
        setSuccessMessage(`Fresh verification code sent to ${email.trim()}`);
      }
    } catch (err) {
      setError(err.message || 'Could not resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Request Password Reset Code
  const handleRequestResetOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    let cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError('Please provide a valid registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestForgotPassword(cleanEmail);
      setSuccessMessage(res.message || 'Reset code sent to your email.');
      setStep('reset-otp');
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Could not send reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Submit New Password with OTP
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });
      setSuccessMessage(res.message || 'Password reset successfully! Please sign in.');
      setStep('form');
      setIsRegister(false);
      setPassword('');
      setConfirmPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setOtp('');
    } catch (err) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4 sm:p-6 relative font-sans">
      {/* Subtle modern engineering dot pattern background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      ></div>

      <div className="w-full max-w-[420px] bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden my-auto relative z-10">
        {/* Brand Header */}
        <div className="px-6 pt-7 pb-5 text-center border-b border-zinc-100">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-900 text-white mb-3 shadow-xs">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 22h12" />
              <path d="M4 9h10" />
              <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
              <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
            </svg>
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center justify-center gap-1.5">
              <span>Sasta</span>
              <span className="text-emerald-600">Safar</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </h1>
            <p className="text-xs text-zinc-500 font-normal mt-1">
              Route optimization & fuel cost intelligence
            </p>
          </div>
        </div>

        {/* Step Navigation & Tabs */}
        {step === 'form' ? (
          <div className="p-3 bg-zinc-50 border-b border-zinc-200/80">
            <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-200/60 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                  setSuccessMessage('');
                }}
                className={`py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                  !isRegister
                    ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/60'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError('');
                  setSuccessMessage('');
                }}
                className={`py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                  isRegister
                    ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/60'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-2.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setError('');
                setSuccessMessage('');
              }}
              className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
            <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-200/80 px-2 py-0.5 rounded-md">
              {step === 'otp' ? 'Step 2 of 2' : step === 'forgot' ? 'Reset Password' : 'Step 2: New Password'}
            </span>
          </div>
        )}

        {/* STEP 1: Main Form (Sign In / Register) */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <div className="text-left">
              <h2 className="text-sm font-semibold text-zinc-900">
                {isRegister ? 'Enter your details' : 'Welcome back'}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isRegister
                  ? 'We will send a 6-digit verification code to your email.'
                  : 'Enter your credentials to access your routes and saved trips.'}
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Full Name Field (Register Only) */}
            {isRegister && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-xs font-medium text-zinc-700 mb-1"
                >
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-zinc-400 pointer-events-none">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Saad Khan"
                    className="w-full bg-white text-zinc-900 text-xs font-normal pl-9 pr-3 py-2 rounded-lg border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition placeholder:text-zinc-400"
                  />
                </div>
              </div>
            )}

            {/* Email Address Field */}
            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-zinc-700 mb-1"
              >
                Email Address
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-zinc-400 pointer-events-none">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-white text-zinc-900 text-xs font-normal pl-9 pr-3 py-2 rounded-lg border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition placeholder:text-zinc-400"
                />
              </div>
            </div>

            {/* Optional Phone / WhatsApp Field (Register Only) */}
            {isRegister && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="auth-phone"
                    className="text-xs font-medium text-zinc-700"
                  >
                    Phone / WhatsApp Number
                  </label>
                  <span className="text-[10px] text-zinc-400">Optional</span>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-zinc-400 pointer-events-none">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="auth-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full bg-white text-zinc-900 text-xs font-normal pl-9 pr-3 py-2 rounded-lg border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition placeholder:text-zinc-400"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="auth-password"
                  className="text-xs font-medium text-zinc-700"
                >
                  Password
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('forgot');
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-zinc-400 pointer-events-none">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white text-zinc-900 text-xs font-normal pl-9 pr-9 py-2 rounded-lg border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition placeholder:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 transition cursor-pointer p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (Register Only) */}
            {isRegister && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-medium text-zinc-700 mb-1"
                >
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-zinc-400 pointer-events-none">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white text-zinc-900 text-xs font-normal pl-9 pr-3 py-2 rounded-lg border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition placeholder:text-zinc-400"
                  />
                </div>
              </div>
            )}

            {/* OTP Delivery Method (Register Only) */}
            {isRegister && (
              <div className="pt-1">
                <span className="block text-[11px] font-medium text-zinc-600 mb-1.5">
                  Send verification code via:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('email')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      deliveryMethod === 'email'
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email OTP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('whatsapp')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      deliveryMethod === 'whatsapp'
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp / SMS</span>
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me Checkbox (Login Only) */}
            {!isRegister && (
              <div className="flex items-center space-x-2 pt-0.5">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-zinc-900 focus:ring-zinc-900 border-zinc-300 cursor-pointer"
                />
                <label
                  htmlFor="remember-me"
                  className="text-xs text-zinc-600 font-normal select-none cursor-pointer"
                >
                  Remember this device for 30 days
                </label>
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-xs text-white bg-zinc-900 hover:bg-zinc-800 transition active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Send 6-Digit OTP' : 'Sign In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: 6-Digit OTP Verification Screen */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="p-6 space-y-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center mx-auto border border-zinc-200">
              <KeyRound className="w-5 h-5 text-zinc-700" />
            </div>

            <div>
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Enter Verification Code
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                We sent a 6-digit security code to:
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <span className="text-xs font-semibold text-zinc-900 font-mono">
                  {email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setError('');
                  }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
                >
                  (Edit)
                </button>
              </div>
            </div>

            {/* Success or Informational Banner */}
            {successMessage && !error && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800 flex items-start gap-2 text-left">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* 6-Digit OTP Input Box */}
            <div className="space-y-1.5">
              <label htmlFor="auth-otp" className="block text-xs font-medium text-zinc-700">
                6-Digit Security Code
              </label>
              <input
                id="auth-otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setOtp(val);
                }}
                placeholder="000000"
                className="w-full text-center tracking-[8px] text-xl font-bold font-mono py-2.5 rounded-lg bg-white border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition text-zinc-900 placeholder:text-zinc-300"
              />
              <p className="text-[11px] text-zinc-400">
                Code expires in 10 minutes
              </p>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isLoading || otp.trim().length !== 6}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-xs text-white bg-zinc-900 hover:bg-zinc-800 transition active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Account...</span>
                </>
              ) : (
                <>
                  <span>Verify & Create Account</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Resend OTP Section */}
            <div className="pt-1 text-xs text-zinc-500 flex items-center justify-center gap-1.5">
              <span>Didn't receive the code?</span>
              {resendCooldown > 0 ? (
                <span className="font-medium text-zinc-400">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="font-semibold text-zinc-900 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend Code</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* STEP 3: Forgot Password Request (Enter Email) */}
        {step === 'forgot' && (
          <form onSubmit={handleRequestResetOtp} className="p-5 sm:p-6 space-y-4">
            <div className="text-left">
              <h2 className="text-sm font-semibold text-zinc-900">
                Reset Your Password
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Enter your registered email address. We'll send a 6-digit security code to reset your password.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Email Address Field */}
            <div>
              <label htmlFor="reset-email" className="block text-xs font-medium text-zinc-700 mb-1">
                Registered Email Address
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-zinc-400 pointer-events-none">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full bg-white text-zinc-900 text-xs font-normal pl-9 pr-3 py-2 rounded-lg border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition placeholder:text-zinc-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-xs text-white bg-zinc-900 hover:bg-zinc-800 transition active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending Reset Code...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Code</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 4: Reset Password (Enter OTP + New Password) */}
        {step === 'reset-otp' && (
          <form onSubmit={handleResetPasswordSubmit} className="p-5 sm:p-6 space-y-4">
            <div className="text-left">
              <h2 className="text-sm font-semibold text-zinc-900">
                Set New Password
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Enter the 6-digit code sent to <span className="font-semibold text-zinc-800">{email}</span> and your new password.
              </p>
            </div>

            {/* Success Banner */}
            {successMessage && !error && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* 6-Digit OTP Box */}
            <div className="space-y-1">
              <label htmlFor="reset-otp-input" className="block text-xs font-medium text-zinc-700">
                6-Digit Security Code
              </label>
              <input
                id="reset-otp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                className="w-full text-center tracking-[6px] text-lg font-bold font-mono py-2 rounded-lg bg-white border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition text-zinc-900 placeholder:text-zinc-300"
              />
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="reset-new-password" className="block text-xs font-medium text-zinc-700 mb-1">
                New Password (minimum 6 characters)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-zinc-400 pointer-events-none">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white text-zinc-900 text-xs font-normal pl-9 pr-9 py-2 rounded-lg border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition placeholder:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 transition cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="reset-confirm-password" className="block text-xs font-medium text-zinc-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-zinc-400 pointer-events-none">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="reset-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white text-zinc-900 text-xs font-normal pl-9 pr-3 py-2 rounded-lg border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition placeholder:text-zinc-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.trim().length !== 6 || newPassword.length < 6}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-xs text-white bg-zinc-900 hover:bg-zinc-800 transition active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password & Sign In</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security & Regulatory Compliance Footer */}
        <div className="bg-zinc-50 px-5 py-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5 font-medium text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Encrypted Session</span>
          </span>
          <span className="font-mono text-zinc-400">v2.4 Production</span>
        </div>
      </div>
    </div>
  );
}
