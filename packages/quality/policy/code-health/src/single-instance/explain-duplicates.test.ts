import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { analyze, collectCopies } from './collect-copies.js';
import {
	attributeCopy,
	describeOrigin,
	explainDuplicates,
	formatCopyLines,
	formatCuratedReport,
	formatRemediation,
	formatStepSummary,
} from './explain-duplicates.js';

// Planted on disk: nesting is how npm records "this package forced this copy", so attribution is
// exercised against a real tree rather than a hand-built path string.
let ROOT: string;

const WORKSPACE = new Set(['@n8n/api-types', 'n8n']);
const NO_EXEMPTIONS = new Set<string>();

function pkg(relDir: string, manifest: Record<string, unknown>): void {
	const dir = join(ROOT, relDir);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest));
}

beforeAll(() => {
	ROOT = mkdtempSync(join(tmpdir(), 'explain-duplicates-'));
	// hoisted copy npm picked for the root project
	pkg('node_modules/zod', { name: 'zod', version: '4.4.3' });
	// a workspace package of ours pinning its own copy -> fix is a manifest change in this repo
	pkg('node_modules/@n8n/api-types', {
		name: '@n8n/api-types',
		version: '1.0.0',
		dependencies: { zod: '^3.25.0' },
	});
	pkg('node_modules/@n8n/api-types/node_modules/zod', { name: 'zod', version: '3.25.76' });
	// a third-party package pinning an incompatible range -> fix is upstream / the catalog
	pkg('node_modules/third-party', {
		name: 'third-party',
		version: '2.0.0',
		peerDependencies: { zod: '~3.20.0' },
	});
	pkg('node_modules/third-party/node_modules/zod', { name: 'zod', version: '3.20.1' });
	// nested under a package that does not declare the lib itself
	pkg('node_modules/silent', { name: 'silent', version: '1.0.0' });
	pkg('node_modules/silent/node_modules/zod', { name: 'zod', version: '3.1.0' });
});

afterAll(() => rmSync(ROOT, { recursive: true, force: true }));

const attribute = (relPath: string, version: string, lib = 'zod') =>
	attributeCopy(ROOT, lib, { realPath: join(ROOT, relPath), version }, WORKSPACE);

const explainAll = () => explainDuplicates(ROOT, analyze(collectCopies(ROOT)).failures, WORKSPACE);

describe('attributeCopy', () => {
	it('marks a top-level copy as hoisted', () => {
		const copy = attribute('node_modules/zod', '4.4.3');
		expect(copy.requiredBy).toBeNull();
		expect(describeOrigin(copy)).toBe('hoisted at the top level');
	});

	it('attributes a nested copy to the package that declares the range', () => {
		const copy = attribute('node_modules/third-party/node_modules/zod', '3.20.1');
		expect(copy).toMatchObject({ requiredBy: 'third-party', range: '~3.20.0', isWorkspace: false });
		expect(describeOrigin(copy)).toBe('required by third-party (peerDependencies "~3.20.0")');
	});

	// Which section declared it decides the fix, so attribution has to keep it.
	it('records the section the range came from', () => {
		expect(attribute('node_modules/@n8n/api-types/node_modules/zod', '3.25.76').section).toBe(
			'dependencies',
		);
		expect(attribute('node_modules/third-party/node_modules/zod', '3.20.1').section).toBe(
			'peerDependencies',
		);
		expect(attribute('node_modules/silent/node_modules/zod', '3.1.0').section).toBeNull();
	});

	it('flags a requirer that is one of our own packages', () => {
		const copy = attribute('node_modules/@n8n/api-types/node_modules/zod', '3.25.76');
		expect(copy).toMatchObject({ requiredBy: '@n8n/api-types', isWorkspace: true });
		expect(describeOrigin(copy)).toContain('[workspace package]');
	});

	it('falls back to the enclosing package when no ancestor declares the lib', () => {
		const copy = attribute('node_modules/silent/node_modules/zod', '3.1.0');
		expect(copy).toMatchObject({ requiredBy: 'silent', range: null });
		expect(describeOrigin(copy)).toBe('nested under silent (no direct declaration)');
	});

	// A store key is not a requirer, so naming it as one would be confidently wrong.
	it('reports a copy inside a pnpm virtual store as such, not as hoisted', () => {
		// Its own root: a store entry in the shared tree would count as another copy of zod.
		const storeRoot = join(ROOT, 'store');
		const relPath = 'node_modules/.pnpm/zod@3.25.76/node_modules/zod';
		pkg(join('store', relPath), { name: 'zod', version: '3.25.76' });

		const copy = attributeCopy(
			storeRoot,
			'zod',
			{ realPath: join(storeRoot, relPath), version: '3.25.76' },
			WORKSPACE,
		);

		expect(copy.requiredBy).toBeNull();
		expect(describeOrigin(copy)).toBe(
			'in the pnpm virtual store (requirer not derivable from the path)',
		);
	});

	// devDependencies are not installed for a consumer, so they cannot nest a copy — a dev-only
	// declaration must not be reported as the requirer.
	it('ignores a declaration that cannot nest a copy', () => {
		const devRoot = join(ROOT, 'dev-only');
		pkg('dev-only/node_modules/zod', { name: 'zod', version: '4.4.3' });
		pkg('dev-only/node_modules/tool', {
			name: 'tool',
			version: '1.0.0',
			devDependencies: { zod: '^3.0.0' },
		});
		pkg('dev-only/node_modules/tool/node_modules/zod', { name: 'zod', version: '3.25.76' });

		const copy = attributeCopy(
			devRoot,
			'zod',
			{ realPath: join(devRoot, 'node_modules/tool/node_modules/zod'), version: '3.25.76' },
			WORKSPACE,
		);

		expect(copy).toMatchObject({ requiredBy: 'tool', range: null });
	});
});

describe('explainDuplicates', () => {
	it('attributes every copy of a real collected duplicate', () => {
		const [zod] = explainAll();

		expect(zod.name).toBe('zod');
		expect(zod.copies.map((c) => c.requiredBy)).toEqual([
			null,
			'@n8n/api-types',
			'silent',
			'third-party',
		]);
	});

	it('prints the version, the origin and the path of each copy', () => {
		const output = formatCopyLines(explainAll()[0].copies).join('\n');

		expect(output).toContain('v3.20.1');
		expect(output).toContain('required by third-party (peerDependencies "~3.20.0")');
		expect(output).toContain('node_modules/third-party/node_modules/zod');
	});
});

describe('formatCuratedReport', () => {
	it('reports every curated library, and the caller renders the failing copies', () => {
		const found = collectCopies(ROOT);
		const { duplicates } = analyze(found);
		const output = formatCuratedReport(found, duplicates, () => ['      <detail>']).join('\n');

		expect(output).toContain('zod: FAIL — 4 copies, expected 1:');
		expect(output).toContain('<detail>');
		// A curated lib absent from the closure is still listed, so a run always states the verdict
		// for the full enforced set rather than only for what happened to be installed.
		expect(output).toContain('reflect-metadata: not present');
	});

	// Which copies an entry covers is what tells you whether it is still accurate, so an allowlisted
	// duplicate lists them too rather than only its reason.
	it('prints the copies of an allowlisted duplicate and why it is tolerated', () => {
		const found = collectCopies(ROOT);
		const { duplicates } = analyze(found, { allowlist: { zod: 'tolerated for <reason>' } });
		const output = formatCuratedReport(found, duplicates, () => ['      <copy>']).join('\n');

		expect(output).toContain('zod: ALLOWED DUP');
		expect(output).toContain('<copy>');
		expect(output).toContain('allowlisted: tolerated for <reason>');
	});
});

describe('formatRemediation', () => {
	it('tells our own packages to move the library to peerDependencies', () => {
		const output = formatRemediation(explainAll(), { exemptPackages: NO_EXEMPTIONS }).join('\n');
		expect(output).toContain('- zod <- @n8n/api-types (dependencies "^3.25.0")');
		expect(output).toContain('"peerDependencies"');
	});

	// The `single-instance-libs` rule exempts host packages, so telling their owner to move a
	// curated lib to peerDependencies would send them into a change that rule rejects.
	it('does not propose a peer move for a package the peer rule exempts', () => {
		pkg('host/node_modules/zod', { name: 'zod', version: '4.4.3' });
		pkg('host/node_modules/n8n', {
			name: 'n8n',
			version: '1.0.0',
			dependencies: { zod: '^3.0.0' },
		});
		pkg('host/node_modules/n8n/node_modules/zod', { name: 'zod', version: '3.25.76' });
		const hostRoot = join(ROOT, 'host');

		const explained = explainDuplicates(
			hostRoot,
			analyze(collectCopies(hostRoot)).failures,
			WORKSPACE,
		);
		const output = formatRemediation(explained, { exemptPackages: new Set(['n8n']) }).join('\n');

		expect(output).toContain('legitimately own a copy');
		expect(output).toContain('- zod <- n8n (dependencies "^3.0.0")');
		expect(output).not.toContain('"peerDependencies"');
	});

	// The compliant shape: @n8n/api-types, n8n-core and n8n-workflow all declare zod only as a peer,
	// so they are the likeliest requirers in the real closure — and there is nothing for them to move.
	it('does not propose a peer move for a package that already declares the peer', () => {
		const peerRoot = join(ROOT, 'peer');
		pkg('peer/node_modules/zod', { name: 'zod', version: '4.4.3' });
		pkg('peer/node_modules/@n8n/api-types', {
			name: '@n8n/api-types',
			version: '1.0.0',
			peerDependencies: { zod: '3.25.76' },
		});
		pkg('peer/node_modules/@n8n/api-types/node_modules/zod', { name: 'zod', version: '3.25.76' });

		const explained = explainDuplicates(
			peerRoot,
			analyze(collectCopies(peerRoot)).failures,
			WORKSPACE,
		);
		const output = formatRemediation(explained, { exemptPackages: NO_EXEMPTIONS }).join('\n');

		expect(output).toContain('already declare the library as a peer');
		expect(output).toContain('- zod <- @n8n/api-types (peerDependencies "3.25.76")');
		expect(output).not.toContain('Move it to "peerDependencies"');
	});

	// reflect-metadata is curated but pin-only, so the peer rule does not cover it either.
	it('does not propose a peer move for a curated library outside the peer rule', () => {
		const copy = attribute(
			'node_modules/@n8n/api-types/node_modules/zod',
			'3.25.76',
			'reflect-metadata',
		);
		const explained = [
			{
				name: 'reflect-metadata',
				copies: [{ ...copy, requiredBy: '@n8n/api-types', range: '^0.2.0', isWorkspace: true }],
			},
		];

		const output = formatRemediation(explained, { exemptPackages: NO_EXEMPTIONS }).join('\n');
		expect(output).toContain('legitimately own a copy');
		expect(output).not.toContain('"peerDependencies"');
	});

	it('names the third-party requirer and its range', () => {
		expect(formatRemediation(explainAll(), { exemptPackages: NO_EXEMPTIONS }).join('\n')).toContain(
			'- zod <- third-party (peerDependencies "~3.20.0")',
		);
	});

	it('numbers the steps consecutively whichever ones apply', () => {
		const output = formatRemediation(explainAll(), {
			exemptPackages: new Set(['@n8n/api-types']),
		}).join('\n');
		expect(output).toContain('  1. Our own packages that legitimately own a copy');
		expect(output).toContain('  2. Third-party packages');
		expect(output).toContain('  3. Copies nested under a package that does not declare');
		expect(output).toContain('  4. If the split cannot be removed yet');
	});

	it('points at the allowlist as the last resort', () => {
		expect(formatRemediation(explainAll(), { exemptPackages: NO_EXEMPTIONS }).join('\n')).toContain(
			'EXPECTED_DUPLICATES',
		);
	});

	it('mentions the kept install tree only when one is kept', () => {
		const options = { exemptPackages: NO_EXEMPTIONS };
		expect(
			formatRemediation(explainAll(), { ...options, scratch: '/tmp/kept' }).join('\n'),
		).toContain('npm ls --all --prefix /tmp/kept zod');
		expect(formatRemediation(explainAll(), options).join('\n')).not.toContain('--prefix');
	});
});

describe('formatStepSummary', () => {
	it('renders a table row per copy and marks an advisory run as such', () => {
		const summary = formatStepSummary(explainAll(), {
			reportOnly: true,
			exemptPackages: NO_EXEMPTIONS,
		});

		expect(summary).toContain('(advisory)');
		expect(summary).toContain('| Library | Version | Pulled in by | Path |');
		expect(summary.match(/^\| zod \|/gm)).toHaveLength(4);
	});

	it('does not mark a blocking run as advisory, and carries the kept tree', () => {
		const summary = formatStepSummary(explainAll(), {
			reportOnly: false,
			exemptPackages: NO_EXEMPTIONS,
			scratch: '/tmp/kept',
		});

		expect(summary).not.toContain('advisory');
		expect(summary).toContain('npm ls --all --prefix /tmp/kept');
	});

	// A `|` ends a table cell even inside a code span, and `||` ranges are common on curated libs.
	it('escapes dependency-controlled text so a range cannot break the table', () => {
		const summary = formatStepSummary(
			[
				{
					name: 'zod',
					copies: [
						{
							version: '3.20.1',
							path: 'node_modules/pkg/node_modules/zod',
							requiredBy: 'pkg',
							range: '^3.22.0 || ^4.0.0',
							section: 'dependencies' as const,
							isWorkspace: false,
							inPnpmStore: false,
						},
					],
				},
			],
			{ reportOnly: true, exemptPackages: NO_EXEMPTIONS },
		);
		const row = summary.split('\n').find((line) => line.startsWith('| zod |'));

		expect(row).toContain('\\|\\|');
		expect(row?.split(/(?<!\\)\|/)).toHaveLength(6); // 4 cells + the empty ends
	});
});
