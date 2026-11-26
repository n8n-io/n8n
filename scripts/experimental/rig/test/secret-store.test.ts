import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	statSync,
	utimesSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { runCommand } from 'citty';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { secretsChecks } from '../src/commands/doctor';
import { shownValue } from '../src/commands/env-browse';
import { secretsCommand } from '../src/commands/secrets';
import { loadGlobalConfig } from '../src/config/global-config';
import { parseTopology, saveTopology } from '../src/config/env-yaml';
import {
	configDir,
	envsDir,
	globalSecretsFile,
	profileFile,
	secretsKeyFile,
} from '../src/config/paths';
import {
	clearKeyCache,
	decryptEnvFile,
	decryptValue,
	detectBackend,
	editEnvFile,
	encryptEnvFile,
	encryptValue,
	inspectSecrets,
	isEncrypted,
	readEnvFile,
	readKey,
	saveSecretsBackend,
	SECRETS_BACKEND_ENV_VAR,
	setEnvValue,
} from '../src/env/secret-store';
import { ensureSecrets } from '../src/env/secrets';
import type { EnvSource } from '../src/env/resolve';
import { isMaskedValue, isSensitiveKey } from '../src/env/sensitive';
import { envPaths, RigEnv } from '../src/environment';

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

		const entries = readEnvFile(file);
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
		expect(readEnvFile(file).map((e) => e.value)).toEqual(['plain', 'with space']);
		expect(readFileSync(file, 'utf8')).toBe(text);
	});

	it('should write encrypted values with setEnvValue', () => {
		const file = envSecrets('a');
		setEnvValue(file, 'API_KEY', 'v1');
		setEnvValue(file, 'API_KEY', 'v2');
		expect(readFileSync(file, 'utf8')).toMatch(/^API_KEY=enc:v1:\S+\n$/);
		expect(readEnvFile(file)).toEqual([{ key: 'API_KEY', value: 'v2', line: 1 }]);
	});

	it('should generate encrypted secrets for a new environment', () => {
		const file = envSecrets('a');
		mkdirSync(dirname(file), { recursive: true });
		ensureSecrets(file);
		const values = readEnvFile(file);
		expect(values.map((e) => e.key)).toContain('N8N_ENCRYPTION_KEY');
		expect(readFileSync(file, 'utf8')).not.toMatch(/N8N_ENCRYPTION_KEY=[0-9a-f]{48}/);
	});

	it('should fail and not create a new key when the key is missing', () => {
		const file = envSecrets('a');
		setEnvValue(file, 'API_KEY', 'v1');
		rmSync(secretsKeyFile());
		clearKeyCache();

		expect(() => readEnvFile(file)).toThrow('The secrets key is missing');
		expect(() => setEnvValue(globalSecretsFile(), 'OTHER', 'x')).toThrow('has encrypted values');
		expect(existsSync(secretsKeyFile())).toBe(false);
		expect(inspectSecrets().files[0]).toMatchObject({ encrypted: 1, unreadable: 1 });
	});

	it('should name the value that the key cannot decrypt', () => {
		setEnvValue(globalSecretsFile(), 'OTHER', 'x');
		const file = envSecrets('a');
		write(file, `API_KEY=${encryptValue(Buffer.alloc(32, 9), 'API_KEY', 'x')}\n`);
		expect(() => readEnvFile(file)).toThrow(/Cannot decrypt API_KEY in .*secrets\.env:1/);
	});

	it('should not change a file when the key cannot decrypt its values', () => {
		setEnvValue(globalSecretsFile(), 'OTHER', 'x');
		const file = envSecrets('a');
		const text = `API_KEY=${encryptValue(Buffer.alloc(32, 9), 'API_KEY', 'x')}\nNEW=plain\n`;
		write(file, text);
		expect(() => readEnvFile(file)).toThrow('Cannot decrypt API_KEY');
		expect(() => encryptEnvFile(file)).toThrow('Cannot decrypt API_KEY');
		expect(readFileSync(file, 'utf8')).toBe(text);
	});

	it('should make a key when a crashed process left the lock', () => {
		const lock = join(configDir(), '.secrets-key.lock');
		mkdirSync(lock, { recursive: true });
		const old = new Date(Date.now() - 60_000);
		utimesSync(lock, old, old);
		setEnvValue(envSecrets('a'), 'API_KEY', 'v');
		expect(existsSync(secretsKeyFile())).toBe(true);
		expect(existsSync(lock)).toBe(false);
	});

	it('should keep plaintext when encryption is off, and refuse encrypted values', () => {
		process.env[SECRETS_BACKEND_ENV_VAR] = 'off';
		const file = envSecrets('a');
		setEnvValue(file, 'API_KEY', 'plain');
		expect(readFileSync(file, 'utf8')).toBe('API_KEY=plain\n');
		expect(readEnvFile(file)).toEqual([{ key: 'API_KEY', value: 'plain', line: 1 }]);

		write(file, `API_KEY=${encryptValue(KEY, 'API_KEY', 'x')}\n`);
		expect(() => readEnvFile(file)).toThrow('secrets encryption is off');
	});
});

describe('editEnvFile', () => {
	it('should show plaintext to the editor, encrypt the result, and delete the copy', async () => {
		const file = envSecrets('a');
		setEnvValue(file, 'API_KEY', 'old');
		let copy = '';

		const changed = await editEnvFile(file, async (plain) => {
			copy = plain;
			expect(statSync(plain).mode & 0o777).toBe(0o600);
			expect(readFileSync(plain, 'utf8')).toBe('API_KEY=old\n');
			writeFileSync(plain, 'API_KEY=new\nADDED=1\n');
		});

		expect(changed).toBe(true);
		expect(existsSync(copy)).toBe(false);
		expect(readFileSync(file, 'utf8')).not.toMatch(/new|=1/);
		expect(readEnvFile(file).map((e) => [e.key, e.value])).toEqual([
			['API_KEY', 'new'],
			['ADDED', '1'],
		]);
	});

	it('should delete the copy when the edit fails', async () => {
		const file = envSecrets('a');
		setEnvValue(file, 'API_KEY', 'old');
		let copy = '';
		await expect(
			editEnvFile(file, async (plain) => {
				copy = plain;
				throw new Error('editor crashed');
			}),
		).rejects.toThrow('editor crashed');
		expect(existsSync(copy)).toBe(false);
	});
});

describe('secrets use', () => {
	it('should change nothing when the key cannot decrypt a value', async () => {
		delete process.env[SECRETS_BACKEND_ENV_VAR];
		saveSecretsBackend('file');
		setEnvValue(globalSecretsFile(), 'OTHER', 'x');
		const file = envSecrets('a');
		const text = `API_KEY=${encryptValue(Buffer.alloc(32, 9), 'API_KEY', 'x')}\n`;
		write(file, text);
		const global = readFileSync(globalSecretsFile(), 'utf8');

		await expect(runCommand(secretsCommand, { rawArgs: ['use', 'off'] })).rejects.toThrow(
			'cannot decrypt the values',
		);
		expect(readFileSync(file, 'utf8')).toBe(text);
		expect(readFileSync(globalSecretsFile(), 'utf8')).toBe(global);
		expect(loadGlobalConfig().secrets.backend).toBe('file');
	});
});

describe('backend detection', () => {
	it('should fall back to a key file with a warning, and save the choice', () => {
		delete process.env[SECRETS_BACKEND_ENV_VAR];
		const platform = Object.getOwnPropertyDescriptor(process, 'platform');
		Object.defineProperty(process, 'platform', { value: 'freebsd' });
		try {
			expect(detectBackend()).toBe('file');
			setEnvValue(envSecrets('a'), 'API_KEY', 'v');
		} finally {
			if (platform) Object.defineProperty(process, 'platform', platform);
		}
		expect(loadGlobalConfig().secrets.backend).toBe('file');
		expect(existsSync(secretsKeyFile())).toBe(true);
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('No OS keystore found'));
	});
});

describe('sensitive keys', () => {
	it('should match key names by their ending', () => {
		for (const key of [
			'OPENAI_API_KEY',
			'ANTHROPIC_API_KEY',
			'VERCEL_AI_GATEWAY_API_KEY',
			'GROQ_API_KEY',
			'API_KEY',
			'N8N_LICENSE_CERT',
			'N8N_LICENSE_ACTIVATION_KEY',
			'N8N_ENCRYPTION_KEY',
			'GITHUB_TOKEN',
			'OAUTH_CLIENT_SECRET',
			'AWS_SECRET_ACCESS_KEY',
			'DB_POSTGRESDB_PASSWORD',
			'JWT_PRIVATE_KEY',
			'openai_api_key',
			// n8n env vars without `API_KEY` or `PASSWORD` in the name.
			'N8N_AI_ANTHROPIC_KEY',
			'N8N_EXTERNAL_STORAGE_AZURE_ACCOUNT_KEY',
			'N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY',
			'N8N_SMTP_PASS',
			'CREDENTIALS_OVERWRITE_DATA',
			'N8N_INSTANCE_OWNER_PASSWORD_HASH',
		]) {
			expect(isSensitiveKey(key), key).toBe(true);
		}
		for (const key of [
			'N8N_ENCRYPTION_KEY_FILE',
			'N8N_ENGINE_TLS_KEY_FILE',
			'N8N_REDIS_KEY_PREFIX',
			'N8N_MULTI_MAIN_SETUP_KEY_TTL',
			'N8N_RUNNERS_GRANT_TOKEN_TTL',
			'N8N_PASSWORD_MIN_LENGTH',
			'N8N_LOG_LEVEL',
			'AWS_ACCESS_KEY_ID',
			'MAX_TOKENS',
			'N8N_SECRETS_PATH',
			'TOKENIZER',
			'MONKEY',
		]) {
			expect(isSensitiveKey(key), key).toBe(false);
		}
	});

	it('should encrypt only sensitive values in a layer file', () => {
		const file = join(envsDir(), 'a', 'env', 'shared.env');
		write(file, '# AI\nOPENAI_API_KEY=sk-1\nN8N_LOG_LEVEL=debug\n');

		expect(readEnvFile(file).map((e) => [e.key, e.value])).toEqual([
			['OPENAI_API_KEY', 'sk-1'],
			['N8N_LOG_LEVEL', 'debug'],
		]);
		expect(readFileSync(file, 'utf8')).toMatch(
			/^# AI\nOPENAI_API_KEY=enc:v1:\S+\nN8N_LOG_LEVEL=debug\n$/,
		);
	});

	it('should encrypt sensitive values in profiles', () => {
		const file = profileFile('ai');
		write(file, 'ANTHROPIC_API_KEY=sk-ant\n');
		expect(readEnvFile(file)[0].value).toBe('sk-ant');
		expect(readFileSync(file, 'utf8')).toMatch(/^ANTHROPIC_API_KEY=enc:v1:/);
		expect(inspectSecrets().files.map((s) => s.file)).toContain(file);
	});

	it('should write sensitive values encrypted and other values in plaintext', () => {
		const file = join(envsDir(), 'a', 'env', 'worker.env');
		write(file, '');
		setEnvValue(file, 'VERCEL_AI_GATEWAY_API_KEY', 'vk');
		setEnvValue(file, 'N8N_LOG_LEVEL', 'warn');
		const text = readFileSync(file, 'utf8');
		expect(text).toMatch(/^VERCEL_AI_GATEWAY_API_KEY=enc:v1:\S+\nN8N_LOG_LEVEL=warn\n$/);
		expect(readEnvFile(file).map((e) => e.value)).toEqual(['vk', 'warn']);
	});

	it('should not need the key for a layer file without secrets', () => {
		const file = join(envsDir(), 'a', 'env', 'shared.env');
		write(file, 'N8N_LOG_LEVEL=debug\n');
		process.env[SECRETS_BACKEND_ENV_VAR] = 'keychain';
		// The keychain is not available on Linux CI. A read that needed the key would throw.
		const platform = Object.getOwnPropertyDescriptor(process, 'platform');
		Object.defineProperty(process, 'platform', { value: 'freebsd' });
		try {
			expect(readEnvFile(file)).toEqual([{ key: 'N8N_LOG_LEVEL', value: 'debug', line: 1 }]);
			setEnvValue(file, 'N8N_LOG_LEVEL', 'info');
			expect(() => setEnvValue(file, 'OPENAI_API_KEY', 'x')).toThrow('is not available');
		} finally {
			if (platform) Object.defineProperty(process, 'platform', platform);
		}
		expect(existsSync(secretsKeyFile())).toBe(false);
	});

	it('should give components the decrypted value from any layer', () => {
		const paths = envPaths('a');
		mkdirSync(paths.layersDir, { recursive: true });
		saveTopology(paths.envYaml, parseTopology({ name: 'a' }));
		write(paths.layerFile('main'), 'OPENAI_API_KEY=sk-main\n');
		const env = new RigEnv('a', paths);
		const main = env.component('main-1');
		if (!main) throw new Error('no main');
		expect(env.resolve(main).env.OPENAI_API_KEY).toBe('sk-main');
		expect(readFileSync(paths.layerFile('main'), 'utf8')).not.toContain('sk-main');
	});

	it('should encrypt new sensitive values after an edit of a layer file', async () => {
		const file = join(envsDir(), 'a', 'env', 'shared.env');
		setEnvValue(globalSecretsFile(), 'OTHER', 'x');
		write(
			file,
			`OPENAI_API_KEY=${encryptValue(readKey('file') ?? KEY, 'OPENAI_API_KEY', 'old')}\n`,
		);

		await editEnvFile(file, async (plain) => {
			expect(readFileSync(plain, 'utf8')).toBe('OPENAI_API_KEY=old\n');
			writeFileSync(plain, 'OPENAI_API_KEY=new\nANTHROPIC_API_KEY=a\nN8N_LOG_LEVEL=debug\n');
		});

		const text = readFileSync(file, 'utf8');
		expect(text).toMatch(
			/^OPENAI_API_KEY=enc:v1:\S+\nANTHROPIC_API_KEY=enc:v1:\S+\nN8N_LOG_LEVEL=debug\n$/,
		);
		expect(encryptEnvFile(file)).toBe(0);
	});
});

describe('isMaskedValue', () => {
	const source = (layer: EnvSource['layer']): EnvSource => ({ layer, label: 'x', value: 'v' });

	it('should show the values that rig sets itself', () => {
		expect(isMaskedValue('DB_POSTGRESDB_PASSWORD', source('managed'))).toBe(false);
		expect(isMaskedValue('N8N_RUNNERS_AUTH_TOKEN', source('default'))).toBe(false);
	});

	it('should mask sensitive values from files and the shell, and every secrets value', () => {
		expect(isMaskedValue('DB_POSTGRESDB_PASSWORD', source('shared'))).toBe(true);
		expect(isMaskedValue('OPENAI_API_KEY', source('profile'))).toBe(true);
		expect(isMaskedValue('OPENAI_API_KEY', source('shell'))).toBe(true);
		expect(isMaskedValue('MY_SETTING', source('secrets'))).toBe(true);
		expect(isMaskedValue('N8N_LOG_LEVEL', source('component'))).toBe(false);
	});
});

describe('env browse values', () => {
	it('should mask sensitive keys and every value of a secrets layer', () => {
		expect(shownValue('shared', 'OPENAI_API_KEY', 'sk-1')).toBe('••••••');
		expect(shownValue('profile:ai', 'N8N_AI_ANTHROPIC_KEY', 'sk-2')).toBe('••••••');
		expect(shownValue('secrets', 'MY_SETTING', 'x')).toBe('••••••');
		expect(shownValue('global-secrets', 'MY_SETTING', 'x')).toBe('••••••');
		expect(shownValue('shared', 'N8N_LOG_LEVEL', 'debug')).toBe('debug');
	});
});

describe('review fixes', () => {
	it('should encrypt and decrypt a CRLF file', () => {
		const file = envSecrets('a');
		write(file, 'API_KEY=plain\r\nOTHER=x # note\r\n');
		expect(readEnvFile(file).map((e) => e.value)).toEqual(['plain', 'x']);
		const text = readFileSync(file, 'utf8');
		expect(text).toMatch(/^API_KEY=enc:v1:\S+\r\nOTHER=enc:v1:\S+ # note\r\n$/);

		const key = readKey('file');
		if (!key) throw new Error('no key');
		expect(decryptEnvFile(file, key)).toBe(2);
		expect(readFileSync(file, 'utf8')).toBe('API_KEY=plain\r\nOTHER=x # note\r\n');
	});

	it('should keep a value encrypted after an edit, also when the name rule does not match', async () => {
		const file = join(envsDir(), 'a', 'env', 'shared.env');
		setEnvValue(globalSecretsFile(), 'OTHER', 'x');
		const key = readKey('file');
		if (!key) throw new Error('no key');
		write(file, `COPIED_SETTING=${encryptValue(key, 'COPIED_SETTING', 'old')}\n`);

		await editEnvFile(file, async (plain) => {
			writeFileSync(plain, 'COPIED_SETTING=new\nN8N_LOG_LEVEL=debug\n');
		});

		expect(readFileSync(file, 'utf8')).toMatch(
			/^COPIED_SETTING=enc:v1:\S+\nN8N_LOG_LEVEL=debug\n$/,
		);
		expect(readEnvFile(file)[0].value).toBe('new');
	});
});

describe('status of the key and the values', () => {
	it('should warn in doctor about plaintext values', () => {
		const file = join(envsDir(), 'a', 'env', 'shared.env');
		setEnvValue(globalSecretsFile(), 'OTHER', 'x');
		write(file, 'OPENAI_API_KEY=plain\n');
		const checks = secretsChecks();
		expect(checks).toContainEqual(
			expect.objectContaining({ status: 'warn', detail: expect.stringContaining('in plaintext') }),
		);
		expect(checks.some((c) => c.status === 'ok' && c.label === 'Secrets')).toBe(false);
	});

	it('should show a missing key in secrets status when values are encrypted', async () => {
		setEnvValue(globalSecretsFile(), 'OTHER', 'x');
		rmSync(secretsKeyFile());
		clearKeyCache();
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		await runCommand(secretsCommand, { rawArgs: ['status'] });
		const output = log.mock.calls.map((call) => String(call[0])).join('\n');
		expect(output).toContain('missing: 1 encrypted value cannot be decrypted');
		expect(output).not.toContain('created on first use');
	});
});
