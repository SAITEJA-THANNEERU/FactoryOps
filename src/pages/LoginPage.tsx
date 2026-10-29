import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useRouter } from '../contexts/RouterContext.tsx';
import { Logo } from '../components/Logo.tsx';
import {
  Factory,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Users,
  CheckCircle2,
  Cpu,
  Wrench,
  BarChart3,
  Radio,
  ShieldCheck,
  Shield,
  Building2,
  ChevronRight,
  Layers
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error: authError } = useAuth();
  const { navigate, searchParams } = useRouter();

  const prefilledEmail = searchParams.get('email') || '';
  const registeredSuccess = searchParams.get('registered') === 'true';

  const [identifier, setIdentifier] = useState(prefilledEmail || 'employee@factoryops.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  // Forgot password modal state
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!identifier.trim() || !password) {
      setLocalError('Please enter both your work email/ID and password.');
      return;
    }

    try {
      await login({ email: identifier.trim(), password });
    } catch (err: any) {
      setLocalError(err.message || 'Invalid credentials. Please verify your details.');
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSuccess(true);
    setTimeout(() => {
      setForgotSuccess(false);
      setIsForgotPasswordOpen(false);
      setForgotEmail('');
    }, 2500);
  };

  const displayError = localError || authError;

  return (
    <div
      className="min-h-screen w-full relative bg-slate-100 text-slate-800 font-sans flex flex-col justify-between overflow-x-hidden selection:bg-[#0E79B2] selection:text-white"
      style={{
        backgroundImage: "url('/assets/aistudio/image_d0723807.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Soft White Frosted-Glass Blur Overlay */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-slate-100/20 to-white/35 pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-30 w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="w-9 h-9" />
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-slate-900 font-display leading-none">Factory<span className="text-[#0E79B2]">Ops</span></span>
            <span className="text-[11px] font-medium text-slate-500 tracking-normal font-sans mt-0.5">Smart Factory Operations & Maintenance Platform</span>
          </div>
        </div>

        {/* Top Right System Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 border border-slate-200/90 text-xs font-mono shadow-md backdrop-blur-md">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-slate-900 font-extrabold">Security Shield Active</span>
        </div>
      </header>

      {/* Main Content Area (Center Card + Side Floating Technology Cards) */}
      <main className="relative z-20 flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-8 py-6 flex items-center justify-center">
        <div className="w-full flex items-center justify-between gap-6 lg:gap-12 relative">



          {/* Single Central Glassmorphism Login Card */}
          <div className="w-full max-w-[450px] mx-auto bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-7 sm:p-8 shadow-2xl relative z-30 transition-all hover:border-[#0E79B2]/40">

            <div className="relative z-10">
              {/* Brand Logo Badge */}
              <div className="flex justify-center mb-3">
                <Logo className="w-12 h-12" />
              </div>

              {/* Platform Title & Subtitle */}
              <h1 className="text-center text-3xl font-extrabold tracking-tight text-[#191923] font-display">
                Factory<span className="text-[#0E79B2]">Ops</span>
              </h1>
              <p className="mt-1 text-center text-xs text-slate-600 font-medium tracking-wide">
                Smart Factory Operations & Maintenance Platform
              </p>

              {/* Unified Platform Description */}
              <div className="mt-4 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  Enter your work credentials to access your role console
                </p>
              </div>

              {/* Registered Success Banner */}
              {registeredSuccess && !displayError && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div className="font-medium leading-relaxed">
                    Account registered successfully! Enter your password to sign in.
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {displayError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="font-medium leading-relaxed">{displayError}</div>
                </div>
              )}

              {/* Form Controls */}
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {/* Work Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-[#191923] mb-1.5">
                    Work Email or Corporate ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      placeholder="e.g. employee@factoryops.com"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0E79B2] focus:ring-1 focus:ring-[#0E79B2] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#191923] placeholder-slate-400 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="mb-1.5">
                    <label className="block text-xs font-semibold text-[#191923]">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your account password"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0E79B2] focus:ring-1 focus:ring-[#0E79B2] rounded-xl pl-10 pr-11 py-2.5 text-sm text-[#191923] placeholder-slate-400 transition-all font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#191923] p-1 rounded-md transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 bg-white text-[#0E79B2] focus:ring-[#0E79B2]"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-[#0E79B2] hover:text-[#0c6799] font-semibold hover:underline cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-5 bg-[#0E79B2] hover:bg-[#0c6799] active:bg-[#0a5680] text-white font-bold text-sm rounded-xl shadow-md shadow-[#0E79B2]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to FactoryOps</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Need Plant Floor Access Link */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500 mb-1.5">
                  Need plant floor or planner access?
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0E79B2] hover:text-[#0c6799] transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-[#0E79B2]" />
                  <span>Create Account (Manager, Technician, Planner)</span>
                </button>
              </div>
            </div>
          </div>



        </div>
      </main>

      {/* Bottom Feature Highlights Bar */}
      <footer className="relative z-30 w-full px-4 py-5 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="flex items-center justify-center gap-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#0E79B2] group-hover:border-[#0E79B2]/50 shadow-2xs transition-colors">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-[#191923] transition-colors">
              Production Intelligence
            </span>
          </div>

          <div className="flex items-center justify-center gap-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#0E79B2] group-hover:border-[#0E79B2]/50 shadow-2xs transition-colors">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-[#191923] transition-colors">
              Smart Manufacturing
            </span>
          </div>

          <div className="flex items-center justify-center gap-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#0E79B2] group-hover:border-[#0E79B2]/50 shadow-2xs transition-colors">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-[#191923] transition-colors">
              Secure Operations
            </span>
          </div>

          <div className="flex items-center justify-center gap-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#0E79B2] group-hover:border-[#0E79B2]/50 shadow-2xs transition-colors">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-[#191923] transition-colors">
              Industrial IoT Nodes
            </span>
          </div>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Reset Account Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter your work email address to receive an automated credential reset token.
            </p>

            {forgotSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Reset token dispatched to {forgotEmail}! Check inbox.</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="e.g. employee@factoryops.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#0E79B2]"
                  required
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0E79B2] hover:bg-[#0c6799] text-white text-xs font-bold rounded-lg shadow-md"
                  >
                    Send Reset Token
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
