import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  KeyRound, 
  Building2, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  User, 
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
  const [signUpRole, setSignUpRole] = useState<UserRole>('MANUFACTURER');
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
        setTimeout(() => onClose(), 1000);
      } else if (res.user) {
        setSuccessMsg(
          'Enterprise profile created in Supabase! If "Confirm email" is enabled in Supabase Auth, check your inbox to confirm your address.'
        );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md glass-panel bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Supabase Enterprise Auth</h2>
              <p className="text-xs text-slate-400">Secure Identity & Cross-Enterprise RBAC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab('signin'); setError(null); setSuccessMsg(null); }}
            className={`py-1.5 rounded-lg transition-all ${tab === 'signin' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(null); setSuccessMsg(null); }}
            className={`py-1.5 rounded-lg transition-all ${tab === 'signup' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setTab('reset'); setError(null); setSuccessMsg(null); }}
            className={`py-1.5 rounded-lg transition-all ${tab === 'reset' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => { setTab('profile'); setError(null); setSuccessMsg(null); }}
            className={`py-1.5 rounded-lg transition-all ${tab === 'profile' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Profile
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{error}</div>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{successMsg}</div>
          </div>
        )}

        {/* Tab 1: Sign In */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Enterprise Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="e.g. engineer@quantumvolt.eu"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setTab('reset')}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-bold hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center space-x-2"
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                placeholder="Dr. Elena Rossi"
                value={signUpFullName}
                onChange={(e) => setSignUpFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Enterprise Email</label>
              <input
                type="email"
                required
                placeholder="elena@quantumvolt.eu"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="Min 8 characters"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Regulatory Enterprise Role</label>
              <select
                value={signUpRole}
                onChange={(e) => setSignUpRole(e.target.value as UserRole)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="MANUFACTURER">Manufacturer (Cell & Pack Gigafactory)</option>
                <option value="OEM">OEM (Automotive Vehicle Assembler)</option>
                <option value="FLEET_OPERATOR">Fleet Operator (Logistics / Commercial EV)</option>
                <option value="SERVICE_CENTER">Service Center (Diagnostics & Maintenance)</option>
                <option value="REMANUFACTURER">Remanufacturer (BESS Second-Life Refurbisher)</option>
                <option value="RECYCLER">Recycler (Hydrometallurgical Recovery)</option>
                <option value="REGULATOR_AUDITOR">Regulator / EU Auditor (Compliance Authority)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Organization Name</label>
              <input
                type="text"
                placeholder="e.g. QuantumVolt Gigafactory SE"
                value={signUpOrg}
                onChange={(e) => setSignUpOrg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-bold hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 pt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Creating Account...' : 'Register Enterprise Identity'}</span>
            </button>
          </form>
        )}

        {/* Tab 3: Password Reset */}
        {tab === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your registered enterprise email address. Supabase Auth will generate and dispatch a secure recovery token with verification callback URL.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Registered Email</label>
              <input
                type="email"
                required
                placeholder="user@enterprise.eu"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-all flex items-center justify-center space-x-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? 'Sending Request...' : 'Send Password Reset Link'}</span>
            </button>
          </form>
        )}

        {/* Tab 4: Current Profile & Session */}
        {tab === 'profile' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                  {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{currentUser?.full_name || 'Active Operator'}</div>
                  <div className="text-slate-400 font-mono text-[11px]">{currentUser?.email || 'authenticated@session.eu'}</div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Role:</span>
                  <span className="font-semibold text-emerald-400">{currentUser?.role || activeRole}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Organization:</span>
                  <span className="font-semibold text-slate-200">{currentUser?.organization_name || 'Verified Enterprise'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Session Provider:</span>
                  <span className="font-mono text-cyan-400">Supabase Auth (JWT)</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full py-2 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all flex items-center justify-center space-x-2"
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
