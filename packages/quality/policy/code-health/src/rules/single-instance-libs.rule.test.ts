import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { SingleInstanceLibsRule } from './single-instance-libs.rule.js';

function writePackage(dir: string, relDir: string, pkg: Record<string, unknown>): void {
	const fullPath = path.join(dir, relDir, 'package.json');
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });
	fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2));
}

describe('SingleInstanceLibsRule', () => {
	let tmpDir: string;
	let rule: SingleInstanceLibsRule;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-test-'));
		rule = new SingleInstanceLibsRule();
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	const context = (): CodeHealthContext => ({ rootDir: tmpDir });

	it('flags a curated lib declared as a runtime dependency', async () => {
		writePackage(tmpDir, 'packages/@n8n/config', {
			name: '@n8n/config',
			dependencies: { zod: 'catalog:' },
		});
		const violations = await rule.analyze(context());
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('zod');
		expect(violations[0].message).toContain('must be a peerDependency');
	});

	it('flags a curated lib in optionalDependencies', async () => {
		writePackage(tmpDir, 'packages/@n8n/config', {
			name: '@n8n/config',
			optionalDependencies: { 'form-data': 'catalog:' },
		});
		const violations = await rule.analyze(context());
		expect(violations.map((v) => v.message).join()).toContain('form-data');
	});

	// `@n8n/config` is a non-host package not in REQUIRED_CURATED_PEERS, so these exercise the
	// catalog-shape check in isolation from the dropped-peer guard below.
	it('does not flag a curated lib declared as a catalog: peerDependency', async () => {
		writePackage(tmpDir, 'packages/@n8n/config', {
			name: '@n8n/config',
			peerDependencies: { zod: 'catalog:' },
			devDependencies: { zod: 'catalog:' },
		});
		expect(await rule.analyze(context())).toHaveLength(0);
	});

	it('flags a curated peerDependency that is not catalog:', async () => {
		writePackage(tmpDir, 'packages/@n8n/config', {
			name: '@n8n/config',
			peerDependencies: { zod: '^3.25.0' },
		});
		const violations = await rule.analyze(context());
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('must use "catalog:"');
	});

	// The catalog-shape check keys off the whole curated list, not just zod — a scoped curated
	// lib and even the pin-only reflect-metadata must be pinned when declared as a peer.
	it.each(['@langchain/core', 'reflect-metadata'])(
		'flags a non-zod curated peerDependency (%s) that is not catalog:',
		async (lib) => {
			writePackage(tmpDir, 'packages/@n8n/config', {
				name: '@n8n/config',
				peerDependencies: { [lib]: '^1.0.0' },
			});
			const violations = await rule.analyze(context());
			expect(violations).toHaveLength(1);
			expect(violations[0].message).toContain(lib);
			expect(violations[0].message).toContain('must use "catalog:"');
		},
	);

	// Dropped-peer guard: `@n8n/api-types` is in REQUIRED_CURATED_PEERS.zod.
	it('flags a required package that dropped its curated peerDependency', async () => {
		writePackage(tmpDir, 'packages/@n8n/api-types', {
			name: '@n8n/api-types',
			dependencies: { lodash: '^4.0.0' },
		});
		const violations = await rule.analyze(context());
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('zod');
		expect(violations[0].message).toContain('required single-instance peer');
	});

	it('does not flag a required package that still declares its curated peer', async () => {
		writePackage(tmpDir, 'packages/@n8n/api-types', {
			name: '@n8n/api-types',
			peerDependencies: { zod: 'catalog:' },
		});
		expect(await rule.analyze(context())).toHaveLength(0);
	});

	it('exempts host packages', async () => {
		writePackage(tmpDir, 'packages/cli', { name: 'n8n', dependencies: { zod: 'catalog:' } });
		expect(await rule.analyze(context())).toHaveLength(0);
	});

	it('exempts frontend packages', async () => {
		writePackage(tmpDir, 'packages/frontend/editor-ui', {
			name: 'n8n-editor-ui',
			dependencies: { zod: 'catalog:' },
		});
		expect(await rule.analyze(context())).toHaveLength(0);
	});

	it('exempts pin-only libs (reflect-metadata)', async () => {
		writePackage(tmpDir, 'packages/@n8n/config', {
			name: '@n8n/config',
			dependencies: { 'reflect-metadata': 'catalog:' },
		});
		expect(await rule.analyze(context())).toHaveLength(0);
	});

	it('ignores curated libs in devDependencies (catalog-violations covers those)', async () => {
		writePackage(tmpDir, 'packages/@n8n/config', {
			name: '@n8n/config',
			devDependencies: { zod: 'catalog:' },
		});
		expect(await rule.analyze(context())).toHaveLength(0);
	});
});
