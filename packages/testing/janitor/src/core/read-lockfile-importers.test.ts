import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getGitRoot: vi.fn<() => string>() }));

vi.mock('../utils/git-operations.js', () => ({ getGitRoot: mocks.getGitRoot }));

import { readLockfileImporters, readRuntimeClosure } from './read-lockfile-importers.js';

describe('lockfile readers', () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'janitor-lockfile-'));
		mocks.getGitRoot.mockReturnValue(dir);
	});

	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it('uses the project document from a pnpm 12 lockfile', () => {
		writeFileSync(
			join(dir, 'pnpm-lock.yaml'),
			`---
lockfileVersion: '9.0'

importers:
  .:
    packageManagerDependencies:
      pnpm:
        specifier: 12.3.4
        version: 12.3.4

---
lockfileVersion: '9.0'

importers:
  packages/cli:
    dependencies:
      external:
        specifier: 1.0.0
        version: 1.0.0
  packages/unused:
    devDependencies:
      test-only:
        specifier: 1.0.0
        version: 1.0.0

snapshots:
  external@1.0.0:
    dependencies:
      transitive: 2.0.0
  transitive@2.0.0: {}
`,
		);

		expect(readLockfileImporters()).toEqual({
			'packages/cli': ['external'],
			'packages/unused': [],
		});
		expect(readRuntimeClosure()).toEqual(new Set(['external', 'transitive']));
	});
});
