import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { TransactionBoundaryRule } from './transaction-boundary.rule.js';

describe('TransactionBoundaryRule', () => {
	let rootDir: string;

	beforeEach(() => {
		rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-transaction-boundary-'));
		write(
			'packages/example/package.json',
			JSON.stringify({ name: '@n8n/example', dependencies: { '@n8n/db': 'workspace:*' } }),
		);
	});

	afterEach(() => {
		fs.rmSync(rootDir, { recursive: true, force: true });
	});

	function write(relativePath: string, content: string): void {
		const fullPath = path.join(rootDir, relativePath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	}

	async function analyze(): Promise<string[]> {
		const context: CodeHealthContext = { rootDir };
		const violations = await new TransactionBoundaryRule().analyze(context);
		return violations.map(
			(violation) =>
				`${path.relative(rootDir, violation.file)}:${violation.line} ${violation.message}`,
		);
	}

	it('rejects the entity manager, query builders and managerFor in business logic', async () => {
		write(
			'packages/example/src/x.service.ts',
			[
				'export class XService {',
				'\ta() { return this.repository.manager.transaction(async () => 1); }',
				"\tb() { return this.repository.createQueryBuilder('x').getMany(); }",
				'\tc(ctx: Ctx) { return this.repository.managerFor(ctx); }',
				'}',
			].join('\n'),
		);

		expect(await analyze()).toEqual([
			expect.stringContaining('x.service.ts:2 Business logic uses `this.repository.manager`.'),
			expect.stringContaining(
				'x.service.ts:3 Business logic uses `this.repository.createQueryBuilder`.',
			),
			expect.stringContaining('x.service.ts:4 Business logic uses `this.repository.managerFor`.'),
		]);
	});

	it('accepts TransactionRunner and a class that owns a manager field', async () => {
		write(
			'packages/example/src/x.service.ts',
			[
				'export class XService {',
				'\tmanager?: LicenseManager;',
				'\ta() { return this.manager?.toString(); }',
				'\tb() { return this.txRunner.run({}, async (ctx) => ctx); }',
				'}',
			].join('\n'),
		);

		expect(await analyze()).toEqual([]);
	});

	it('accepts persistence adapters and test files', async () => {
		write(
			'packages/example/src/x.repository.ts',
			[
				"import { BaseRepository } from '@n8n/db';",
				'class XTable extends BaseRepository<X> {}',
				'export class XRepository {',
				'\ta(ctx: Ctx) { return this.table.managerFor(ctx).createQueryBuilder(); }',
				'}',
			].join('\n'),
		);
		write(
			'packages/example/src/__tests__/x.service.test.ts',
			'export const a = (r: R) => r.manager.transaction(async () => 1);\n',
		);

		expect(await analyze()).toEqual([]);
	});
});
