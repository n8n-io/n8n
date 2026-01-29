import { create } from 'zustand';
import { api } from '../utils/api';
import {
  deriveMasterKey,
  deriveKeys,
  hashAuthKey,
  generateSalt,
  saltFromBase64,
  generateRecoveryKey,
  createRecoveryBlob,
  clearSensitiveData,
} from '../utils/crypto';

interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  encryptionKey: CryptoKey | null;
  recoveryKey: string | null; // Only set during registration

  // Actions
  register: (email: string, password: string) => Promise<{ success: boolean; recoveryKey?: string }>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  lock: () => void;
  clearError: () => void;
}

// Auto-lock timer
let autoLockTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const resetAutoLockTimer = (lock: () => void) => {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
  }
  autoLockTimer = setTimeout(lock, AUTO_LOCK_TIMEOUT);
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Set up API callbacks
  api.setCallbacks({
    onTokenRefresh: (accessToken, refreshToken) => {
      api.setTokens(accessToken, refreshToken);
    },
    onAuthError: () => {
      get().lock();
    },
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    encryptionKey: null,
    recoveryKey: null,

    register: async (email: string, password: string) => {
      set({ isLoading: true, error: null });

      try {
        // Generate salt
        const saltBase64 = generateSalt();
        const salt = saltFromBase64(saltBase64);

        // Derive keys
        const masterKey = await deriveMasterKey(password, salt);
        const { authKey, encryptionKey } = await deriveKeys(masterKey);

        // Hash auth key for server
        const authHash = await hashAuthKey(authKey);

        // Generate recovery key and create recovery blob
        const recoveryKey = generateRecoveryKey();
        const encryptedRecoveryBlob = await createRecoveryBlob(encryptionKey, recoveryKey);

        // Clear sensitive data
        clearSensitiveData(masterKey);
        clearSensitiveData(authKey);

        // Register with server
        const response = await api.register({
          email,
          authHash,
          salt: saltBase64,
          encryptedRecoveryBlob,
        });

        if (!response.success || !response.data) {
          set({ isLoading: false, error: response.error || 'Registration failed' });
          return { success: false };
        }

        // Set tokens
        api.setTokens(response.data.accessToken, response.data.refreshToken);

        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
          encryptionKey,
          recoveryKey, // Return to user once
          error: null,
        });

        // Start auto-lock timer
        resetAutoLockTimer(get().lock);

        return { success: true, recoveryKey };
      } catch (error) {
        console.error('Registration error:', error);
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Registration failed',
        });
        return { success: false };
      }
    },

    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });

      try {
        // Get salt from server
        const saltResponse = await api.getSalt(email);
        if (!saltResponse.success || !saltResponse.data) {
          set({ isLoading: false, error: 'Failed to get salt' });
          return false;
        }

        const salt = saltFromBase64(saltResponse.data.salt);

        // Derive keys
        const masterKey = await deriveMasterKey(password, salt);
        const { authKey, encryptionKey } = await deriveKeys(masterKey);

        // Hash auth key for server
        const authHash = await hashAuthKey(authKey);

        // Clear sensitive data
        clearSensitiveData(masterKey);
        clearSensitiveData(authKey);

        // Login with server
        const response = await api.login(email, authHash);

        if (!response.success || !response.data) {
          set({ isLoading: false, error: response.error || 'Invalid credentials' });
          return false;
        }

        // Set tokens
        api.setTokens(response.data.accessToken, response.data.refreshToken);

        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
          encryptionKey,
          recoveryKey: null,
          error: null,
        });

        // Start auto-lock timer
        resetAutoLockTimer(get().lock);

        return true;
      } catch (error) {
        console.error('Login error:', error);
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Login failed',
        });
        return false;
      }
    },

    logout: async () => {
      try {
        await api.logout();
      } catch (error) {
        console.error('Logout error:', error);
      }

      // Clear auto-lock timer
      if (autoLockTimer) {
        clearTimeout(autoLockTimer);
        autoLockTimer = null;
      }

      set({
        user: null,
        isAuthenticated: false,
        encryptionKey: null,
        recoveryKey: null,
        error: null,
      });
    },

    lock: () => {
      // Clear auto-lock timer
      if (autoLockTimer) {
        clearTimeout(autoLockTimer);
        autoLockTimer = null;
      }

      // Keep user info but clear encryption key
      set({
        isAuthenticated: false,
        encryptionKey: null,
        recoveryKey: null,
      });
    },

    clearError: () => {
      set({ error: null });
    },
  };
});

// Reset auto-lock timer on any user activity
if (typeof window !== 'undefined') {
  const resetTimer = () => {
    const state = useAuthStore.getState();
    if (state.isAuthenticated && state.encryptionKey) {
      resetAutoLockTimer(state.lock);
    }
  };

  window.addEventListener('mousemove', resetTimer);
  window.addEventListener('keydown', resetTimer);
  window.addEventListener('click', resetTimer);
  window.addEventListener('scroll', resetTimer);
}
