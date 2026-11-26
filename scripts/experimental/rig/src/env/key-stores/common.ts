import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { configDir } from '../../config/paths';
import { RigError } from '../../errors';
import { RIG } from '../../meta';

/** A place that keeps the key that encrypts secrets.env files. */
export interface KeyStore {
	label: string;
	/** Where the key is, for messages. */
	location(): string;
	available(): boolean;
	/** The key as hex, or `undefined` when the store has no key. */
	read(): string | undefined;
	write(hex: string): void;
	/** How to make the store available. */
	setupHint: string;
}

/** The service name of the key in the OS keystores. */
export const SERVICE = 'n8n-rig';

/** One key for each config dir, so `RIG_CONFIG_DIR` setups stay apart. */
export function account(): string {
	const dir = configDir();
	if (/["\\\n]/.test(dir)) {
		throw new RigError(
			`The config dir ${dir} has characters that the OS keystore cannot take.`,
			`Run \`${RIG} secrets use file\`.`,
		);
	}
	return dir;
}

export function run(command: string, args: string[], input?: string) {
	return spawnSync(command, args, {
		encoding: 'utf8',
		input,
		stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
	});
}

/** The error text of a failed `run`. */
export function failure(result: ReturnType<typeof run>): string {
	return (result.error?.message ?? result.stderr).trim();
}

/** Writes a file with mode 0600 in one step, so a reader never sees half a file. */
export function writePrivate(file: string, text: string): void {
	mkdirSync(dirname(file), { recursive: true });
	const tmp = join(dirname(file), `.${basename(file)}.${process.pid}.tmp`);
	writeFileSync(tmp, text, { mode: 0o600 });
	chmodSync(tmp, 0o600);
	renameSync(tmp, file);
}
