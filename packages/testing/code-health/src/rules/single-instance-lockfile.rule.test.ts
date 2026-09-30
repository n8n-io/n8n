import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { SingleInstanceLockfileRule } from './single-instance-lockfile.rule.js';

/** Peer contexts of `@langchain/core`, forked by which `@smithy/signature-v4` `openai` resolved. */
function coreKey(signatureV4: string): string {
	return `'@langchain/core@1.2.8(openai@6.46.0(@smithy/signature-v4@${signatureV4}))(ws@8.21.1)'`;
}

describe('SingleInstanceLockfileRule', () => {
	let tmpDir: string;
	let rule: SingleInstanceLockfileRule;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-test-'));
		rule = new SingleInstanceLockfileRule();
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	const context = (): CodeHealthContext => ({ rootDir: tmpDir });

	function writeLock(body: string): void {
		fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), `lockfileVersion: '9.0'\n\n${body}`);
	}

	function writePackage(relDir: string, pkg: Record<string, unknown>): void {
		const fullPath = path.join(tmpDir, relDir, 'package.json');
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2));
	}

	/** The real defect: one workspace pin fails a peer range and forks the graph. */
	function writeSplitFixture(): void {
		writePackage('packages/nodes-base', {
			name: 'n8n-nodes-base',
			dependencies: { '@langchain/core': 'catalog:', '@smithy/signature-v4': '5.3.5' },
		});
		writePackage('packages/@n8n/nodes-langchain', {
			name: '@n8n/n8n-nodes-langchain',
			dependencies: { '@langchain/core': 'catalog:' },
		});
		writeLock(`importers:

  packages/nodes-base:
    dependencies:
      '@langchain/core':
        specifier: 'catalog:'
        version: 1.2.8(openai@6.46.0(@smithy/signature-v4@5.3.5))(ws@8.21.1)
      '@smithy/signature-v4':
        specifier: 5.3.5
        version: 5.3.5
  packages/@n8n/nodes-langchain:
    dependencies:
      '@langchain/core':
        specifier: 'catalog:'
        version: 1.2.8(openai@6.46.0(@smithy/signature-v4@5.7.2))(ws@8.21.1)

snapshots:

  ${coreKey('5.3.5')}: {}
  ${coreKey('5.7.2')}: {}
`);
	}

	it('passes when a curated lib has a single peer context', async () => {
		writePackage('packages/nodes-base', {
			name: 'n8n-nodes-base',
			dependencies: { '@langchain/core': 'catalog:' },
		});
		writeLock(`importers:

  packages/nodes-base:
    dependencies:
      '@langchain/core':
        specifier: 'catalog:'
        version: 1.2.8(openai@6.46.0(@smithy/signature-v4@5.7.2))(ws@8.21.1)

snapshots:

  ${coreKey('5.7.2')}: {}
`);
		expect(await rule.analyze(context())).toEqual([]);
	});

	it('flags a curated lib resolved into two peer contexts', async () => {
		writeSplitFixture();
		const violations = await rule.analyze(context());
		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('"@langchain/core" resolves to 2 peer contexts');
	});

	it('names the peer the contexts differ on', async () => {
		writeSplitFixture();
		const [violation] = await rule.analyze(context());
		expect(violation.message).toContain('@smithy/signature-v4 (5.3.5 vs 5.7.2)');
	});

	it('anchors on the hardcoded pin that forked the graph, not the catalog reference', async () => {
		writeSplitFixture();
		const [violation] = await rule.analyze(context());
		expect(violation.file).toBe(path.join(tmpDir, 'packages/nodes-base', 'package.json'));
		const line = fs.readFileSync(violation.file, 'utf8').split('\n')[violation.line - 1].trim();
		expect(line).toContain('@smithy/signature-v4');
	});

	it('reports which importers landed on each side of the split', async () => {
		writeSplitFixture();
		const [violation] = await rule.analyze(context());
		expect(violation.message).toContain('packages/nodes-base');
		expect(violation.message).toContain('packages/@n8n/nodes-langchain');
	});

	it('ignores a split in a library that is not single-instance-sensitive', async () => {
		writeLock(`snapshots:

  'lodash@4.17.21(a@1.0.0)': {}
  'lodash@4.17.21(a@2.0.0)': {}
`);
		expect(await rule.analyze(context())).toEqual([]);
	});

	it('reports nothing when the lockfile is absent', async () => {
		expect(await rule.analyze(context())).toEqual([]);
	});
});
