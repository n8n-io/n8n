import { useState, useEffect } from 'react';
import {
  useVaultStore,
  EntryType,
  EntryData,
  PasswordEntry,
  SecureNoteEntry,
  CreditCardEntry,
  IdentityEntry,
  BankAccountEntry,
} from '../stores/vault.store';
import { generatePassword } from '../utils/crypto';
import { X, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface EntryModalProps {
  type: EntryType;
  entry: {
    id: string;
    type: EntryType;
    data: EntryData;
    folderId: string | null;
  } | null;
  onClose: () => void;
}

export function EntryModal({ type, entry, onClose }: EntryModalProps) {
  const { createEntry, updateEntry, folders } = useVaultStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(entry?.folderId || null);

  // Form state based on type
  const [formData, setFormData] = useState<EntryData>(() => {
    if (entry) return entry.data;

    switch (type) {
      case 'password':
        return { title: '', username: '', password: '', url: '', notes: '' };
      case 'secure_note':
        return { title: '', content: '' };
      case 'credit_card':
        return {
          title: '',
          cardholderName: '',
          cardNumber: '',
          expiryMonth: '',
          expiryYear: '',
          cvv: '',
          pin: '',
          notes: '',
        };
      case 'identity':
        return {
          title: '',
          type: 'national_id' as const,
          fullName: '',
          idNumber: '',
          issueDate: '',
          expiryDate: '',
          issuingAuthority: '',
          notes: '',
        };
      case 'bank_account':
        return {
          title: '',
          bankName: '',
          accountNumber: '',
          accountHolder: '',
          routingNumber: '',
          swiftCode: '',
          iban: '',
          pin: '',
          notes: '',
        };
    }
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let success: boolean;
    if (entry) {
      success = await updateEntry(entry.id, formData, folderId);
    } else {
      success = await createEntry(type, formData, folderId);
    }

    setIsLoading(false);
    if (success) {
      onClose();
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword({
      length: 20,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      excludeAmbiguous: true,
    });
    updateField('password', newPassword);
  };

  const getTitle = () => {
    if (entry) return `Edit ${typeLabels[type]}`;
    return `New ${typeLabels[type]}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-vault-dark rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">{getTitle()}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4">
          {/* Password Form */}
          {type === 'password' && (
            <>
              <FormField
                label="Title"
                value={(formData as PasswordEntry).title}
                onChange={(v) => updateField('title', v)}
                placeholder="e.g., Gmail Account"
                required
              />
              <FormField
                label="Username"
                value={(formData as PasswordEntry).username}
                onChange={(v) => updateField('username', v)}
                placeholder="username or email"
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={(formData as PasswordEntry).password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="w-full bg-vault-darker border border-gray-700 rounded-lg py-2 pl-4 pr-20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Password"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-gray-500 hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="p-1 text-gray-500 hover:text-white"
                      title="Generate password"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <FormField
                label="URL"
                value={(formData as PasswordEntry).url || ''}
                onChange={(v) => updateField('url', v)}
                placeholder="https://example.com"
                type="url"
              />
              <FormField
                label="Notes"
                value={(formData as PasswordEntry).notes || ''}
                onChange={(v) => updateField('notes', v)}
                multiline
              />
            </>
          )}

          {/* Secure Note Form */}
          {type === 'secure_note' && (
            <>
              <FormField
                label="Title"
                value={(formData as SecureNoteEntry).title}
                onChange={(v) => updateField('title', v)}
                placeholder="Note title"
                required
              />
              <FormField
                label="Content"
                value={(formData as SecureNoteEntry).content}
                onChange={(v) => updateField('content', v)}
                multiline
                rows={8}
                required
              />
            </>
          )}

          {/* Credit Card Form */}
          {type === 'credit_card' && (
            <>
              <FormField
                label="Title"
                value={(formData as CreditCardEntry).title}
                onChange={(v) => updateField('title', v)}
                placeholder="e.g., Personal Visa"
                required
              />
              <FormField
                label="Cardholder Name"
                value={(formData as CreditCardEntry).cardholderName}
                onChange={(v) => updateField('cardholderName', v)}
                required
              />
              <FormField
                label="Card Number"
                value={(formData as CreditCardEntry).cardNumber}
                onChange={(v) => updateField('cardNumber', v.replace(/\D/g, '').slice(0, 16))}
                placeholder="1234 5678 9012 3456"
                required
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  label="Month"
                  value={(formData as CreditCardEntry).expiryMonth}
                  onChange={(v) => updateField('expiryMonth', v.slice(0, 2))}
                  placeholder="MM"
                  required
                />
                <FormField
                  label="Year"
                  value={(formData as CreditCardEntry).expiryYear}
                  onChange={(v) => updateField('expiryYear', v.slice(0, 4))}
                  placeholder="YYYY"
                  required
                />
                <FormField
                  label="CVV"
                  value={(formData as CreditCardEntry).cvv}
                  onChange={(v) => updateField('cvv', v.slice(0, 4))}
                  type="password"
                  required
                />
              </div>
              <FormField
                label="PIN (optional)"
                value={(formData as CreditCardEntry).pin || ''}
                onChange={(v) => updateField('pin', v)}
                type="password"
              />
            </>
          )}

          {/* Identity Form */}
          {type === 'identity' && (
            <>
              <FormField
                label="Title"
                value={(formData as IdentityEntry).title}
                onChange={(v) => updateField('title', v)}
                placeholder="e.g., My Passport"
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Document Type
                </label>
                <select
                  value={(formData as IdentityEntry).type}
                  onChange={(e) => updateField('type', e.target.value)}
                  className="w-full bg-vault-darker border border-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID</option>
                  <option value="driver_license">Driver's License</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <FormField
                label="Full Name"
                value={(formData as IdentityEntry).fullName}
                onChange={(v) => updateField('fullName', v)}
                required
              />
              <FormField
                label="ID Number"
                value={(formData as IdentityEntry).idNumber}
                onChange={(v) => updateField('idNumber', v)}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Issue Date"
                  value={(formData as IdentityEntry).issueDate || ''}
                  onChange={(v) => updateField('issueDate', v)}
                  type="date"
                />
                <FormField
                  label="Expiry Date"
                  value={(formData as IdentityEntry).expiryDate || ''}
                  onChange={(v) => updateField('expiryDate', v)}
                  type="date"
                />
              </div>
              <FormField
                label="Issuing Authority"
                value={(formData as IdentityEntry).issuingAuthority || ''}
                onChange={(v) => updateField('issuingAuthority', v)}
              />
            </>
          )}

          {/* Bank Account Form */}
          {type === 'bank_account' && (
            <>
              <FormField
                label="Title"
                value={(formData as BankAccountEntry).title}
                onChange={(v) => updateField('title', v)}
                placeholder="e.g., Main Checking"
                required
              />
              <FormField
                label="Bank Name"
                value={(formData as BankAccountEntry).bankName}
                onChange={(v) => updateField('bankName', v)}
                required
              />
              <FormField
                label="Account Number"
                value={(formData as BankAccountEntry).accountNumber}
                onChange={(v) => updateField('accountNumber', v)}
                required
              />
              <FormField
                label="Account Holder"
                value={(formData as BankAccountEntry).accountHolder}
                onChange={(v) => updateField('accountHolder', v)}
                required
              />
              <FormField
                label="Routing Number"
                value={(formData as BankAccountEntry).routingNumber || ''}
                onChange={(v) => updateField('routingNumber', v)}
              />
              <FormField
                label="SWIFT/BIC"
                value={(formData as BankAccountEntry).swiftCode || ''}
                onChange={(v) => updateField('swiftCode', v)}
              />
              <FormField
                label="IBAN"
                value={(formData as BankAccountEntry).iban || ''}
                onChange={(v) => updateField('iban', v)}
              />
            </>
          )}

          {/* Folder selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Folder
            </label>
            <select
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="w-full bg-vault-darker border border-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        </form>

        <div className="p-6 border-t border-gray-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 text-white rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : entry ? (
              'Save Changes'
            ) : (
              'Create'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const typeLabels: Record<EntryType, string> = {
  password: 'Password',
  secure_note: 'Secure Note',
  credit_card: 'Credit Card',
  identity: 'Identity',
  bank_account: 'Bank Account',
};

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  multiline,
  rows = 4,
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className="w-full bg-vault-darker border border-gray-700 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full bg-vault-darker border border-gray-700 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      )}
    </div>
  );
}
