import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useVaultStore, useFilteredEntries, EntryType, EntryData } from '../stores/vault.store';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { EntryList } from '../components/EntryList';
import { EntryModal } from '../components/EntryModal';
import { PasswordGenerator } from '../components/PasswordGenerator';
import { Plus } from 'lucide-react';

export function VaultPage() {
  const { user } = useAuthStore();
  const { loadEntries, loadFolders, isLoading } = useVaultStore();
  const entries = useFilteredEntries();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<EntryType | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{
    id: string;
    type: EntryType;
    data: EntryData;
    folderId: string | null;
  } | null>(null);
  const [newEntryType, setNewEntryType] = useState<EntryType>('password');
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);

  useEffect(() => {
    loadEntries();
    loadFolders();
  }, [loadEntries, loadFolders]);

  const filteredEntries = entries.filter((entry) => {
    if (selectedFolder && entry.folderId !== selectedFolder) return false;
    if (selectedType !== 'all' && entry.type !== selectedType) return false;
    return true;
  });

  const handleNewEntry = (type: EntryType) => {
    setNewEntryType(type);
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleEditEntry = (entry: typeof editingEntry) => {
    setEditingEntry(entry);
    setNewEntryType(entry!.type);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-vault-darker flex flex-col">
      <Header
        user={user}
        onPasswordGenerator={() => setShowPasswordGenerator(true)}
      />

      <div className="flex-1 flex">
        <Sidebar
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          selectedType={selectedType}
          onSelectType={setSelectedType}
        />

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {selectedType === 'all'
                  ? 'All Items'
                  : selectedType === 'password'
                  ? 'Passwords'
                  : selectedType === 'secure_note'
                  ? 'Secure Notes'
                  : selectedType === 'credit_card'
                  ? 'Credit Cards'
                  : selectedType === 'identity'
                  ? 'Identities'
                  : 'Bank Accounts'}
                <span className="text-gray-500 font-normal ml-2">
                  ({filteredEntries.length})
                </span>
              </h2>

              <div className="relative group">
                <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-vault-dark border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleNewEntry('password')}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700/50 first:rounded-t-lg"
                  >
                    Password
                  </button>
                  <button
                    onClick={() => handleNewEntry('secure_note')}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700/50"
                  >
                    Secure Note
                  </button>
                  <button
                    onClick={() => handleNewEntry('credit_card')}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700/50"
                  >
                    Credit Card
                  </button>
                  <button
                    onClick={() => handleNewEntry('identity')}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700/50"
                  >
                    Identity
                  </button>
                  <button
                    onClick={() => handleNewEntry('bank_account')}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700/50 last:rounded-b-lg"
                  >
                    Bank Account
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              </div>
            ) : (
              <EntryList
                entries={filteredEntries}
                onEdit={handleEditEntry}
              />
            )}
          </div>
        </main>
      </div>

      {isModalOpen && (
        <EntryModal
          type={newEntryType}
          entry={editingEntry}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEntry(null);
          }}
        />
      )}

      {showPasswordGenerator && (
        <PasswordGenerator onClose={() => setShowPasswordGenerator(false)} />
      )}
    </div>
  );
}
