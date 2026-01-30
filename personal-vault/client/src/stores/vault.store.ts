import { create } from 'zustand';
import { api } from '../utils/api';
import { encryptObject, decryptObject, encrypt, decrypt } from '../utils/crypto';
import { useAuthStore } from './auth.store';

// Entry types
export type EntryType = 'password' | 'secure_note' | 'credit_card' | 'identity' | 'bank_account';

export interface PasswordEntry {
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
}

export interface SecureNoteEntry {
  title: string;
  content: string;
}

export interface CreditCardEntry {
  title: string;
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  pin?: string;
  notes?: string;
}

export interface IdentityEntry {
  title: string;
  type: 'passport' | 'national_id' | 'driver_license' | 'other';
  fullName: string;
  idNumber: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  notes?: string;
}

export interface BankAccountEntry {
  title: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  pin?: string;
  notes?: string;
}

export type EntryData =
  | PasswordEntry
  | SecureNoteEntry
  | CreditCardEntry
  | IdentityEntry
  | BankAccountEntry;

export interface VaultEntry {
  id: string;
  type: EntryType;
  data: EntryData;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

interface VaultState {
  entries: VaultEntry[];
  folders: Folder[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  // Actions
  loadEntries: () => Promise<void>;
  loadFolders: () => Promise<void>;
  createEntry: (type: EntryType, data: EntryData, folderId?: string | null) => Promise<boolean>;
  updateEntry: (id: string, data: EntryData, folderId?: string | null) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<boolean>;
  createFolder: (name: string, parentId?: string | null) => Promise<boolean>;
  updateFolder: (id: string, name: string, parentId?: string | null) => Promise<boolean>;
  deleteFolder: (id: string) => Promise<boolean>;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  entries: [],
  folders: [],
  isLoading: false,
  error: null,
  searchQuery: '',

  loadEntries: async () => {
    const encryptionKey = useAuthStore.getState().encryptionKey;
    if (!encryptionKey) {
      set({ error: 'Not authenticated' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await api.getEntries(1, 1000); // Load all entries

      if (!response.success || !response.data) {
        set({ isLoading: false, error: response.error || 'Failed to load entries' });
        return;
      }

      // Decrypt all entries
      const decryptedEntries: VaultEntry[] = await Promise.all(
        response.data.items.map(async (item) => {
          try {
            const data = await decryptObject<EntryData>(item.encryptedData, encryptionKey);
            return {
              id: item.id,
              type: item.type as EntryType,
              data,
              folderId: item.folderId,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            };
          } catch (error) {
            console.error('Failed to decrypt entry:', item.id, error);
            return null;
          }
        })
      );

      set({
        entries: decryptedEntries.filter((e): e is VaultEntry => e !== null),
        isLoading: false,
      });
    } catch (error) {
      console.error('Load entries error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load entries',
      });
    }
  },

  loadFolders: async () => {
    const encryptionKey = useAuthStore.getState().encryptionKey;
    if (!encryptionKey) {
      set({ error: 'Not authenticated' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await api.getFolders();

      if (!response.success || !response.data) {
        set({ isLoading: false, error: response.error || 'Failed to load folders' });
        return;
      }

      // Decrypt folder names
      const decryptedFolders: Folder[] = await Promise.all(
        response.data.map(async (item) => {
          try {
            const name = await decrypt(item.encryptedName, encryptionKey);
            return {
              id: item.id,
              name,
              parentId: item.parentId,
              createdAt: item.createdAt,
            };
          } catch (error) {
            console.error('Failed to decrypt folder:', item.id, error);
            return null;
          }
        })
      );

      set({
        folders: decryptedFolders.filter((f): f is Folder => f !== null),
        isLoading: false,
      });
    } catch (error) {
      console.error('Load folders error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load folders',
      });
    }
  },

  createEntry: async (type, data, folderId = null) => {
    const encryptionKey = useAuthStore.getState().encryptionKey;
    if (!encryptionKey) {
      set({ error: 'Not authenticated' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const encryptedData = await encryptObject(data, encryptionKey);

      const response = await api.createEntry({
        type,
        encryptedData,
        folderId,
      });

      if (!response.success || !response.data) {
        set({ isLoading: false, error: response.error || 'Failed to create entry' });
        return false;
      }

      // Add to local state
      const newEntry: VaultEntry = {
        id: response.data.id,
        type,
        data,
        folderId: response.data.folderId,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt,
      };

      set((state) => ({
        entries: [newEntry, ...state.entries],
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Create entry error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create entry',
      });
      return false;
    }
  },

  updateEntry: async (id, data, folderId) => {
    const encryptionKey = useAuthStore.getState().encryptionKey;
    if (!encryptionKey) {
      set({ error: 'Not authenticated' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const encryptedData = await encryptObject(data, encryptionKey);

      const response = await api.updateEntry(id, {
        encryptedData,
        ...(folderId !== undefined && { folderId }),
      });

      if (!response.success || !response.data) {
        set({ isLoading: false, error: response.error || 'Failed to update entry' });
        return false;
      }

      // Update local state
      set((state) => ({
        entries: state.entries.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                data,
                folderId: response.data!.folderId,
                updatedAt: response.data!.updatedAt,
              }
            : entry
        ),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Update entry error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update entry',
      });
      return false;
    }
  },

  deleteEntry: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.deleteEntry(id);

      if (!response.success) {
        set({ isLoading: false, error: response.error || 'Failed to delete entry' });
        return false;
      }

      // Remove from local state
      set((state) => ({
        entries: state.entries.filter((entry) => entry.id !== id),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Delete entry error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete entry',
      });
      return false;
    }
  },

  createFolder: async (name, parentId = null) => {
    const encryptionKey = useAuthStore.getState().encryptionKey;
    if (!encryptionKey) {
      set({ error: 'Not authenticated' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const encryptedName = await encrypt(name, encryptionKey);

      const response = await api.createFolder({
        encryptedName,
        parentId,
      });

      if (!response.success || !response.data) {
        set({ isLoading: false, error: response.error || 'Failed to create folder' });
        return false;
      }

      // Add to local state
      const newFolder: Folder = {
        id: response.data.id,
        name,
        parentId: response.data.parentId,
        createdAt: response.data.createdAt,
      };

      set((state) => ({
        folders: [...state.folders, newFolder],
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Create folder error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create folder',
      });
      return false;
    }
  },

  updateFolder: async (id, name, parentId) => {
    const encryptionKey = useAuthStore.getState().encryptionKey;
    if (!encryptionKey) {
      set({ error: 'Not authenticated' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const encryptedName = await encrypt(name, encryptionKey);

      const response = await api.updateFolder(id, {
        encryptedName,
        ...(parentId !== undefined && { parentId }),
      });

      if (!response.success || !response.data) {
        set({ isLoading: false, error: response.error || 'Failed to update folder' });
        return false;
      }

      // Update local state
      set((state) => ({
        folders: state.folders.map((folder) =>
          folder.id === id
            ? {
                ...folder,
                name,
                parentId: response.data!.parentId,
              }
            : folder
        ),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Update folder error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update folder',
      });
      return false;
    }
  },

  deleteFolder: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.deleteFolder(id);

      if (!response.success) {
        set({ isLoading: false, error: response.error || 'Failed to delete folder' });
        return false;
      }

      // Remove from local state and update entries
      set((state) => ({
        folders: state.folders.filter((folder) => folder.id !== id),
        entries: state.entries.map((entry) =>
          entry.folderId === id ? { ...entry, folderId: null } : entry
        ),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Delete folder error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete folder',
      });
      return false;
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Selector for filtered entries (search on decrypted data)
export const useFilteredEntries = () => {
  const entries = useVaultStore((state) => state.entries);
  const searchQuery = useVaultStore((state) => state.searchQuery);

  if (!searchQuery.trim()) {
    return entries;
  }

  const query = searchQuery.toLowerCase();

  return entries.filter((entry) => {
    const data = entry.data;

    // Search in title (all entry types have title)
    if ('title' in data && data.title.toLowerCase().includes(query)) {
      return true;
    }

    // Search in type-specific fields
    if (entry.type === 'password') {
      const pwd = data as PasswordEntry;
      return (
        pwd.username?.toLowerCase().includes(query) ||
        pwd.url?.toLowerCase().includes(query) ||
        pwd.notes?.toLowerCase().includes(query)
      );
    }

    if (entry.type === 'secure_note') {
      const note = data as SecureNoteEntry;
      return note.content.toLowerCase().includes(query);
    }

    if (entry.type === 'credit_card') {
      const card = data as CreditCardEntry;
      return (
        card.cardholderName?.toLowerCase().includes(query) ||
        card.notes?.toLowerCase().includes(query)
      );
    }

    if (entry.type === 'identity') {
      const identity = data as IdentityEntry;
      return (
        identity.fullName?.toLowerCase().includes(query) ||
        identity.issuingAuthority?.toLowerCase().includes(query)
      );
    }

    if (entry.type === 'bank_account') {
      const bank = data as BankAccountEntry;
      return (
        bank.bankName?.toLowerCase().includes(query) ||
        bank.accountHolder?.toLowerCase().includes(query)
      );
    }

    return false;
  });
};
