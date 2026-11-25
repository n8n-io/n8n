import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import pc from 'picocolors';

import {
	loadGlobalConfig,
	SECRETS_BACKENDS,
	saveGlobalConfig,
	type SecretsBackend,
} from '../config/global-config';
import {
	configDir,
	displayPath,
	envsDir,
	globalSecretsFile,
	secretsKeyFile,
} from '../config/paths';
import { RigError } from '../errors';
import { RIG } from '../meta';
import { type DotenvEntry, mapDotenvValues, parseDotenv, setInDotenv } from './dotenv';
import { withKeyLock } from './key-lock';
import { type KeyStore, writePrivate } from './key-stores/common';
import { keyFile } from './key-stores/key-file';
import { keychain } from './key-stores/keychain';
import { resetSecretServiceCheck, secretService } from './key-stores/secret-service';

/**
 * Secrets files keep their key names in plaintext and encrypt each value with
 * AES-256-GCM. The key name is the additional authenticated data, so a value
 * cannot move to another key. One random key encrypts all files. The OS
 * keystore holds it, or a 0600 file when there is no keystore.
 */
const PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_PATTERN = /^[0-9a-f]{64}$/;

/** Overrides `secrets.backend` for one command, for example in tests. */
export const SECRETS_BACKEND_ENV_VAR = 'RIG_SECRETS_BACKEND';

export type KeyBackend = Exclude<SecretsBackend, 'off'>;

const STORES: Record<KeyBackend, KeyStore> = {
	keychain,
	'secret-service': secretService,
	file: keyFile,
};

export function keyStoreLabel(backend: KeyBackend): string {
	return STORES[backend].label;
}

export function keyStoreLocation(backend: KeyBackend): string {
	return STORES[backend].location();
}

export function keyStoreAvailable(backend: KeyBackend): boolean {
	return STORES[backend].available();
}

function notice(message: string): void {
	// stderr: `rig print` writes the env to stdout.
	console.error(`${pc.yellow('!')} ${message}`);
}

function isBackend(value: string): value is SecretsBackend {
	return (SECRETS_BACKENDS as readonly string[]).includes(value);
}

/** The best key store of this machine. */
export function detectBackend(): KeyBackend {
	if (keychain.available()) return 'keychain';
	if (secretService.available()) return 'secret-service';
	return 'file';
}

export interface BackendChoice {
	backend: SecretsBackend;
	from: 'env' | 'config' | 'detected';
}

export function secretsBackend(): BackendChoice {
	const fromEnv = process.env[SECRETS_BACKEND_ENV_VAR];
	if (fromEnv) {
		if (!isBackend(fromEnv)) {
			throw new RigError(
				`Invalid ${SECRETS_BACKEND_ENV_VAR} "${fromEnv}". Use ${SECRETS_BACKENDS.join(', ')}.`,
			);
		}
		return { backend: fromEnv, from: 'env' };
	}
	const configured = loadGlobalConfig().secrets.backend;
	if (configured) return { backend: configured, from: 'config' };
	return { backend: detectBackend(), from: 'detected' };
}

export function saveSecretsBackend(backend: SecretsBackend): void {
	const config = loadGlobalConfig();
	saveGlobalConfig({ ...config, secrets: { ...config.secrets, backend } });
}

/** The warning for the `file` backend. `doctor` and `secrets status` show it too. */
export function keyFileWarning(): string {
	return `rig keeps the secrets key in a plain file, ${displayPath(secretsKeyFile())}, not in an OS keystore.`;
}

export function keyFileHint(): string {
	if (process.platform === 'darwin') return `Run \`${RIG} secrets use keychain\`.`;
	if (process.platform === 'linux') {
		return `${secretService.setupHint} Then run \`${RIG} secrets use secret-service\`.`;
	}
	return `Protect ${displayPath(secretsKeyFile())} like the secrets themselves.`;
}

const keyCache = new Map<string, Buffer>();

/** For tests: forget the keys that this process read. */
export function clearKeyCache(): void {
	keyCache.clear();
	resetSecretServiceCheck();
}

function cacheKey(backend: KeyBackend): string {
	return `${backend}:${backend === 'file' ? secretsKeyFile() : configDir()}`;
}

function parseKey(hex: string, backend: KeyBackend): Buffer {
	if (!KEY_PATTERN.test(hex)) {
		throw new RigError(
			`The secrets key in the ${STORES[backend].location()} is not valid.`,
			`Import the right key with \`${RIG} secrets import-key --force\`.`,
		);
	}
	return Buffer.from(hex, 'hex');
}

/** The key in a store, without creating one. */
export function readKey(backend: KeyBackend): Buffer | undefined {
	const cached = keyCache.get(cacheKey(backend));
	if (cached) return cached;
	const store = STORES[backend];
	if (!store.available()) {
		throw new RigError(
			`The secrets backend "${backend}" (${store.label}) is not available.`,
			`${store.setupHint} Or switch with \`${RIG} secrets use <backend>\`.`.trim(),
		);
	}
	const hex = store.read();
	if (!hex) return undefined;
	const key = parseKey(hex, backend);
	keyCache.set(cacheKey(backend), key);
	return key;
}

export function storeKey(backend: KeyBackend, key: Buffer): void {
	const store = STORES[backend];
	store.write(key.toString('hex'));
	keyCache.delete(cacheKey(backend));
	const saved = readKey(backend);
	if (!saved?.equals(key)) {
		throw new RigError(`The ${store.label} did not keep the secrets key.`);
	}
}

/** The key of the active backend. With `create`, makes a key when the store has none. */
function activeKey(create: boolean): Buffer {
	const choice = secretsBackend();
	if (choice.backend === 'off') throw new RigError('Secrets encryption is off.');
	const backend = choice.backend;
	if (choice.from === 'detected') {
		// Keep the choice, so a keystore that goes away later is an error, not a new key.
		saveSecretsBackend(backend);
		if (backend === 'file') {
			notice(`No OS keystore found. ${keyFileWarning()} ${pc.dim(keyFileHint())}`);
		}
	}
	const key = readKey(backend);
	if (key) return key;

	const hint = `Import the key with \`${RIG} secrets import-key\`, or run \`${RIG} secrets use <backend>\` with the backend that has it.`;
	if (!create) {
		throw new RigError(`The secrets key is missing from the ${STORES[backend].location()}.`, hint);
	}
	return withKeyLock(() => {
		// Another rig process can have made the key while this one waited.
		keyCache.delete(cacheKey(backend));
		const created = readKey(backend);
		if (created) return created;
		const orphaned = secretsFiles().filter((file) =>
			parseDotenv(readFileSync(file, 'utf8')).some((entry) => isEncrypted(entry.value)),
		);
		if (orphaned.length > 0) {
			throw new RigError(
				`The secrets key is missing from the ${STORES[backend].location()}, but ${orphaned.map(displayPath).join(', ')} has encrypted values.`,
				hint,
			);
		}
		const fresh = randomBytes(32);
		storeKey(backend, fresh);
		return fresh;
	});
}

export function isEncrypted(value: string): boolean {
	return value.startsWith(PREFIX);
}

export function encryptValue(key: Buffer, name: string, value: string): string {
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
	cipher.setAAD(Buffer.from(name, 'utf8'));
	const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
	return `${PREFIX}${Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url')}`;
}

/** Returns `undefined` when the key or the name does not match. */
export function decryptValue(key: Buffer, name: string, value: string): string | undefined {
	const raw = Buffer.from(value.slice(PREFIX.length), 'base64url');
	if (raw.length < IV_BYTES + TAG_BYTES) return undefined;
	try {
		const decipher = createDecipheriv(ALGORITHM, key, raw.subarray(0, IV_BYTES), {
			authTagLength: TAG_BYTES,
		});
		decipher.setAAD(Buffer.from(name, 'utf8'));
		decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
		return Buffer.concat([
			decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
			decipher.final(),
		]).toString('utf8');
	} catch {
		return undefined;
	}
}

function decryptOrThrow(key: Buffer, entry: DotenvEntry, file: string): string {
	const value = decryptValue(key, entry.key, entry.value);
	if (value === undefined) {
		throw new RigError(
			`Cannot decrypt ${entry.key} in ${displayPath(file)}:${entry.line}. The secrets key does not match.`,
			`Import the key that encrypted it with \`${RIG} secrets import-key\`, or set the value again with \`${RIG} env set ${entry.key}=… --on <layer>\`.`,
		);
	}
	return value;
}

function assertNotOff(file: string, entries: DotenvEntry[]): void {
	if (entries.some((entry) => isEncrypted(entry.value))) {
		throw new RigError(
			`${displayPath(file)} has encrypted values, but secrets encryption is off.`,
			`Run \`${RIG} secrets use <backend>\` with the backend that has the key.`,
		);
	}
}

/** Encrypts the plaintext values of dotenv text. */
function encryptText(text: string, key: Buffer): { text: string; count: number } {
	let count = 0;
	const result = mapDotenvValues(text, (name, value) => {
		if (isEncrypted(value)) return undefined;
		count++;
		return encryptValue(key, name, value);
	});
	return { text: result, count };
}

/** Decrypts the encrypted values of dotenv text. */
function decryptText(text: string, key: Buffer, file: string): string {
	const lines = new Map(parseDotenv(text).map((entry) => [entry.key, entry.line]));
	return mapDotenvValues(text, (name, value) =>
		isEncrypted(value)
			? decryptOrThrow(key, { key: name, value, line: lines.get(name) ?? 0 }, file)
			: undefined,
	);
}

/**
 * Reads a secrets file and decrypts its values. Plaintext values, for example
 * from an older rig or a manual edit, get encrypted in the file.
 */
export function readSecrets(file: string): DotenvEntry[] {
	if (!existsSync(file)) return [];
	const text = readFileSync(file, 'utf8');
	const entries = parseDotenv(text);
	if (entries.length === 0) return entries;
	const { backend } = secretsBackend();
	if (backend === 'off') {
		assertNotOff(file, entries);
		return entries;
	}
	const hasPlaintext = entries.some((entry) => !isEncrypted(entry.value));
	const key = activeKey(hasPlaintext);
	// Decrypt first: with a wrong key, the file must not get values of a second key.
	const decrypted = entries.map((entry) =>
		isEncrypted(entry.value) ? { ...entry, value: decryptOrThrow(key, entry, file) } : entry,
	);
	if (hasPlaintext) {
		const encrypted = encryptText(text, key);
		writePrivate(file, encrypted.text);
		notice(`Encrypted ${encrypted.count} secret value(s) in ${displayPath(file)}.`);
	}
	return decrypted;
}

/** Sets one secret. Encrypts the value unless encryption is off. */
export function setSecret(file: string, name: string, value: string): void {
	const { backend } = secretsBackend();
	const stored = backend === 'off' ? value : encryptValue(activeKey(true), name, value);
	const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
	writePrivate(file, setInDotenv(text, name, stored));
}

/** Encrypts the plaintext values of a file. Returns how many it encrypted. */
export function encryptSecretsFile(file: string): number {
	if (!existsSync(file)) return 0;
	const text = readFileSync(file, 'utf8');
	const entries = parseDotenv(text);
	if (entries.every((entry) => isEncrypted(entry.value))) return 0;
	const key = activeKey(true);
	for (const entry of entries) {
		if (isEncrypted(entry.value)) decryptOrThrow(key, entry, file);
	}
	const result = encryptText(text, key);
	writePrivate(file, result.text);
	return result.count;
}

/** Writes the values of a file in plaintext, with the key of a backend. Returns how many changed. */
export function decryptSecretsFile(file: string, key: Buffer): number {
	if (!existsSync(file)) return 0;
	const text = readFileSync(file, 'utf8');
	const count = parseDotenv(text).filter((entry) => isEncrypted(entry.value)).length;
	if (count === 0) return 0;
	writePrivate(file, decryptText(text, key, file));
	return count;
}

/** The global secrets file and the secrets file of each environment, when they exist. */
export function secretsFiles(): string[] {
	const files = [globalSecretsFile()];
	if (existsSync(envsDir())) {
		for (const name of readdirSync(envsDir()).sort()) {
			files.push(join(envsDir(), name, 'secrets.env'));
		}
	}
	return files.filter((file) => existsSync(file));
}

export interface SecretsFileStatus {
	file: string;
	encrypted: number;
	plaintext: number;
	/** Encrypted values that the key cannot decrypt. */
	unreadable: number;
}

/** Counts the values of a file. Does not change it. */
export function secretsFileStatus(file: string, key: Buffer | undefined): SecretsFileStatus {
	const entries = existsSync(file) ? parseDotenv(readFileSync(file, 'utf8')) : [];
	const encrypted = entries.filter((entry) => isEncrypted(entry.value));
	return {
		file,
		encrypted: encrypted.length,
		plaintext: entries.length - encrypted.length,
		unreadable: encrypted.filter(
			(entry) => !key || decryptValue(key, entry.key, entry.value) === undefined,
		).length,
	};
}

export interface SecretsReport {
	choice: BackendChoice;
	/** `false` when the key store of the backend does not work on this machine. */
	available: boolean;
	key?: Buffer;
	/** Why rig cannot read the key. */
	problem?: string;
	files: SecretsFileStatus[];
}

/** The state of the backend, the key, and each secrets file. Changes nothing. */
export function inspectSecrets(): SecretsReport {
	const choice = secretsBackend();
	let available = true;
	let key: Buffer | undefined;
	let problem: string | undefined;
	if (choice.backend !== 'off') {
		available = keyStoreAvailable(choice.backend);
		if (available) {
			try {
				key = readKey(choice.backend);
			} catch (error) {
				problem = error instanceof Error ? error.message : String(error);
			}
		}
	}
	const files = secretsFiles().map((file) => secretsFileStatus(file, key));
	return { choice, available, key, problem, files };
}

const CLEANUP_SIGNALS: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

/** A private directory for plaintext copies. On Linux, $XDG_RUNTIME_DIR is in memory. */
function privateTempDir(): string {
	const runtime = process.env.XDG_RUNTIME_DIR;
	const base = runtime && existsSync(runtime) ? runtime : tmpdir();
	// mkdtemp creates the directory with mode 0700.
	return mkdtempSync(join(base, 'rig-secrets-'));
}

/**
 * Decrypts a secrets file into a private temp file, lets `edit` change it,
 * then encrypts the result back. The temp file is always deleted.
 * Returns `true` when the content changed.
 */
export async function editSecrets(
	file: string,
	edit: (plainFile: string) => Promise<void>,
): Promise<boolean> {
	const original = existsSync(file) ? readFileSync(file, 'utf8') : '';
	const { backend } = secretsBackend();
	const entries = parseDotenv(original);
	if (backend === 'off') assertNotOff(file, entries);
	const plain = entries.some((entry) => isEncrypted(entry.value))
		? decryptText(original, activeKey(false), file)
		: original;

	const dir = privateTempDir();
	const plainFile = join(dir, basename(file));
	// A signal ends Node without `finally`, so delete the plaintext copy first.
	const onSignal = (signal: NodeJS.Signals) => {
		rmSync(dir, { recursive: true, force: true });
		for (const name of CLEANUP_SIGNALS) process.removeListener(name, onSignal);
		process.kill(process.pid, signal);
	};
	for (const name of CLEANUP_SIGNALS) process.once(name, onSignal);
	try {
		writeFileSync(plainFile, plain, { mode: 0o600 });
		await edit(plainFile);
		const edited = readFileSync(plainFile, 'utf8');
		if (edited === plain) return false;
		const hasValues = parseDotenv(edited).length > 0;
		const stored =
			backend === 'off' || !hasValues ? edited : encryptText(edited, activeKey(true)).text;
		writePrivate(file, stored);
		return true;
	} finally {
		for (const name of CLEANUP_SIGNALS) process.removeListener(name, onSignal);
		rmSync(dir, { recursive: true, force: true });
	}
}
