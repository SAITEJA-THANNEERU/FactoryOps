import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useRouter } from '../contexts/RouterContext.tsx';
import { Logo } from '../components/Logo.tsx';
import {
  Factory,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building,
  Briefcase
} from 'lucide-react';

interface RegisteredAccountSummary {
  name: string;
  email: string;
  role: string;
  roleTitle: string;
  factoryName: string;
}

export const RegisterPage: React.FC = () => {
  const { register, isLoading, error: authError } = useAuth();
  const { navigate } = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MANAGER_SUPERVISOR' | 'TECHNICIAN' | 'PRODUCTION_PLANNER'>('TECHNICIAN');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Post-registration confirmation state
  const [confirmedAccount, setConfirmedAccount] = useState<RegisteredAccountSummary | null>(null);

  const roleTitles: Record<string, string> = {
    MANAGER_SUPERVISOR: 'Manager / Supervisor',
    TECHNICIAN: 'Technician (Maintenance & Telemetry)',
    PRODUCTION_PLANNER: 'Production Planner'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Frontend validations
    if (!name.trim() || name.trim().length < 2) {
      setLocalError('Please enter your full corporate name (at least 2 characters).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setLocalError('Please enter a valid corporate email address.');
      return;
    }

    if (!password || password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      const res = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        factory_id: 'FAC-001'
      });

      setConfirmedAccount({
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        roleTitle: roleTitles[res.user.role] || res.user.role,
        factoryName: res.user.factory_name || 'Austin Gigafactory Precision (APX-01)'
      });
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed. Please check your entries.');
    }
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
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 font-display">Factory<span className="text-[#0E79B2]">Ops</span></span>
            <span className="text-[11px] font-semibold text-slate-700 bg-gradient-to-r from-slate-100 to-blue-50/50 border border-slate-200/90 px-2.5 py-1 rounded-md hidden sm:inline ml-2.5 font-mono shadow-2xs tracking-wide">Smart Factory Operations & Maintenance Platform</span>
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

      {/* Main Content Area (Slightly Larger 2-Column Wide Frosted Glass Card) */}
      <main className="relative z-20 flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-8 py-6 flex items-center justify-center">
        <div className="w-full max-w-[720px] bg-white/98 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-7 sm:p-9 shadow-2xl relative z-30 transition-all">

          {/* Confirmed Registration Screen */}
          {confirmedAccount ? (
            <div className="text-center space-y-5 animate-in fade-in duration-200 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900 font-display">Account Registered Safely</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Your credentials have been securely registered.
                </p>
              </div>

              {/* Safe Credentials Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-2.5 text-sm">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/80">
                  <span className="text-slate-500 font-medium">Full Name</span>
                  <span className="font-bold text-slate-900">{confirmedAccount.name}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/80">
                  <span className="text-slate-500 font-medium">Corporate Email</span>
                  <span className="font-mono font-semibold text-slate-800">{confirmedAccount.email}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/80">
                  <span className="text-slate-500 font-medium">Assigned Role</span>
                  <span className="px-2.5 py-1 rounded-md bg-[#0E79B2]/10 text-[#0E79B2] font-semibold text-xs">
                    {confirmedAccount.roleTitle}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Plant Assignment</span>
                  <span className="font-semibold text-slate-800">{confirmedAccount.factoryName}</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/70 p-3.5 rounded-xl text-left leading-relaxed">
                <p className="font-bold text-amber-900 mb-0.5">Security Notice:</p>
                <p className="text-amber-800">
                  Passwords are encrypted securely. Proceed to sign in to access your operational role console.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/login?email=${encodeURIComponent(confirmedAccount.email)}&registered=true`)}
                className="w-full py-3.5 px-5 bg-[#0E79B2] hover:bg-[#0c6799] text-white font-bold text-sm rounded-xl shadow-md shadow-[#0E79B2]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            /* Registration Form with Efficient Two-Column Grid */
            <>
              {/* Card Header */}
              <div className="text-center mb-6 pb-4 border-b border-slate-100">
                <Logo className="w-12 h-12 mx-auto mb-2.5" />
                <h2 className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
                  Create Operational Account
                </h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  Register for live telemetry, work orders, and production console access
                </p>
              </div>

              {/* Error Banner */}
              {displayError && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="font-medium leading-relaxed">{displayError}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 2-Column Grid Row 1: Full Name & Work Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0E79B2] focus:ring-1 focus:ring-[#0E79B2] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all font-medium"
                        required
                      />
                    </div>
                  </div>

                  {/* Work Email */}
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="alex.morgan@factoryops.com"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0E79B2] focus:ring-1 focus:ring-[#0E79B2] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 2-Column Grid Row 2: Role Selection & Plant Assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Role Selection */}
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                      Role & Responsibility
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={role}
                        onChange={e => setRole(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0E79B2] focus:ring-1 focus:ring-[#0E79B2] rounded-xl pl-10 pr-8 py-2.5 text-xs sm:text-sm text-slate-900 transition-all cursor-pointer font-medium"
                      >
                        <option value="TECHNICIAN">Technician (Maintenance & Telemetry)</option>
                        <option value="MANAGER_SUPERVISOR">Manager / Supervisor (Floor Triage)</option>
                        <option value="PRODUCTION_PLANNER">Production Planner (Scheduling)</option>
                      </select>
                    </div>
                  </div>

                  {/* Plant Assignment */}
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                      Assigned Plant
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        disabled
                        value="Austin Gigafactory (APX-01)"
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-600 cursor-not-allowed font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 2-Column Grid Row 3: Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-900">
                        Password
                      </label>
                      <span className="text-xs text-slate-400 font-mono">Min 8 chars</span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0E79B2] focus:ring-1 focus:ring-[#0E79B2] rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 p-1 rounded-md transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0E79B2] focus:ring-1 focus:ring-[#0E79B2] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Complete Registration Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-3 py-3 px-5 bg-[#0E79B2] hover:bg-[#0c6799] active:bg-[#0a5680] text-white font-bold text-sm rounded-xl shadow-md shadow-[#0E79B2]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Back to Login link */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Already have an authorized account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="font-bold text-[#0E79B2] hover:text-[#0c6799] hover:underline cursor-pointer ml-1"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer Notice */}
      <footer className="relative z-30 w-full px-4 py-3 max-w-5xl mx-auto text-center border-t border-slate-200/80">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-medium">
          <ShieldCheck className="w-4 h-4 text-[#0E79B2]" />
          <span>Secure Credentials • Isolated Tenant Operations • Role Enforcement</span>
        </div>
      </footer>
    </div>
  );
};
