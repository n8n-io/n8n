import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadGlobalConfig } from '../src/config/global-config';
import { configDir, envsDir, globalSecretsFile, secretsKeyFile } from '../src/config/paths';
import {
	clearKeyCache,
	decryptValue,
	detectBackend,
	editSecrets,
	encryptValue,
	inspectSecrets,
	isEncrypted,
	readSecrets,
	SECRETS_BACKEND_ENV_VAR,
	setSecret,
} from '../src/env/secret-store';
import { ensureSecrets } from '../src/env/secrets';

const KEY = Buffer.alloc(32, 7);

function write(file: string, text: string) {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, text);
}

function envSecrets(name: string): string {
	return join(envsDir(), name, 'secrets.env');
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	process.env[SECRETS_BACKEND_ENV_VAR] = 'file';
	clearKeyCache();
	rmSync(configDir(), { recursive: true, force: true });
	rmSync(envsDir(), { recursive: true, force: true });
});

describe('encryptValue', () => {
	it('should round-trip a value and use a fresh IV each time', () => {
		const a = encryptValue(KEY, 'API_KEY', 'sk-123 "quoted"\nline');
		const b = encryptValue(KEY, 'API_KEY', 'sk-123 "quoted"\nline');
		expect(isEncrypted(a)).toBe(true);
		expect(a).not.toBe(b);
		expect(decryptValue(KEY, 'API_KEY', a)).toBe('sk-123 "quoted"\nline');
	});

	it('should not decrypt with another key name or another key', () => {
		const value = encryptValue(KEY, 'API_KEY', 'secret');
		expect(decryptValue(KEY, 'OTHER_KEY', value)).toBeUndefined();
		expect(decryptValue(Buffer.alloc(32, 8), 'API_KEY', value)).toBeUndefined();
		expect(decryptValue(KEY, 'API_KEY', 'enc:v1:short')).toBeUndefined();
	});
});

describe('secrets files', () => {
	it('should encrypt plaintext values on read and keep comments', () => {
		const file = envSecrets('a');
		write(file, '# my secrets\nAPI_KEY=plain\n# OLD=1\nTOKEN="with space"\n');

		const entries = readSecrets(file);
		expect(entries.map((e) => [e.key, e.value])).toEqual([
			['API_KEY', 'plain'],
			['TOKEN', 'with space'],
		]);
		const text = readFileSync(file, 'utf8');
		expect(text).toMatch(/^# my secrets\nAPI_KEY=enc:v1:\S+\n# OLD=1\nTOKEN=enc:v1:\S+\n$/);
		expect(text).not.toContain('plain');
		expect(statSync(file).mode & 0o777).toBe(0o600);
		expect(statSync(secretsKeyFile()).mode & 0o777).toBe(0o600);
		// The second read decrypts and does not change the file.
		expect(readSecrets(file).map((e) => e.value)).toEqual(['plain', 'with space']);
		expect(readFileSync(file, 'utf8')).toBe(text);
	});

	it('should write encrypted values with setSecret', () => {
		const file = envSecrets('a');
		setSecret(file, 'API_KEY', 'v1');
		setSecret(file, 'API_KEY', 'v2');
		expect(readFileSync(file, 'utf8')).toMatch(/^API_KEY=enc:v1:\S+\n$/);
		expect(readSecrets(file)).toEqual([{ key: 'API_KEY', value: 'v2', line: 1 }]);
	});

	it('should generate encrypted secrets for a new environment', () => {
		const file = envSecrets('a');
		mkdirSync(dirname(file), { recursive: true });
		ensureSecrets(file);
		const values = readSecrets(file);
		expect(values.map((e) => e.key)).toContain('N8N_ENCRYPTION_KEY');
		expect(readFileSync(file, 'utf8')).not.toMatch(/N8N_ENCRYPTION_KEY=[0-9a-f]{48}/);
	});

	it('should fail and not create a new key when the key is missing', () => {
		const file = envSecrets('a');
		setSecret(file, 'API_KEY', 'v1');
		rmSync(secretsKeyFile());
		clearKeyCache();

		expect(() => readSecrets(file)).toThrow('The secrets key is missing');
		expect(() => setSecret(globalSecretsFile(), 'OTHER', 'x')).toThrow('has encrypted values');
		expect(existsSync(secretsKeyFile())).toBe(false);
		expect(inspectSecrets().files[0]).toMatchObject({ encrypted: 1, unreadable: 1 });
	});

	it('should name the value that the key cannot decrypt', () => {
		setSecret(globalSecretsFile(), 'OTHER', 'x');
		const file = envSecrets('a');
		write(file, `API_KEY=${encryptValue(Buffer.alloc(32, 9), 'API_KEY', 'x')}\n`);
		expect(() => readSecrets(file)).toThrow(/Cannot decrypt API_KEY in .*secrets\.env:1/);
	});

	it('should keep plaintext when encryption is off, and refuse encrypted values', () => {
		process.env[SECRETS_BACKEND_ENV_VAR] = 'off';
		const file = envSecrets('a');
		setSecret(file, 'API_KEY', 'plain');
		expect(readFileSync(file, 'utf8')).toBe('API_KEY=plain\n');
		expect(readSecrets(file)).toEqual([{ key: 'API_KEY', value: 'plain', line: 1 }]);

		write(file, `API_KEY=${encryptValue(KEY, 'API_KEY', 'x')}\n`);
		expect(() => readSecrets(file)).toThrow('secrets encryption is off');
	});
});

describe('editSecrets', () => {
	it('should show plaintext to the editor, encrypt the result, and delete the copy', async () => {
		const file = envSecrets('a');
		setSecret(file, 'API_KEY', 'old');
		let copy = '';

		const changed = await editSecrets(file, async (plain) => {
			copy = plain;
			expect(statSync(plain).mode & 0o777).toBe(0o600);
			expect(readFileSync(plain, 'utf8')).toBe('API_KEY=old\n');
			writeFileSync(plain, 'API_KEY=new\nADDED=1\n');
		});

		expect(changed).toBe(true);
		expect(existsSync(copy)).toBe(false);
		expect(readFileSync(file, 'utf8')).not.toMatch(/new|=1/);
		expect(readSecrets(file).map((e) => [e.key, e.value])).toEqual([
			['API_KEY', 'new'],
			['ADDED', '1'],
		]);
	});

	it('should delete the copy when the edit fails', async () => {
		const file = envSecrets('a');
		setSecret(file, 'API_KEY', 'old');
		let copy = '';
		await expect(
			editSecrets(file, async (plain) => {
				copy = plain;
				throw new Error('editor crashed');
			}),
		).rejects.toThrow('editor crashed');
		expect(existsSync(copy)).toBe(false);
	});
});

describe('backend detection', () => {
	it('should fall back to a key file with a warning, and save the choice', () => {
		delete process.env[SECRETS_BACKEND_ENV_VAR];
		const platform = Object.getOwnPropertyDescriptor(process, 'platform');
		Object.defineProperty(process, 'platform', { value: 'freebsd' });
		try {
			expect(detectBackend()).toBe('file');
			setSecret(envSecrets('a'), 'API_KEY', 'v');
		} finally {
			if (platform) Object.defineProperty(process, 'platform', platform);
		}
		expect(loadGlobalConfig().secrets.backend).toBe('file');
		expect(existsSync(secretsKeyFile())).toBe(true);
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('No OS keystore found'));
	});
});
