import { useState } from 'react';
import { useVaultStore, EntryType } from '../stores/vault.store';
import {
  Key,
  FileText,
  CreditCard,
  User,
  Building,
  Folder,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';

interface SidebarProps {
  selectedFolder: string | null;
  onSelectFolder: (id: string | null) => void;
  selectedType: EntryType | 'all';
  onSelectType: (type: EntryType | 'all') => void;
}

const typeIcons: Record<EntryType | 'all', React.ReactNode> = {
  all: <LayoutGrid className="w-4 h-4" />,
  password: <Key className="w-4 h-4" />,
  secure_note: <FileText className="w-4 h-4" />,
  credit_card: <CreditCard className="w-4 h-4" />,
  identity: <User className="w-4 h-4" />,
  bank_account: <Building className="w-4 h-4" />,
};

const typeLabels: Record<EntryType | 'all', string> = {
  all: 'All Items',
  password: 'Passwords',
  secure_note: 'Secure Notes',
  credit_card: 'Credit Cards',
  identity: 'Identities',
  bank_account: 'Bank Accounts',
};

export function Sidebar({
  selectedFolder,
  onSelectFolder,
  selectedType,
  onSelectType,
}: SidebarProps) {
  const { folders, entries, createFolder } = useVaultStore();
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  // Count entries per type
  const typeCounts: Record<EntryType | 'all', number> = {
    all: entries.length,
    password: entries.filter((e) => e.type === 'password').length,
    secure_note: entries.filter((e) => e.type === 'secure_note').length,
    credit_card: entries.filter((e) => e.type === 'credit_card').length,
    identity: entries.filter((e) => e.type === 'identity').length,
    bank_account: entries.filter((e) => e.type === 'bank_account').length,
  };

  return (
    <aside className="w-64 bg-vault-dark border-r border-gray-800 flex flex-col">
      {/* Types */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Types
        </h3>
        <nav className="space-y-1">
          {(Object.keys(typeLabels) as Array<EntryType | 'all'>).map((type) => (
            <button
              key={type}
              onClick={() => {
                onSelectType(type);
                onSelectFolder(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                selectedType === type && !selectedFolder
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {typeIcons[type]}
                <span>{typeLabels[type]}</span>
              </div>
              <span className="text-xs text-gray-500">{typeCounts[type]}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Folders */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => setFoldersExpanded(!foldersExpanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
        >
          <span>Folders</span>
          {foldersExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {foldersExpanded && (
          <nav className="space-y-1">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => {
                  onSelectFolder(folder.id);
                  onSelectType('all');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  selectedFolder === folder.id
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <Folder className="w-4 h-4" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}

            {isCreatingFolder ? (
              <div className="px-3 py-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                    }
                  }}
                  onBlur={() => {
                    if (!newFolderName.trim()) {
                      setIsCreatingFolder(false);
                    }
                  }}
                  placeholder="Folder name"
                  className="w-full bg-vault-darker border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                <span>New Folder</span>
              </button>
            )}
          </nav>
        )}
      </div>
    </aside>
  );
}
