import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parsePnpmLock } from './pnpm-lock-parser.js';

const PROJECT_LOCKFILE = `lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      example:
        specifier: ^1.0.0
        version: 1.0.0

packages:
  example@1.0.0: {}
`;

describe('parsePnpmLock', () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'pnpm-lock-parser-'));
	});

	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	function writeLockfile(content: string) {
		writeFileSync(join(dir, 'pnpm-lock.yaml'), content);
	}

	it('parses a single-document lockfile', () => {
		writeLockfile(PROJECT_LOCKFILE);

		const result = parsePnpmLock(dir);

		expect(result.resolvedVersions.get('example')).toEqual(new Set(['1.0.0']));
		expect(result.requestedRanges.get('example')).toEqual(new Set(['^1.0.0']));
	});

	it('uses the project document from a pnpm 12 lockfile', () => {
		writeLockfile(`---
lockfileVersion: '9.0'

importers:
  .:
    packageManagerDependencies:
      pnpm:
        specifier: 12.3.4
        version: 12.3.4

packages:
  pnpm@12.3.4: {}

---
${PROJECT_LOCKFILE}`);

		const result = parsePnpmLock(dir);

		expect(result.resolvedVersions.get('example')).toEqual(new Set(['1.0.0']));
		expect(result.resolvedVersions.has('pnpm')).toBe(false);
		expect(result.requestedRanges.get('example')).toEqual(new Set(['^1.0.0']));
	});
});
