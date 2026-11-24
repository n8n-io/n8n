import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { repeatedFlag } from '../src/commands/common';
import { removeDataExceptDatabase } from '../src/commands/lifecycle';

describe('repeatedFlag', () => {
	it('should read every form of a repeated flag', () => {
		const rawArgs = ['main-1', '-e', 'A=1', '--e', 'B=2', '--e=C=3', '--', '-e', 'D=4'];
		expect(repeatedFlag(rawArgs, ['-e', '--e'])).toEqual(['A=1', 'B=2', 'C=3']);
	});
});

describe('removeDataExceptDatabase', () => {
	let root: string | undefined;

	afterEach(() => {
		if (root) rmSync(root, { recursive: true, force: true });
		root = undefined;
	});

	it('should keep the SQLite database and its key, and delete the other data', () => {
		root = mkdtempSync(join(tmpdir(), 'rig-reset-'));
		const n8nDir = join(root, 'main-1', '.n8n');
		mkdirSync(join(n8nDir, 'binaryData'), { recursive: true });
		for (const name of ['database.sqlite', 'database.sqlite-wal', 'config', 'n8nEventLog.log']) {
			writeFileSync(join(n8nDir, name), '');
		}
		writeFileSync(join(root, 'main-1', 'other'), '');
		mkdirSync(join(root, 'storage'), { recursive: true });

		removeDataExceptDatabase(root);

		expect(existsSync(join(n8nDir, 'database.sqlite'))).toBe(true);
		expect(existsSync(join(n8nDir, 'database.sqlite-wal'))).toBe(true);
		expect(existsSync(join(n8nDir, 'config'))).toBe(true);
		expect(existsSync(join(n8nDir, 'n8nEventLog.log'))).toBe(false);
		expect(existsSync(join(n8nDir, 'binaryData'))).toBe(false);
		expect(existsSync(join(root, 'main-1', 'other'))).toBe(false);
		expect(existsSync(join(root, 'storage'))).toBe(false);
	});
});
