import { useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { Lock, Eye, EyeOff, Shield, LogOut } from 'lucide-react';

export function LockScreen() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user, login, logout, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (user) {
      await login(user.email, password);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/10 rounded-2xl mb-4">
            <Lock className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Vault Locked</h1>
          <p className="text-gray-400 mt-2">
            Your session has been locked for security.
          </p>
        </div>

        <div className="bg-vault-dark rounded-2xl p-8 shadow-xl border border-gray-800">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-700">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium truncate">{user?.email}</p>
              <p className="text-gray-500 text-sm">Enter your master password to unlock</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="Enter your master password"
                  autoFocus
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
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
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
                'Unlock'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors py-2"
            >
              <LogOut className="w-4 h-4" />
              Log out and use different account
            </button>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Your vault locks automatically after 5 minutes of inactivity.
        </p>
      </div>
    </div>
  );
}
