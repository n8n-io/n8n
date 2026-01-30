import { useState } from 'react';
import {
  VaultEntry,
  EntryType,
  EntryData,
  PasswordEntry,
  SecureNoteEntry,
  CreditCardEntry,
  IdentityEntry,
  BankAccountEntry,
  useVaultStore,
} from '../stores/vault.store';
import {
  Key,
  FileText,
  CreditCard,
  User,
  Building,
  Eye,
  EyeOff,
  Copy,
  Check,
  Pencil,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface EntryListProps {
  entries: VaultEntry[];
  onEdit: (entry: { id: string; type: EntryType; data: EntryData; folderId: string | null }) => void;
}

const typeIcons: Record<EntryType, React.ReactNode> = {
  password: <Key className="w-5 h-5" />,
  secure_note: <FileText className="w-5 h-5" />,
  credit_card: <CreditCard className="w-5 h-5" />,
  identity: <User className="w-5 h-5" />,
  bank_account: <Building className="w-5 h-5" />,
};

function EntryCard({
  entry,
  onEdit,
}: {
  entry: VaultEntry;
  onEdit: () => void;
}) {
  const { deleteEntry } = useVaultStore();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const getTitle = () => {
    const data = entry.data as Record<string, unknown>;
    return (data.title as string) || 'Untitled';
  };

  const getSubtitle = () => {
    switch (entry.type) {
      case 'password':
        return (entry.data as PasswordEntry).username || (entry.data as PasswordEntry).url;
      case 'secure_note':
        return (entry.data as SecureNoteEntry).content.slice(0, 50) + '...';
      case 'credit_card':
        return `**** ${(entry.data as CreditCardEntry).cardNumber.slice(-4)}`;
      case 'identity':
        return (entry.data as IdentityEntry).fullName;
      case 'bank_account':
        return (entry.data as BankAccountEntry).bankName;
      default:
        return '';
    }
  };

  const handleDelete = async () => {
    await deleteEntry(entry.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-vault-dark border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center text-gray-400">
            {typeIcons[entry.type]}
          </div>
          <div>
            <h3 className="text-white font-medium">{getTitle()}</h3>
            <p className="text-gray-500 text-sm">{getSubtitle()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-500 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Type-specific details */}
      {entry.type === 'password' && (
        <div className="space-y-2 mt-4 pt-4 border-t border-gray-800">
          {(entry.data as PasswordEntry).username && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Username</span>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">
                  {(entry.data as PasswordEntry).username}
                </span>
                <button
                  onClick={() =>
                    copyToClipboard((entry.data as PasswordEntry).username, 'username')
                  }
                  className="p-1 text-gray-500 hover:text-white"
                >
                  {copied === 'username' ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">Password</span>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-mono">
                {showPassword
                  ? (entry.data as PasswordEntry).password
                  : '••••••••••••'}
              </span>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-gray-500 hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={() =>
                  copyToClipboard((entry.data as PasswordEntry).password, 'password')
                }
                className="p-1 text-gray-500 hover:text-white"
              >
                {copied === 'password' ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
          {(entry.data as PasswordEntry).url && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">URL</span>
              <a
                href={(entry.data as PasswordEntry).url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary-400 hover:text-primary-300 text-sm"
              >
                Visit
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {entry.type === 'credit_card' && (
        <div className="space-y-2 mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">Card Number</span>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-mono">
                {showPassword
                  ? (entry.data as CreditCardEntry).cardNumber
                  : `**** **** **** ${(entry.data as CreditCardEntry).cardNumber.slice(-4)}`}
              </span>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-gray-500 hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">Expiry</span>
            <span className="text-white text-sm">
              {(entry.data as CreditCardEntry).expiryMonth}/
              {(entry.data as CreditCardEntry).expiryYear}
            </span>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-gray-400 text-sm mb-3">Delete this item?</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="flex-1 bg-red-500/20 text-red-400 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EntryList({ entries, onEdit }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-white font-medium mb-2">No items yet</h3>
        <p className="text-gray-500">Add your first password, note, or card to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          onEdit={() =>
            onEdit({
              id: entry.id,
              type: entry.type,
              data: entry.data,
              folderId: entry.folderId,
            })
          }
        />
      ))}
    </div>
  );
}
