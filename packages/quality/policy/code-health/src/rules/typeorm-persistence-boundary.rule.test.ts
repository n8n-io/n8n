import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { TypeormPersistenceBoundaryRule } from './typeorm-persistence-boundary.rule.js';

describe('TypeormPersistenceBoundaryRule', () => {
	let rootDir: string;
	let rule: TypeormPersistenceBoundaryRule;

	beforeEach(() => {
		rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-typeorm-boundary-'));
		rule = new TypeormPersistenceBoundaryRule();
	});

	afterEach(() => {
		fs.rmSync(rootDir, { recursive: true, force: true });
	});

	function write(relativePath: string, content: string): void {
		const fullPath = path.join(rootDir, relativePath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	}

	function writePackage(name = '@n8n/example'): void {
		write(
			'packages/example/package.json',
			JSON.stringify({
				name,
				dependencies: { '@n8n/db': 'workspace:*', '@n8n/typeorm': 'workspace:*' },
			}),
		);
	}

	async function analyze(): Promise<string[]> {
		const context: CodeHealthContext = { rootDir };
		const violations = await rule.analyze(context);
		return violations.map(
			(violation) =>
				`${path.relative(rootDir, violation.file)}:${violation.line} ${violation.message}`,
		);
	}

	it('rejects direct TypeORM imports from business logic in any folder', async () => {
		writePackage();
		write(
			'packages/example/src/database/workflow.service.ts',
			"import { In } from '@n8n/typeorm';\nexport class WorkflowService {}\n",
		);

		expect(await analyze()).toEqual([
			expect.stringContaining('workflow.service.ts:1 Business logic imports TypeORM directly.'),
		]);
	});

	it('accepts named and namespace entity declarations in different layouts', async () => {
		writePackage();
		write(
			'packages/example/src/audit/model.ts',
			"import { Entity as OrmEntity } from '@n8n/typeorm';\n@OrmEntity()\nexport class Audit {}\n",
		);
		write(
			'packages/example/src/domain/record.ts',
			"import * as TypeOrm from '@n8n/typeorm';\n@TypeOrm.Entity()\nexport class Record {}\n",
		);

		expect(await analyze()).toEqual([]);
	});

	it('accepts TypeORM Repository and n8n BaseRepository subclasses', async () => {
		writePackage();
		write(
			'packages/example/src/audit/store.ts',
			"import { Repository as OrmRepository } from '@n8n/typeorm';\nexport class AuditStore extends OrmRepository<Audit> {}\n",
		);
		write(
			'packages/example/src/domain/store.ts',
			"import * as TypeOrm from '@n8n/typeorm';\nexport class DomainStore extends TypeOrm.Repository<Audit> {}\n",
		);
		write(
			'packages/example/src/records/store.ts',
			"import { BaseRepository } from '@n8n/db';\nimport { In } from '@n8n/typeorm';\nexport class RecordStore extends BaseRepository<Record> {}\n",
		);

		expect(await analyze()).toEqual([]);
	});

	it('does not infer persistence from a filename or imported repository', async () => {
		writePackage();
		write(
			'packages/example/src/workflow.repository.ts',
			"import { In } from '@n8n/typeorm';\nimport { WorkflowRepository } from '@n8n/db';\nexport class WorkflowService {}\n",
		);

		expect(await analyze()).toHaveLength(1);
	});

	it('always rejects guarded TypeORM re-exports from @n8n/db', async () => {
		writePackage();
		write(
			'packages/example/src/audit/store.ts',
			"import { BaseRepository, In } from '@n8n/db';\nexport class AuditStore extends BaseRepository<Audit> {}\n",
		);

		expect(await analyze()).toEqual([
			expect.stringContaining('imports the TypeORM re-export `In` from @n8n/db'),
		]);
	});

	it('rejects guarded TypeORM re-exports accessed through an @n8n/db namespace', async () => {
		writePackage();
		write(
			'packages/example/src/workflow.service.ts',
			"import * as db from '@n8n/db';\nexport const ids = db.In(['1']);\n",
		);

		expect(await analyze()).toEqual([
			expect.stringContaining('accesses the TypeORM re-export `In` through the @n8n/db namespace'),
		]);
	});

	it('skips tests but scans nested production test and migration folders', async () => {
		writePackage();
		const typeormImport = "import { In } from '@n8n/typeorm';\n";
		write('packages/example/src/audit.test.ts', typeormImport);
		write('packages/example/src/__tests__/audit.ts', typeormImport);
		write('packages/example/src/domain/test/query.ts', typeormImport);
		write('packages/example/src/domain/migrations/query.ts', typeormImport);

		const violations = await analyze();
		expect(violations).toHaveLength(2);
		expect(
			violations.every((violation) => violation.includes('Business logic imports TypeORM')),
		).toBe(true);
	});

	it('supports explicit migration roots', async () => {
		writePackage();
		write(
			'packages/example/src/database/migrations/1-Init.ts',
			"import { QueryRunner } from '@n8n/typeorm';\n",
		);
		rule.configure({
			options: { allowedDirectories: ['packages/example/src/database/migrations'] },
		});

		expect(await analyze()).toEqual([]);
	});

	it('supports exact exceptions for composition-based adapters', async () => {
		writePackage();
		write(
			'packages/example/src/query-adapter.ts',
			"import { DataSource } from '@n8n/typeorm';\nexport class QueryAdapter {}\n",
		);
		rule.configure({
			options: { allowedFiles: ['packages/example/src/query-adapter.ts'] },
		});

		expect(await analyze()).toEqual([]);
	});

	it('does not scan the @n8n/db persistence package', async () => {
		writePackage('@n8n/db');
		write(
			'packages/example/src/service.ts',
			"import { In } from '@n8n/typeorm';\nexport class Service {}\n",
		);

		expect(await analyze()).toEqual([]);
	});

	it('does not scan the backend test utility package', async () => {
		writePackage('@n8n/backend-test-utils');
		write(
			'packages/example/src/test-db.ts',
			"import { In } from '@n8n/typeorm';\nexport class TestDb {}\n",
		);

		expect(await analyze()).toEqual([]);
	});
});
