import { readFileSync } from 'node:fs';
import { defineCommand } from 'citty';
import pc from 'picocolors';

import { SECRETS_BACKENDS, type SecretsBackend } from '../config/global-config';
import { displayPath } from '../config/paths';
import {
	decryptEnvFile,
	encryptEnvFile,
	inspectSecrets,
	keyFileHint,
	keyFileWarning,
	keyStoreAvailable,
	keyStoreLabel,
	keyStoreLocation,
	readKey,
	saveSecretsBackend,
	SECRETS_BACKEND_ENV_VAR,
	secretsBackend,
	envFiles,
	envFileStatus,
	storeKey,
} from '../env/secret-store';
import { RigError } from '../errors';
import { RIG } from '../meta';
import { table, ui } from '../ui/output';
import { isInteractive, password } from '../ui/prompt';

const KEY_PATTERN = /^[0-9a-f]{64}$/;

function parseBackend(value: string): SecretsBackend {
	const backend = SECRETS_BACKENDS.find((candidate) => candidate === value);
	if (!backend) {
		throw new RigError(`Unknown backend "${value}". Use ${SECRETS_BACKENDS.join(', ')}.`);
	}
	return backend;
}

function assertNoOverride(): void {
	if (process.env[SECRETS_BACKEND_ENV_VAR]) {
		throw new RigError(
			`${SECRETS_BACKEND_ENV_VAR} overrides the saved backend.`,
			`Unset ${SECRETS_BACKEND_ENV_VAR}, then try again.`,
		);
	}
}

function plural(count: number, word: string): string {
	return `${count} ${word}${count === 1 ? '' : 's'}`;
}

const statusCommand = defineCommand({
	meta: {
		name: 'status',
		description: 'Show the backend, the key, and each env file with secrets',
	},
	run() {
		const report = inspectSecrets();
		const { backend, from } = report.choice;
		const source = {
			env: SECRETS_BACKEND_ENV_VAR,
			config: 'secrets.backend',
			detected: 'detected, not saved yet',
		}[from];
		const rows: string[][] = [[pc.bold('Backend'), `${backend} ${pc.dim(`(${source})`)}`]];
		if (backend !== 'off') {
			// rig makes a key only when no file has encrypted values. Otherwise the key is lost.
			const encrypted = report.files.reduce((sum, status) => sum + status.encrypted, 0);
			const keyState = report.key
				? pc.green('· present')
				: encrypted > 0
					? pc.red(
							`· missing: ${plural(encrypted, 'encrypted value')} cannot be decrypted. Import the key with \`${RIG} secrets import-key\``,
						)
					: pc.dim('· created on first use');
			rows.push([
				pc.bold('Key'),
				!report.available
					? pc.red(`${keyStoreLabel(backend)} is not available on this machine`)
					: report.problem
						? pc.red(report.problem)
						: `${keyStoreLocation(backend)} ${keyState}`,
			]);
		}
		console.log(table(rows));
		if (backend === 'file') ui.warn(`${keyFileWarning()} ${pc.dim(keyFileHint())}`);
		if (backend === 'off')
			ui.warn(
				`Secrets are in plaintext. Turn encryption on with \`${RIG} secrets use <backend>\`.`,
			);

		if (report.files.length === 0) {
			ui.step('No env files with secrets yet.');
			return;
		}
		console.log('');
		const fileRows = report.files.map((status) => {
			const parts = [`${status.encrypted} encrypted`];
			if (status.plaintext > 0) parts.push(pc.yellow(`${status.plaintext} plaintext`));
			if (status.unreadable > 0) parts.push(pc.red(`${status.unreadable} unreadable`));
			return [displayPath(status.file), parts.join(', ')];
		});
		console.log(table(fileRows));
	},
});

const encryptCommand = defineCommand({
	meta: {
		name: 'encrypt',
		description:
			'Encrypt all plaintext secrets now: secrets.env values and sensitive keys in other env files',
	},
	run() {
		if (secretsBackend().backend === 'off') {
			throw new RigError('Secrets encryption is off.', `Run \`${RIG} secrets use <backend>\`.`);
		}
		let total = 0;
		for (const file of envFiles()) {
			const count = encryptEnvFile(file);
			if (count > 0) ui.success(`Encrypted ${plural(count, 'value')} in ${displayPath(file)}`);
			total += count;
		}
		if (total === 0) ui.success('All secret values are encrypted.');
	},
});

const useCommand = defineCommand({
	meta: {
		name: 'use',
		description: `Change where rig keeps the key (${SECRETS_BACKENDS.join(', ')}). rig moves the key`,
	},
	args: {
		backend: { type: 'positional', required: true, description: SECRETS_BACKENDS.join(' | ') },
		force: { type: 'boolean', description: 'Replace a different key in the new backend' },
	},
	run({ args }) {
		assertNoOverride();
		const target = parseBackend(String(args.backend));
		const { backend: current, from } = secretsBackend();
		if (target === current && from === 'config') {
			ui.info(`rig already uses ${target}.`);
			return;
		}
		const files = envFiles();
		const currentKey =
			current !== 'off' && keyStoreAvailable(current) ? readKey(current) : undefined;
		if (target !== 'off' && !keyStoreAvailable(target)) {
			throw new RigError(`The ${keyStoreLabel(target)} is not available on this machine.`);
		}
		const targetKey = target === 'off' ? undefined : readKey(target);
		// Check all values before rig changes a file, so a failure leaves everything as it was.
		const keyAfter = currentKey ?? targetKey;
		const unreadable = files.filter((file) => envFileStatus(file, keyAfter).unreadable > 0);
		if (unreadable.length > 0) {
			throw new RigError(
				`The secrets key cannot decrypt the values in ${unreadable.map(displayPath).join(', ')}.`,
				`Import the key that encrypted them with \`${RIG} secrets import-key\` first. Run \`${RIG} secrets status\` to see the files.`,
			);
		}

		if (target === 'off') {
			for (const file of files) {
				const count = currentKey ? decryptEnvFile(file, currentKey) : 0;
				if (count > 0) ui.step(`Decrypted ${plural(count, 'value')} in ${displayPath(file)}`);
			}
			saveSecretsBackend('off');
			ui.success('Secrets encryption is off. The secrets files are in plaintext now.');
			if (current !== 'off' && currentKey) {
				ui.step(`The key stays in the ${keyStoreLocation(current)}.`);
			}
			return;
		}

		if (currentKey && targetKey && !currentKey.equals(targetKey) && !args.force) {
			throw new RigError(
				`The ${keyStoreLocation(target)} already has a different key.`,
				`Add --force to replace it with the current key. Export it first with \`RIG_SECRETS_BACKEND=${target} ${RIG} secrets export-key\` if you need it.`,
			);
		}
		if (currentKey && !targetKey?.equals(currentKey)) storeKey(target, currentKey);
		saveSecretsBackend(target);

		let total = 0;
		for (const file of files) total += encryptEnvFile(file);
		ui.success(`rig keeps the secrets key in the ${keyStoreLocation(target)}.`);
		if (total > 0) ui.step(`Encrypted ${plural(total, 'plaintext value')}.`);
		if (target === 'file') ui.warn(`${keyFileWarning()} ${pc.dim(keyFileHint())}`);
		if (current !== 'off' && currentKey && current !== target) {
			ui.step(
				`A copy of the key stays in the ${keyStoreLocation(current)}. Delete it when you no longer need it.`,
			);
		}
	},
});

const exportKeyCommand = defineCommand({
	meta: {
		name: 'export-key',
		description: 'Print the secrets key, for a backup or another machine',
	},
	run() {
		const { backend } = secretsBackend();
		if (backend === 'off') throw new RigError('Secrets encryption is off. There is no key.');
		const key = readKey(backend);
		if (!key) throw new RigError(`There is no key in the ${keyStoreLocation(backend)} yet.`);
		console.error(pc.yellow('! This key decrypts all rig secrets. Keep it in a password manager.'));
		console.log(key.toString('hex'));
	},
});

const importKeyCommand = defineCommand({
	meta: {
		name: 'import-key',
		description: 'Save a key from `rig secrets export-key`. Reads stdin, or asks for it',
	},
	args: {
		force: {
			type: 'boolean',
			description: 'Replace a different key, or keep values that the key cannot decrypt',
		},
	},
	async run({ args }) {
		const { backend, from } = secretsBackend();
		if (backend === 'off') {
			throw new RigError(
				'Secrets encryption is off.',
				`Run \`${RIG} secrets use <backend>\` first.`,
			);
		}
		const input = process.stdin.isTTY
			? isInteractive()
				? await password('Secrets key (64 hex characters)')
				: ''
			: readFileSync(0, 'utf8');
		const hex = input.trim().toLowerCase();
		if (!KEY_PATTERN.test(hex)) throw new RigError('The key must have 64 hex characters.');
		const key = Buffer.from(hex, 'hex');

		let existing: Buffer | undefined;
		try {
			existing = readKey(backend);
		} catch (error) {
			// With --force, a damaged key in the store must not block the restore.
			if (!args.force || !keyStoreAvailable(backend)) throw error;
			ui.warn(
				`Replacing a key that rig cannot read: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		if (existing?.equals(key)) {
			ui.success(`The ${keyStoreLocation(backend)} already has this key.`);
			return;
		}
		if (existing && !args.force) {
			throw new RigError(
				`The ${keyStoreLocation(backend)} already has a different key.`,
				`Export it first with \`${RIG} secrets export-key\`. Then add --force to replace it.`,
			);
		}
		const unreadable = envFiles()
			.map((file) => envFileStatus(file, key))
			.reduce((sum, status) => sum + status.unreadable, 0);
		if (unreadable > 0 && !args.force) {
			throw new RigError(
				`This key cannot decrypt ${plural(unreadable, 'value')}.`,
				`Check the key. Add --force to save it anyway. Run \`${RIG} secrets status\` to see the files.`,
			);
		}
		if (from === 'detected') saveSecretsBackend(backend);
		storeKey(backend, key);
		ui.success(`Saved the key in the ${keyStoreLocation(backend)}.`);
	},
});

export const secretsCommand = defineCommand({
	meta: { name: 'secrets', description: 'Manage the encryption of secrets in env files' },
	subCommands: {
		status: statusCommand,
		encrypt: encryptCommand,
		use: useCommand,
		'export-key': exportKeyCommand,
		'import-key': importKeyCommand,
	},
});
