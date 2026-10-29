import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  LogOut,
  Mail,
  Lock
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  activeRole: UserRole;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeRole,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup' | 'reset' | 'profile'>(currentUser ? 'profile' : 'signin');
  
  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  // Sign Up State
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpRole, setSignUpRole] = useState<UserRole>('PUBLIC');
  const [signUpOrg, setSignUpOrg] = useState('');

  // Password Reset State
  const [resetEmail, setResetEmail] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.signIn(signInEmail, signInPassword);
      if (res.user) {
        setSuccessMsg('Successfully signed in. Session token active.');
        const profile = await api.getMe();
        onAuthSuccess(profile);
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.signUp(
        signUpEmail,
        signUpPassword,
        signUpFullName,
        signUpRole,
        signUpOrg || undefined
      );
      const profilePayload = 'profile' in res ? (res as any).profile : null;
      if (res.session || profilePayload) {
        setSuccessMsg('Enterprise profile registered and authenticated!');
        const profile = profilePayload || (await api.getMe());
        onAuthSuccess(profile);
        setTimeout(() => onClose(), 800);
      } else if (res.user) {
        setSuccessMsg('Enterprise profile registered! Directing to workspace...');
        const profile = await api.getMe().catch(() => ({
          id: res.user.id,
          email: signUpEmail,
          full_name: signUpFullName,
          role: signUpRole,
          organization_id: `org-${signUpRole.toLowerCase()}`,
          organization_name: signUpOrg,
        }));
        onAuthSuccess(profile);
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await api.resetPassword(resetEmail);
      setSuccessMsg(`Password reset instructions sent to ${resetEmail}`);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch password recovery request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await api.signOut();
      const publicUser = await api.getMe();
      onAuthSuccess(publicUser);
      setTab('signin');
      setSuccessMsg('Signed out of enterprise session.');
    } catch (err: any) {
      setError(err.message || 'Error signing out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#ECFDF3] border border-[#D1FAE5] text-[#059669]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#14532D] tracking-tight">Supabase Enterprise Auth</h2>
              <p className="text-xs text-[#64748B]">Secure Identity & Cross-Enterprise RBAC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1F2937] hover:bg-[#F8FAF7] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#F8FAF7] rounded-xl border border-[#E5E7EB] text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab('signin'); setError(null); setSuccessMsg(null); }}
            className={`py-1.5 rounded-lg transition-all ${tab === 'signin' ? 'bg-[#14532D] text-white shadow-sm' : 'text-[#64748B] hover:text-[#1F2937]'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(null); setSuccessMsg(null); }}
            className={`py-1.5 rounded-lg transition-all ${tab === 'signup' ? 'bg-[#14532D] text-white shadow-sm' : 'text-[#64748B] hover:text-[#1F2937]'}`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setTab('reset'); setError(null); setSuccessMsg(null); }}
            className={`py-1.5 rounded-lg transition-all ${tab === 'reset' ? 'bg-[#14532D] text-white shadow-sm' : 'text-[#64748B] hover:text-[#1F2937]'}`}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => { setTab('profile'); setError(null); setSuccessMsg(null); }}
            className={`py-1.5 rounded-lg transition-all ${tab === 'profile' ? 'bg-[#14532D] text-white shadow-sm' : 'text-[#64748B] hover:text-[#1F2937]'}`}
          >
            Profile
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug font-medium">{error}</div>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-[#ECFDF3] border border-[#D1FAE5] text-[#059669] text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug font-medium">{successMsg}</div>
          </div>
        )}

        {/* Tab 1: Sign In */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">Enterprise Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#64748B]" />
                <input
                  type="email"
                  required
                  placeholder="e.g. engineer@quantumvolt.eu"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#1F2937] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D] focus:ring-1 focus:ring-[#14532D]/20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#1F2937]">Password</label>
                <button
                  type="button"
                  onClick={() => setTab('reset')}
                  className="text-[11px] text-[#059669] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-[#64748B]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#1F2937] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D] focus:ring-1 focus:ring-[#14532D]/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#14532D] text-white text-xs font-bold hover:bg-[#166534] active:scale-[0.99] transition-all flex items-center justify-center space-x-2 shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In with Supabase Auth'}</span>
            </button>
          </form>
        )}

        {/* Tab 2: Sign Up */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                placeholder="Dr. Elena Rossi"
                value={signUpFullName}
                onChange={(e) => setSignUpFullName(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#1F2937] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">Enterprise Email</label>
              <input
                type="email"
                required
                placeholder="elena@quantumvolt.eu"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#1F2937] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="Min 8 characters"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#1F2937] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">Company / Organization Affiliation</label>
              <input
                type="text"
                placeholder="e.g. QuantumVolt Gigafactory SE, Apex Motors AG"
                value={signUpOrg}
                onChange={(e) => setSignUpOrg(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#1F2937] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div className="p-3 bg-[#F8FAF7] border border-[#E5E7EB] rounded-xl flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#059669] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#64748B] leading-tight">
                <span className="font-semibold text-[#1F2937] block mb-0.5">EU 2023/1542 Role Governance</span>
                Privileged enterprise roles (Manufacturer, OEM, Auditor, Recycler) are authenticated and authorized by organization administrators. Public accounts register with baseline verification until enterprise credentials are confirmed.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#14532D] text-white text-xs font-bold hover:bg-[#166534] active:scale-[0.99] transition-all flex items-center justify-center space-x-2 pt-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Creating Account...' : 'Register Enterprise Identity'}</span>
            </button>
          </form>
        )}

        {/* Tab 3: Password Reset */}
        {tab === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-[#64748B] leading-relaxed">
              Enter your registered enterprise email address. Supabase Auth will generate and dispatch a secure recovery token with verification callback URL.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">Registered Email</label>
              <input
                type="email"
                required
                placeholder="user@enterprise.eu"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#1F2937] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#14532D] text-white text-xs font-bold hover:bg-[#166534] transition-all flex items-center justify-center space-x-2 shadow-sm"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? 'Sending Request...' : 'Send Password Reset Link'}</span>
            </button>
          </form>
        )}

        {/* Tab 4: Current Profile & Session */}
        {tab === 'profile' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB] space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#ECFDF3] text-[#14532D] border border-[#D1FAE5] flex items-center justify-center font-bold text-sm">
                  {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1F2937]">{currentUser?.full_name || 'Active Operator'}</div>
                  <div className="text-[#64748B] font-mono text-[11px]">{currentUser?.email || 'authenticated@session.eu'}</div>
                </div>
              </div>

              <div className="border-t border-[#E5E7EB] pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Assigned Role:</span>
                  <span className="font-semibold text-[#14532D]">{currentUser?.role || activeRole}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Organization:</span>
                  <span className="font-semibold text-[#1F2937]">{currentUser?.organization_name || 'Verified Enterprise'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Session Provider:</span>
                  <span className="font-mono text-[#059669]">Supabase Auth (JWT)</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full py-2 px-4 rounded-xl bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] border border-[#FECACA] text-xs font-semibold transition-all flex items-center justify-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>{loading ? 'Terminating...' : 'Sign Out of Enterprise Session'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
