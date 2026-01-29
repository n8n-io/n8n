import { useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useVaultStore } from '../stores/vault.store';
import { Shield, Search, Key, Lock, LogOut, User } from 'lucide-react';

interface HeaderProps {
  user: { id: string; email: string } | null;
  onPasswordGenerator: () => void;
}

export function Header({ user, onPasswordGenerator }: HeaderProps) {
  const { logout, lock } = useAuthStore();
  const { searchQuery, setSearchQuery } = useVaultStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-vault-dark border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-white">Personal Vault</span>
        </div>

        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vault..."
              className="w-full bg-vault-darker border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onPasswordGenerator}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <Key className="w-5 h-5" />
            <span className="hidden sm:inline">Generator</span>
          </button>

          <button
            onClick={lock}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <Lock className="w-5 h-5" />
            <span className="hidden sm:inline">Lock</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-vault-dark border border-gray-700 rounded-lg shadow-xl z-50">
                <div className="p-4 border-b border-gray-700">
                  <p className="text-white font-medium truncate">{user?.email}</p>
                  <p className="text-gray-500 text-sm">ID: {user?.id.slice(0, 8)}...</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-gray-700/50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
