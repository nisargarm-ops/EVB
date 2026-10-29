import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Zap,
  ChevronRight,
  KeyRound,
  RotateCcw,
  Globe,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface AuthLandingProps {
  onAuthSuccess: (user: UserProfile) => void;
  onGuestVerify: () => void;
}

const ROLE_OPTIONS: { role: UserRole; label: string; desc: string }[] = [
  { role: 'MANUFACTURER', label: 'Cell / Pack Manufacturer', desc: 'Mint genesis passports, register chemical specs & cell batches' },
  { role: 'OEM', label: 'Vehicle OEM Assembler', desc: 'Install battery into vehicle VIN & configure pack telemetry' },
  { role: 'FLEET_OPERATOR', label: 'Fleet & Mobility Operator', desc: 'Monitor live pack SoH, cycles & initiate ownership handoffs' },
  { role: 'SERVICE_CENTER', label: 'Certified Service Center', desc: 'Log maintenance, module replacements & diagnostics' },
  { role: 'REMANUFACTURER', label: 'Remanufacturing Hub', desc: 'Perform cell sorting, module reconditioning & refurbishment' },
  { role: 'RECYCLER', label: 'Closed-Loop Recycler', desc: 'Recover critical raw materials & generate recycling certificates' },
  { role: 'REGULATOR_AUDITOR', label: 'EU Regulatory Auditor', desc: 'Verify SHA-256 hash chains & EU 2023/1542 compliance' },
];

const DEFAULT_ORGS: Record<UserRole, string> = {
  MANUFACTURER: 'QuantumVolt Gigafactory',
  OEM: 'Apex Motors AG',
  FLEET_OPERATOR: 'Apex EV Mobility Fleet',
  SERVICE_CENTER: 'Berlin Battery Care',
  REMANUFACTURER: 'Nordic Remanufacturing Hub',
  RECYCLER: 'EcoRecycle Metals Recovery',
  REGULATOR_AUDITOR: 'EU Metrology Authority',
  ADMINISTRATOR: 'BatteryPass 360 Governance',
  PUBLIC: 'Anonymous Citizen',
};

export const AuthLanding: React.FC<AuthLandingProps> = ({ onAuthSuccess, onGuestVerify }) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('MANUFACTURER');
  const [organization, setOrganization] = useState(DEFAULT_ORGS['MANUFACTURER']);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Laptop className="w-3.5 h-3.5" />;
    if (theme === 'dark') return <Moon className="w-3.5 h-3.5" />;
    return <Sun className="w-3.5 h-3.5" />;
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    if (!organization || Object.values(DEFAULT_ORGS).includes(organization)) {
      setOrganization(DEFAULT_ORGS[role]);
    }
  };

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.signIn(cleanEmail, password);
      const profile = (res as any)?.profile || (await api.getMe());
      setSuccessMessage('Authentication successful! Initializing workspace...');
      setTimeout(() => onAuthSuccess(profile), 600);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Authentication failed. Please verify your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    const cleanName = fullName.trim();
    const cleanOrg = organization.trim();

    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMessage('Please provide a valid corporate email address.');
      return;
    }
    if (!cleanName) {
      setErrorMessage('Please provide your full legal name.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (!cleanOrg) {
      setErrorMessage('Please provide your organization name.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.signUp(
        cleanEmail,
        password,
        cleanName,
        selectedRole,
        cleanOrg
      );

      const profilePayload = (res as any)?.profile;
      if (res.session || profilePayload) {
        setSuccessMessage('Enterprise profile registered! Directing to workspace...');
        const profile = profilePayload || (await api.getMe());
        setTimeout(() => onAuthSuccess(profile), 700);
      } else if (res.user) {
        setSuccessMessage(
          'Account created successfully in Supabase! If confirmation is required, please check your email.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(cleanEmail);
      setSuccessMessage(
        `Password recovery instructions dispatched to ${cleanEmail}. Check your inbox.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch password recovery email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF7] dark:bg-[#0B130E] text-[#1F2937] dark:text-[#F1F5F9] flex flex-col justify-center items-center px-4 py-10 relative font-sans select-none transition-colors">
      {/* Top Floating Controls: Language & Theme */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-xs font-semibold shadow-xs"
          >
            <Globe className="w-3.5 h-3.5 text-[#059669]" />
            <span className="text-[11px] font-mono uppercase">
              {language === 'kn' ? 'ಕನ್ನಡ' : language === 'hi' ? 'हिन्दी' : 'EN'}
            </span>
          </button>
          {langMenuOpen && (
            <div 
              className="absolute right-0 mt-1 w-32 bg-white dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl shadow-xl py-1 z-30 text-xs"
              onMouseLeave={() => setLangMenuOpen(false)}
            >
              <button
                onClick={() => { setLanguage('en'); setLangMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#F8FAF7] dark:hover:bg-[#1F382B]"
              >
                English
              </button>
              <button
                onClick={() => { setLanguage('kn'); setLangMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#F8FAF7] dark:hover:bg-[#1F382B]"
              >
                ಕನ್ನಡ
              </button>
              <button
                onClick={() => { setLanguage('hi'); setLangMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#F8FAF7] dark:hover:bg-[#1F382B]"
              >
                हिन्दी
              </button>
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <button
          onClick={cycleTheme}
          title="Toggle Theme"
          className="flex items-center p-2 rounded-xl bg-white dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-xs shadow-xs"
        >
          {getThemeIcon()}
        </button>
      </div>

      {/* Top Header Branding */}
      <div className="text-center space-y-2.5 mb-6 z-10">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#ECFDF3] dark:bg-[#064E3B]/40 border border-[#D1FAE5] dark:border-[#065F46] text-[#059669] dark:text-[#34D399] text-xs font-semibold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
          <span>EU Regulation 2023/1542 • Circular Battery Passport</span>
        </div>
        <div className="flex items-center justify-center space-x-3 pt-1">
          <div className="p-2.5 rounded-2xl bg-[#14532D] text-white shadow-md shadow-[#14532D]/20">
            <Zap className="w-6 h-6 stroke-[2.4]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14532D] dark:text-[#34D399]">
            BatteryPass <span className="text-[#059669]">360</span>
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto">
          Tamper-evident metrology and digital lifecycle intelligence for electric vehicles.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-[430px] bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] rounded-3xl p-6 sm:p-8 shadow-sm relative z-10 transition-colors">
        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 border border-[#FECACA] dark:border-[#991B1B] flex items-start space-x-2.5 text-xs text-[#DC2626] dark:text-[#F87171]">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 border border-[#D1FAE5] dark:border-[#065F46] flex items-start space-x-2.5 text-xs text-[#059669] dark:text-[#34D399]">
            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{successMessage}</span>
          </div>
        )}

        {/* SIGN IN VIEW */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1 pb-1 text-center">
              <h2 className="text-lg font-bold text-[#1F2937] dark:text-[#F1F5F9]">{t.authSignIn}</h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Access your organization's digital passport dashboard</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#1F2937] dark:text-[#F1F5F9] uppercase tracking-wider mb-1">
                  {t.authEmail}
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="w-full bg-white dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-[#1F2937] dark:text-[#F1F5F9] uppercase tracking-wider">
                    {t.authPassword}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setMode('forgot');
                    }}
                    className="text-[11px] text-[#059669] hover:text-[#14532D] dark:hover:text-[#34D399] font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full bg-white dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#64748B] dark:text-[#94A3B8] hover:text-[#1F2937] dark:hover:text-white transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>{t.authSubmitSignIn}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* SIGN UP VIEW */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div className="space-y-1 pb-1 text-center">
              <h2 className="text-lg font-bold text-[#1F2937] dark:text-[#F1F5F9]">{t.authSignUp}</h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Join the cross-enterprise battery passport registry</p>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-[#1F2937] dark:text-[#F1F5F9] uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-[#64748B] absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Elena Rostova"
                    className="w-full bg-white dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl pl-10 pr-3.5 py-2 text-xs text-[#1F2937] dark:text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1F2937] dark:text-[#F1F5F9] uppercase tracking-wider mb-1">
                  {t.authEmail}
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="elena@quantumvolt.eu"
                    className="w-full bg-white dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl pl-10 pr-3.5 py-2 text-xs text-[#1F2937] dark:text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1F2937] dark:text-[#F1F5F9] uppercase tracking-wider mb-1">
                  {t.authPassword}
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full bg-white dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl pl-10 pr-10 py-2 text-xs text-[#1F2937] dark:text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#64748B] p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1F2937] dark:text-[#F1F5F9] uppercase tracking-wider mb-1">
                  {t.authRole}
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => handleRoleSelect(e.target.value as UserRole)}
                  className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#14532D]"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.role} value={opt.role}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1F2937] dark:text-[#F1F5F9] uppercase tracking-wider mb-1">
                  {t.authOrg}
                </label>
                <div className="relative flex items-center">
                  <Building2 className="w-4 h-4 text-[#64748B] absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. QuantumVolt Gigafactory"
                    className="w-full bg-white dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl pl-10 pr-3.5 py-2 text-xs text-[#1F2937] dark:text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering Profile...</span>
                </>
              ) : (
                <>
                  <span>{t.authSubmitSignUp}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1 pb-1 text-center">
              <h2 className="text-lg font-bold text-[#1F2937] dark:text-[#F1F5F9]">Reset Password</h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">We will dispatch recovery instructions via Supabase Auth</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#1F2937] dark:text-[#F1F5F9] uppercase tracking-wider mb-1">
                {t.authEmail}
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? <span>Dispatching...</span> : <span>Send Recovery Instructions</span>}
            </button>
          </form>
        )}

        {/* Mode Toggle Footer */}
        <div className="mt-5 pt-4 border-t border-[#E5E7EB] dark:border-[#1E382B] text-center">
          {mode === 'signin' ? (
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Need an enterprise account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setMode('signup');
                }}
                className="text-[#14532D] dark:text-[#34D399] hover:text-[#166534] font-bold transition-colors ml-1"
              >
                Create Account
              </button>
            </p>
          ) : (
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setMode('signin');
                }}
                className="text-[#14532D] dark:text-[#34D399] hover:text-[#166534] font-bold transition-colors ml-1"
              >
                Log In
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Public QR Scanner Bypass (Physical Inspection without Account) */}
      <div className="mt-6 z-10 text-center">
        <button
          onClick={onGuestVerify}
          className="inline-flex items-center space-x-2 text-xs text-[#14532D] dark:text-[#34D399] hover:text-[#166534] transition-colors py-2 px-4 rounded-xl bg-white dark:bg-[#121F17] hover:bg-[#ECFDF3] dark:hover:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] hover:border-[#14532D] shadow-sm font-medium"
        >
          <QrCode className="w-3.5 h-3.5 text-[#059669]" />
          <span>{t.authGuestVerify}: <strong>Inspect QR Passport</strong></span>
          <ChevronRight className="w-3 h-3 text-[#64748B] dark:text-[#94A3B8]" />
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-[11px] text-[#64748B] dark:text-[#94A3B8] z-10 space-y-1">
        <p>EU Battery Regulation (EU 2023/1542) • CIRPASS & Catena-X Interoperable</p>
        <p className="font-mono text-[10px] text-[#94A3B8]">
          SHA-256 Hash Chain • Zero-Knowledge Verification • QpiAI Platform
        </p>
      </div>
    </div>
  );
};
