import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { StaleOverridesRule } from './stale-overrides.rule.js';

function createTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-test-'));
}

function writeFile(dir: string, relativePath: string, content: string): void {
	const fullPath = path.join(dir, relativePath);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });
	fs.writeFileSync(fullPath, content);
}

interface PackageOpts {
	overrides?: Record<string, string>;
}

function writeRootPackageJson(dir: string, opts: PackageOpts = {}): void {
	const body: Record<string, unknown> = { name: 'root', private: true };
	if (opts.overrides) body.pnpm = { overrides: opts.overrides };
	writeFile(dir, 'package.json', JSON.stringify(body, null, 2));
}

function writeWorkspace(dir: string, body: string): void {
	writeFile(dir, 'pnpm-workspace.yaml', body);
}

interface LockOpts {
	packages?: string[];
	requestedRanges?: Record<string, string>;
}

interface FakePnpmConsumer {
	name: string;
	declares: Record<string, string>;
}

function writePnpmConsumers(dir: string, consumers: FakePnpmConsumer[]): void {
	for (let i = 0; i < consumers.length; i++) {
		const c = consumers[i];
		const body = JSON.stringify({ name: c.name, dependencies: c.declares }, null, 2);
		const safeName = c.name.replace('/', '+').replace('@', '');
		writeFile(
			dir,
			`node_modules/.pnpm/${safeName}@1.0.0/node_modules/${c.name}/package.json`,
			body,
		);
	}
}

function writeLock(dir: string, opts: LockOpts): void {
	const lines: string[] = ["lockfileVersion: '9.0'", ''];

	if (opts.requestedRanges) {
		lines.push('importers:', '  .:', '    devDependencies:');
		for (const [name, specifier] of Object.entries(opts.requestedRanges)) {
			lines.push(`      ${quoteIfNeeded(name)}:`);
			lines.push(`        specifier: ${quoteIfNeeded(specifier)}`);
			lines.push(`        version: ${quoteIfNeeded(stripRange(specifier))}`);
		}
		lines.push('');
	}

	if (opts.packages && opts.packages.length > 0) {
		lines.push('packages:');
		for (const key of opts.packages) {
			lines.push(`  ${quoteIfNeeded(key)}:`);
			lines.push('    resolution: {integrity: sha512-x}');
		}
	}

	writeFile(dir, 'pnpm-lock.yaml', lines.join('\n'));
}

function quoteIfNeeded(value: string): string {
	if (/^[a-zA-Z0-9._-]+$/.test(value)) return value;
	return `'${value.replace(/'/g, "''")}'`;
}

function stripRange(specifier: string): string {
	return specifier.replace(/^[\^~>=<\s]+/, '');
}

describe('StaleOverridesRule', () => {
	let tmpDir: string;
	let rule: StaleOverridesRule;

	beforeEach(() => {
		tmpDir = createTempDir();
		rule = new StaleOverridesRule();
		rule.configure({
			options: { workspaceFile: 'pnpm-workspace.yaml', lockFile: 'pnpm-lock.yaml' },
		});
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function context(): CodeHealthContext {
		return { rootDir: tmpDir };
	}

	it('flags override that duplicates a catalog entry', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog:\n  lodash: 4.18.1\n');
		writeRootPackageJson(tmpDir, { overrides: { lodash: '4.18.1' } });
		writeLock(tmpDir, { packages: ['lodash@4.18.1'] });

		const violations = rule.analyze(context());

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('duplicates a catalog entry');
		expect(violations[0].message).toContain('"catalog:"');
	});

	it('flags override that duplicates a named catalog entry', () => {
		writeWorkspace(
			tmpDir,
			'packages:\n  - packages/*\ncatalogs:\n  sentry:\n    "@sentry/node": ^10.0.0\n',
		);
		writeRootPackageJson(tmpDir, { overrides: { '@sentry/node': '^10.0.0' } });
		writeLock(tmpDir, { packages: ['@sentry/node@10.0.0'] });

		const violations = rule.analyze(context());

		const catalogDup = violations.find((v) => v.message.includes('duplicates a catalog entry'));
		expect(catalogDup).toBeDefined();
		expect(catalogDup?.message).toContain('"catalog:sentry"');
	});

	it('does not flag overrides whose target is already a catalog reference', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog:\n  typescript: 5.9.2\n');
		writeRootPackageJson(tmpDir, { overrides: { typescript: 'catalog:' } });
		writeLock(tmpDir, { packages: ['typescript@5.9.2'] });

		const violations = rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('flags orphan override when package is absent from lockfile', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog: {}\n');
		writeRootPackageJson(tmpDir, { overrides: { 'gone-from-graph': '1.0.0' } });
		writeLock(tmpDir, { packages: ['something-else@1.0.0'] });

		const violations = rule.analyze(context());

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('not in the dependency graph');
		expect(violations[0].message).toContain('gone-from-graph');
	});

	it('does not flag empty-npm-package substitutions as orphans', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog: {}\n');
		writeRootPackageJson(tmpDir, {
			overrides: { sharp: 'npm:empty-npm-package@1.0.0' },
		});
		writeLock(tmpDir, { packages: ['something-else@1.0.0'] });

		const violations = rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('parses descendant override keys and flags when parent is missing', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog: {}\n');
		writeRootPackageJson(tmpDir, {
			overrides: { 'missing-parent>@sentry/node': '10.0.0' },
		});
		writeLock(tmpDir, { packages: ['@sentry/node@10.0.0'] });

		const violations = rule.analyze(context());

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('targets descendants of missing-parent');
	});

	it('does not flag descendant override when parent is present', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog: {}\n');
		writeRootPackageJson(tmpDir, {
			overrides: { '@n8n/typeorm>@sentry/node': '10.0.0' },
		});
		writeLock(tmpDir, {
			packages: ['@n8n/typeorm@0.3.20', '@sentry/node@10.0.0'],
		});

		const violations = rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('parses bracketed selector keys without flagging them as orphans', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog: {}\n');
		writeRootPackageJson(tmpDir, { overrides: { 'undici@5': '^6.24.0' } });
		writeLock(tmpDir, { packages: ['undici@6.24.0'] });

		const violations = rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('flags redundant pin when every declared range in node_modules matches the pinned version', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog: {}\n');
		writeRootPackageJson(tmpDir, { overrides: { chokidar: '4.0.3' } });
		writeLock(tmpDir, {
			packages: ['chokidar@4.0.3'],
			requestedRanges: { chokidar: '4.0.3' },
		});
		writePnpmConsumers(tmpDir, [{ name: 'consumer-a', declares: { chokidar: '4.0.3' } }]);

		const violations = rule.analyze(context());

		const redundant = violations.find((v) => v.message.includes('appears redundant'));
		expect(redundant).toBeDefined();
	});

	it('does not flag redundant pin when a transitive declares a wider range', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog: {}\n');
		writeRootPackageJson(tmpDir, { overrides: { zod: '3.25.67' } });
		writeLock(tmpDir, {
			packages: ['zod@3.25.67'],
			requestedRanges: { zod: '3.25.67' },
		});
		writePnpmConsumers(tmpDir, [
			{ name: 'ai-sdk-anthropic', declares: { zod: '^3.25.76 || ^4.1.8' } },
		]);

		const violations = rule.analyze(context());

		const redundant = violations.find((v) => v.message.includes('appears redundant'));
		expect(redundant).toBeUndefined();
	});

	it('does not flag redundant pin when node_modules is absent', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog: {}\n');
		writeRootPackageJson(tmpDir, { overrides: { chokidar: '4.0.3' } });
		writeLock(tmpDir, {
			packages: ['chokidar@4.0.3'],
			requestedRanges: { chokidar: '4.0.3' },
		});

		const violations = rule.analyze(context());

		const redundant = violations.find((v) => v.message.includes('appears redundant'));
		expect(redundant).toBeUndefined();
	});

	it('does not flag redundant pin when range uses semver operator', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog: {}\n');
		writeRootPackageJson(tmpDir, { overrides: { axios: '^1.16.0' } });
		writeLock(tmpDir, {
			packages: ['axios@1.16.0'],
			requestedRanges: { axios: '^1.16.0' },
		});
		writePnpmConsumers(tmpDir, [{ name: 'consumer-a', declares: { axios: '^1.16.0' } }]);

		const violations = rule.analyze(context());

		const redundant = violations.find((v) => v.message.includes('appears redundant'));
		expect(redundant).toBeUndefined();
	});

	it('does not flag redundant pin when multiple versions are resolved', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog: {}\n');
		writeRootPackageJson(tmpDir, { overrides: { 'shared-lib': '1.0.0' } });
		writeLock(tmpDir, {
			packages: ['shared-lib@1.0.0', 'shared-lib@2.0.0'],
			requestedRanges: { 'shared-lib': '1.0.0' },
		});
		writePnpmConsumers(tmpDir, [{ name: 'consumer-a', declares: { 'shared-lib': '1.0.0' } }]);

		const violations = rule.analyze(context());

		const redundant = violations.find((v) => v.message.includes('appears redundant'));
		expect(redundant).toBeUndefined();
	});

	it('returns no violations when there are no overrides', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog: {}\n');
		writeRootPackageJson(tmpDir, {});
		writeLock(tmpDir, { packages: ['lodash@4.18.1'] });

		const violations = rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('reports the line number of the override key in package.json', () => {
		writeWorkspace(tmpDir, 'packages:\n  - packages/*\ncatalog:\n  lodash: 4.18.1\n');
		writeRootPackageJson(tmpDir, { overrides: { lodash: '4.18.1' } });
		writeLock(tmpDir, { packages: ['lodash@4.18.1'] });

		const violations = rule.analyze(context());

		expect(violations[0].line).toBeGreaterThan(1);
	});
});
