import { useState, useEffect } from 'react';
import {
  generatePassword,
  calculatePasswordStrength,
  PasswordOptions,
} from '../utils/crypto';
import { X, Copy, Check, RefreshCw } from 'lucide-react';

interface PasswordGeneratorProps {
  onClose: () => void;
  onSelect?: (password: string) => void;
}

export function PasswordGenerator({ onClose, onSelect }: PasswordGeneratorProps) {
  const [options, setOptions] = useState<PasswordOptions>({
    length: 20,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: true,
  });

  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const strength = calculatePasswordStrength(password);

  const regenerate = () => {
    setPassword(generatePassword(options));
    setCopied(false);
  };

  useEffect(() => {
    regenerate();
  }, [options]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(password);
      onClose();
    }
  };

  const getStrengthColor = () => {
    if (strength < 30) return 'bg-red-500';
    if (strength < 60) return 'bg-yellow-500';
    if (strength < 80) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  const getStrengthText = () => {
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-vault-dark rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Password Generator</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Generated password */}
          <div>
            <div className="relative">
              <input
                type="text"
                value={password}
                readOnly
                className="w-full bg-vault-darker border border-gray-700 rounded-lg py-3 pl-4 pr-24 text-white font-mono text-sm focus:outline-none"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={copyToClipboard}
                  className="p-2 text-gray-500 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                  title="Copy"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={regenerate}
                  className="p-2 text-gray-500 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                  title="Regenerate"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Strength indicator */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getStrengthColor()} transition-all`}
                  style={{ width: `${strength}%` }}
                />
              </div>
              <span className="text-sm text-gray-400">{getStrengthText()}</span>
            </div>
          </div>

          {/* Length slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Length</label>
              <span className="text-sm text-primary-400">{options.length}</span>
            </div>
            <input
              type="range"
              min="8"
              max="64"
              value={options.length}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, length: parseInt(e.target.value) }))
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>8</span>
              <span>64</span>
            </div>
          </div>

          {/* Character options */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Characters</label>

            <div className="grid grid-cols-2 gap-3">
              <ToggleOption
                label="Uppercase (A-Z)"
                checked={options.includeUppercase}
                onChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeUppercase: checked }))
                }
              />
              <ToggleOption
                label="Lowercase (a-z)"
                checked={options.includeLowercase}
                onChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeLowercase: checked }))
                }
              />
              <ToggleOption
                label="Numbers (0-9)"
                checked={options.includeNumbers}
                onChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeNumbers: checked }))
                }
              />
              <ToggleOption
                label="Symbols (!@#...)"
                checked={options.includeSymbols}
                onChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeSymbols: checked }))
                }
              />
            </div>

            <ToggleOption
              label="Exclude ambiguous characters (l, 1, I, O, 0)"
              checked={options.excludeAmbiguous}
              onChange={(checked) =>
                setOptions((prev) => ({ ...prev, excludeAmbiguous: checked }))
              }
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex gap-3">
          <button
            onClick={copyToClipboard}
            className="flex-1 py-2 px-4 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          {onSelect && (
            <button
              onClick={handleSelect}
              className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Use Password
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ToggleOptionProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleOption({ label, checked, onChange }: ToggleOptionProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={`w-10 h-6 rounded-full p-1 transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-700'
        }`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}
