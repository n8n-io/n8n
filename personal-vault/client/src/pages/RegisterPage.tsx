import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { calculatePasswordStrength } from '../utils/crypto';
import { Lock, Mail, Eye, EyeOff, Shield, Copy, Check, AlertTriangle } from 'lucide-react';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState('');
  const { register, isLoading, error, clearError } = useAuthStore();

  const passwordStrength = calculatePasswordStrength(password);

  const getStrengthColor = () => {
    if (passwordStrength < 30) return 'bg-red-500';
    if (passwordStrength < 60) return 'bg-yellow-500';
    if (passwordStrength < 80) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  const getStrengthText = () => {
    if (passwordStrength < 30) return 'Weak';
    if (passwordStrength < 60) return 'Fair';
    if (passwordStrength < 80) return 'Good';
    return 'Strong';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    if (password.length < 12) {
      setValidationError('Password must be at least 12 characters');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (passwordStrength < 50) {
      setValidationError('Please choose a stronger password');
      return;
    }

    const result = await register(email, password);
    if (result.success && result.recoveryKey) {
      setRecoveryKey(result.recoveryKey);
    }
  };

  const copyRecoveryKey = () => {
    if (recoveryKey) {
      navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (recoveryKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-vault-dark rounded-2xl p-8 shadow-xl border border-gray-800">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-white">Account Created!</h2>
              <p className="text-gray-400 mt-2">Save your recovery key now</p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-200 text-sm font-medium">Important!</p>
                  <p className="text-yellow-200/80 text-sm mt-1">
                    This is your only way to recover your account if you forget your master password.
                    Store it safely - we cannot recover it for you.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recovery Key
              </label>
              <div className="relative">
                <div className="bg-vault-darker border border-gray-700 rounded-lg p-4 font-mono text-sm text-primary-400 break-all">
                  {recoveryKey}
                </div>
                <button
                  onClick={copyRecoveryKey}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <Link
              to="/vault"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center"
            >
              I've saved my recovery key
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Personal Vault</h1>
          <p className="text-gray-400 mt-2">Create your secure vault</p>
        </div>

        <div className="bg-vault-dark rounded-2xl p-8 shadow-xl border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-6">Create Account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-vault-darker border border-gray-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Master Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-vault-darker border border-gray-700 rounded-lg py-3 pl-11 pr-11 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Min 12 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getStrengthColor()} transition-all`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{getStrengthText()}</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-vault-darker border border-gray-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>

            {(error || validationError) && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {validationError || error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Create Vault'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-400 hover:text-primary-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Your master password never leaves your device.
        </p>
      </div>
    </div>
  );
}
