import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SubpathPurityRule, type SubpathSpec } from './subpath-purity.rule.js';
import type { CodeHealthContext } from '../context.js';

describe('SubpathPurityRule', () => {
	let rootDir: string;
	const rule = new SubpathPurityRule();

	const write = (relativePath: string, source: string) => {
		const abs = path.join(rootDir, relativePath);
		mkdirSync(path.dirname(abs), { recursive: true });
		writeFileSync(abs, source, 'utf8');
	};

	const analyze = (subpath: SubpathSpec) => {
		rule.configure({ options: { subpaths: [subpath] } });
		const context: CodeHealthContext = { rootDir };
		return rule.analyze(context);
	};

	const SPEC: SubpathSpec = {
		name: 'pkg/transport',
		entry: 'src/transport.ts',
		forbidden: ['@n8n/di', '@n8n/config'],
		allowedExternals: ['undici', 'n8n-workflow'],
	};

	beforeEach(() => {
		rootDir = mkdtempSync(path.join(tmpdir(), 'subpath-purity-'));
	});

	afterEach(() => {
		rmSync(rootDir, { recursive: true, force: true });
	});

	it('passes when the runtime graph only reaches allowed externals', () => {
		write('src/transport.ts', "export { send } from './client';");
		write('src/client.ts', "import { request } from 'undici';\nexport const send = request;");

		expect(analyze(SPEC)).toEqual([]);
	});

	it('flags a forbidden package reached transitively through a value import', () => {
		write('src/transport.ts', "export { send } from './client';");
		write('src/client.ts', "import { Container } from '@n8n/di';\nexport const send = Container;");

		const violations = analyze(SPEC);

		expect(violations.map((v) => v.message)).toContainEqual(
			expect.stringContaining('forbidden runtime dependency "@n8n/di"'),
		);
		// Points at the file that actually imports it, not the entry.
		expect(violations[0].file).toBe(path.join(rootDir, 'src/client.ts'));
	});

	it('reports a forbidden package once, not also as an unexpected external', () => {
		write('src/transport.ts', "export { send } from './client';");
		write('src/client.ts', "import { Container } from '@n8n/di';\nexport const send = Container;");

		const messages = analyze(SPEC).map((v) => v.message);

		expect(messages).toEqual([expect.stringContaining('forbidden runtime dependency "@n8n/di"')]);
		expect(messages).not.toContainEqual(expect.stringContaining('unexpected runtime dependency'));
	});

	it('ignores a forbidden package imported only as a type', () => {
		write('src/transport.ts', "import type { Container } from '@n8n/di';\nexport const x = 1;");

		expect(analyze(SPEC)).toEqual([]);
	});

	it('catches a forbidden package behind a dynamic import', () => {
		write('src/transport.ts', "export async function load() { return import('@n8n/config'); }");

		const violations = analyze(SPEC);

		expect(violations.map((v) => v.message)).toContainEqual(
			expect.stringContaining('forbidden runtime dependency "@n8n/config"'),
		);
	});

	it('flags an external outside the allowlist even when not forbidden', () => {
		write('src/transport.ts', "import { z } from 'zod';\nexport const schema = z;");

		const violations = analyze(SPEC);

		expect(violations.map((v) => v.message)).toContainEqual(
			expect.stringContaining('unexpected runtime dependency "zod"'),
		);
	});

	it('reports a missing entry file instead of throwing', () => {
		const violations = analyze({ ...SPEC, entry: 'src/does-not-exist.ts' });

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('entry not found');
	});
});
