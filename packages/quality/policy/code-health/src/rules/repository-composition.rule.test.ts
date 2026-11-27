import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { RepositoryCompositionRule } from './repository-composition.rule.js';

describe('RepositoryCompositionRule', () => {
	let rootDir: string;

	beforeEach(() => {
		rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-repository-composition-'));
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
		const violations = await new RepositoryCompositionRule().analyze(context);
		return violations.map(
			(violation) =>
				`${path.relative(rootDir, violation.file)}:${violation.line} ${violation.message}`,
		);
	}

	it('accepts a service that holds a file-private table', async () => {
		write(
			'packages/example/src/x.repository.ts',
			[
				"import { BaseRepository } from '@n8n/db';",
				"import { Service } from '@n8n/di';",
				'class XTable extends BaseRepository<X> {}',
				'@Service()',
				'export class XRepository {',
				'\tconstructor(private readonly table: XTable) {}',
				'}',
			].join('\n'),
		);

		expect(await analyze()).toEqual([]);
	});

	it('rejects an exported repository that extends BaseRepository or Repository', async () => {
		write(
			'packages/example/src/a.repository.ts',
			"import { BaseRepository } from '@n8n/db';\nexport class ARepository extends BaseRepository<A> {}\n",
		);
		write(
			'packages/example/src/b.repository.ts',
			"import { Repository as OrmRepository } from '@n8n/typeorm';\nexport class BRepository extends OrmRepository<B> {}\n",
		);
		write(
			'packages/example/src/c.repository.ts',
			"import * as TypeOrm from '@n8n/typeorm';\nexport class CRepository extends TypeOrm.Repository<C> {}\n",
		);

		expect((await analyze()).sort()).toEqual([
			expect.stringContaining(
				'a.repository.ts:2 Repository `ARepository` extends `BaseRepository`',
			),
			expect.stringContaining('b.repository.ts:2 Repository `BRepository` extends `OrmRepository`'),
			expect.stringContaining(
				'c.repository.ts:2 Repository `CRepository` extends `TypeOrm.Repository`',
			),
		]);
	});

	it('rejects a DI-registered table even when it is not exported', async () => {
		write(
			'packages/example/src/x.repository.ts',
			"import { BaseRepository } from '@n8n/db';\nimport { Service } from '@n8n/di';\n@Service()\nclass XRepository extends BaseRepository<X> {}\n",
		);

		expect(await analyze()).toEqual([
			expect.stringContaining('x.repository.ts:3 Repository `XRepository`'),
		]);
	});

	it('ignores other base classes, abstract bases and test files', async () => {
		write(
			'packages/example/src/x.service.ts',
			"import { BaseService } from './base';\nexport class XService extends BaseService {}\n",
		);
		write(
			'packages/example/src/base.repository.ts',
			"import { Repository } from '@n8n/typeorm';\nexport abstract class SharedRepository<T> extends Repository<T> {}\n",
		);
		write(
			'packages/example/src/x.repository.test.ts',
			"import { BaseRepository } from '@n8n/db';\nexport class XRepository extends BaseRepository<X> {}\n",
		);

		expect(await analyze()).toEqual([]);
	});

	it('checks @n8n/db, where most legacy repositories live', async () => {
		write('packages/db/package.json', JSON.stringify({ name: '@n8n/db' }));
		write(
			'packages/db/src/repositories/user.repository.ts',
			"import { Repository } from '@n8n/typeorm';\nexport class UserRepository extends Repository<User> {}\n",
		);

		expect(await analyze()).toEqual([
			expect.stringContaining('user.repository.ts:2 Repository `UserRepository`'),
		]);
	});
});
