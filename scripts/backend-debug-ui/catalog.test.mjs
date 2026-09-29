import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { scanCatalog, stripComments } from './catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function write(root, rel, source) {
	const file = path.join(root, rel);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, source);
}

function fixture() {
	const root = mkdtempSync(path.join(tmpdir(), 'backend-bench-'));
	write(
		root,
		'packages/cli/src/public-api/v1/controllers/tags.public.controller.ts',
		`
import { TagService } from '@/services/tag.service';
import type { TagEntity } from '@n8n/db';

const toTagPublicDto = (tag: TagEntity) => ({ id: tag.id, name: tag.name });

@PublicApiController('/tags')
export class TagsPublicController {
	constructor(private readonly tagService: TagService) {}

	@Get('/')
	@ApiKeyScope('tag:list')
	@ApiSummary('Retrieve all tags')
	async getTags() {
		return [];
	}

	@Post('/')
	@ApiKeyScope({ anyOf: ['tag:create', 'tag:update'] })
	async createTag() {
		return toTagPublicDto({ id: '1', name: 'a' });
	}

	// @Delete('/hidden')
	// async hidden() {}
}
`,
	);
	write(
		root,
		'packages/cli/src/controllers/tags.controller.ts',
		`
import { TagService } from '@/services/tag.service';

@RestController('/tags')
export class TagsController {
	constructor(private readonly tagService: TagService) {}

	@Get('/')
	@GlobalScope('tag:list')
	async getAll() {
		return [];
	}

	@Patch('/:id')
	@GlobalScope('tag:update')
	async updateTag() {
		return true;
	}
}
`,
	);
	write(
		root,
		'packages/cli/src/controllers/dev.controller.ts',
		`
@RestController('/dev')
export class DevController {
	/**
	 * @Get('/ignored')
	 * async ignored() {}
	 */
	@Post('/reload', { skipAuth: true, ipRateLimit: { limit: 100, windowMs: 60_000 } })
	async reload() {
		return { reloaded: true };
	}
}
`,
	);
	write(
		root,
		'packages/cli/src/services/tag.service.ts',
		`
import type { TagEntity } from '@n8n/db';
import { TagRepository } from '@n8n/db';

export class TagService {
	constructor(private tagRepository: TagRepository) {}

	toEntity(attrs: { name: string }) {
		return attrs;
	}

	async getAll() {
		return [] as TagEntity[];
	}

	if (false) {
		return 1;
	}
}
`,
	);
	write(
		root,
		'packages/cli/src/modules/favorites/favorites.service.ts',
		`
export class FavoritesService {
	async list() {
		return [];
	}
}
`,
	);
	write(
		root,
		'packages/@n8n/db/src/entities/tag-entity.ts',
		`
@Entity()
export class TagEntity extends WithTimestampsAndStringId {
	@Column({ length: 24 })
	name: string;
}
`,
	);
	write(
		root,
		'packages/cli/src/modules/favorites/database/entities/user-favorite.entity.ts',
		`
@Entity('user_favorites')
export class UserFavorite {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: String })
	userId: string;
}
`,
	);
	write(
		root,
		'packages/@n8n/db/src/repositories/tag.repository.ts',
		`
import { TagEntity } from '../entities';

export class TagRepository extends BaseRepository<TagEntity> {
	async findMany() {
		return [];
	}
}
`,
	);
	return root;
}

describe('scanCatalog', () => {
	it('strips comments without dropping newlines', () => {
		const stripped = stripComments('a\n// @Get(\"/hidden\")\nb /* @Post(\"/x\") */ c');
		assert.equal(stripped.includes('@Get'), false);
		assert.equal(stripped.includes('@Post'), false);
		assert.equal(stripped.split('\n').length, 3);
	});

	it('maps routes, services, and entities in a fixture checkout', () => {
		const catalog = scanCatalog(fixture());
		const list = catalog.routes.find((route) => route.id === 'public:GET:/api/v1/tags:TagsPublicController');
		assert.ok(list);
		assert.equal(list.scope, 'tag:list');
		assert.equal(list.summary, 'Retrieve all tags');
		assert.equal(list.domain, 'public-api');
		assert.deepEqual(list.services, ['TagService']);
		assert.ok(list.entities.includes('TagEntity'));
		assert.ok(list.repositories.includes('TagRepository'));
		assert.ok(list.mappers.some((mapper) => mapper.name === 'toTagPublicDto'));

		const create = catalog.routes.find((route) => route.method === 'POST' && route.layer === 'public');
		assert.equal(create.scope, 'any of tag:create, tag:update');
		assert.equal(
			catalog.routes.some((route) => route.fullPath.includes('hidden')),
			false,
		);

		const rest = catalog.routes.find((route) => route.fullPath === '/rest/tags' && route.method === 'GET');
		assert.equal(rest.scope, 'tag:list');
		assert.equal(rest.domain, 'cli');
		const update = catalog.routes.find((route) => route.fullPath === '/rest/tags/:id');
		assert.equal(update.method, 'PATCH');

		const reload = catalog.routes.find((route) => route.fullPath === '/rest/dev/reload');
		assert.equal(reload.open, true);
		assert.equal(reload.handler, 'reload');

		const tag = catalog.entities.find((entity) => entity.name === 'TagEntity');
		assert.equal(tag.tableExplicit, false);
		assert.equal(tag.table, 'TagEntity');
		assert.ok(tag.columns.some((column) => column.name === 'id' && column.inherited));
		assert.ok(tag.columns.some((column) => column.name === 'name' && column.decorator === 'Column'));

		const favorite = catalog.entities.find((entity) => entity.name === 'UserFavorite');
		assert.equal(favorite.table, 'user_favorites');
		assert.equal(favorite.domain, 'favorites');

		const service = catalog.domains.find((domain) => domain.id === 'cli').services.find((item) => item.name === 'TagService');
		assert.deepEqual(service.methods, ['toEntity', 'getAll']);
		assert.ok(service.entities.includes('TagEntity'));
		assert.ok(catalog.domains.some((domain) => domain.id === 'favorites'));
		assert.equal(catalog.warnings.length, 0);
	});

	it('reads the CLI, public API, and database in this checkout', { timeout: 30_000 }, () => {
		const catalog = scanCatalog(repoRoot);
		const tags = catalog.routes.find(
			(route) => route.layer === 'rest' && route.fullPath === '/rest/tags' && route.handler === 'getAll',
		);
		assert.ok(tags);
		assert.equal(tags.scope, 'tag:list');
		const pub = catalog.routes.find(
			(route) => route.layer === 'public' && route.fullPath === '/api/v1/tags' && route.handler === 'getTags',
		);
		assert.ok(pub);
		assert.equal(pub.scope, 'tag:list');
		assert.ok(pub.mappers.some((mapper) => mapper.name === 'toTagPublicDto'));
		assert.ok(pub.services.includes('TagService'));
		const reload = catalog.routes.find((route) => route.fullPath === '/rest/dev/reload');
		assert.equal(reload?.open, true);
		const favorite = catalog.entities.find((entity) => entity.name === 'UserFavorite');
		assert.equal(favorite?.table, 'user_favorites');
		assert.ok(catalog.counts.publicApi > 20);
		assert.ok(catalog.counts.rest > 50);
		assert.ok(catalog.counts.entities > 40);
		assert.ok(catalog.domains.some((domain) => domain.id === 'favorites'));
		assert.equal(catalog.warnings.length, 0);
	});
});
