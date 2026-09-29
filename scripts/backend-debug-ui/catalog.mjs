import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROUTE_METHODS = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options'];
const COLUMN_DECORATORS = [
	'Column',
	'PrimaryColumn',
	'PrimaryGeneratedColumn',
	'CreateDateColumn',
	'UpdateDateColumn',
	'DeleteDateColumn',
	'JsonColumn',
	'DateTimeColumn',
	'BinaryColumn',
	'VirtualColumn',
];

const SKIP_DIRS = new Set([
	'node_modules',
	'dist',
	'coverage',
	'__tests__',
	'__mocks__',
	'.turbo',
]);

const INHERITED_COLUMNS = {
	WithTimestampsAndStringId: [
		['id', 'PrimaryColumn'],
		['createdAt', 'CreateDateColumn'],
		['updatedAt', 'UpdateDateColumn'],
	],
	WithTimestamps: [
		['createdAt', 'CreateDateColumn'],
		['updatedAt', 'UpdateDateColumn'],
	],
	WithStringId: [['id', 'PrimaryColumn']],
	WithCreatedAt: [['createdAt', 'CreateDateColumn']],
	WithUpdatedAt: [['updatedAt', 'UpdateDateColumn']],
};

/** Drop comments. Newlines stay so line numbers still match the file. */
export function stripComments(source) {
	let out = '';
	let state = 'code';
	for (let i = 0; i < source.length; i++) {
		const char = source[i];
		const next = source[i + 1];
		if (state === 'code') {
			if (char === '/' && next === '/') {
				state = 'line';
				out += ' ';
				i++;
				continue;
			}
			if (char === '/' && next === '*') {
				state = 'block';
				out += ' ';
				i++;
				continue;
			}
			if (char === "'" || char === '"' || char === '`') {
				state = char;
				out += char;
				continue;
			}
			out += char;
			continue;
		}
		if (state === 'line') {
			if (char === '\n') {
				state = 'code';
				out += '\n';
			} else out += ' ';
			continue;
		}
		if (state === 'block') {
			if (char === '*' && next === '/') {
				state = 'code';
				out += '  ';
				i++;
			} else out += char === '\n' ? '\n' : ' ';
			continue;
		}
		out += char;
		if (char === '\\') {
			const escaped = source[++i];
			if (escaped !== undefined) out += escaped;
			continue;
		}
		if (char === state) state = 'code';
	}
	return out;
}

/** Index of the `)` that closes the `(` at `openIndex`. */
export function findMatchingParen(source, openIndex) {
	let depth = 0;
	let state = 'code';
	for (let i = openIndex; i < source.length; i++) {
		const char = source[i];
		const next = source[i + 1];
		if (state === 'code') {
			if (char === '/' && next === '/') {
				state = 'line';
				i++;
				continue;
			}
			if (char === '/' && next === '*') {
				state = 'block';
				i++;
				continue;
			}
			if (char === "'" || char === '"' || char === '`') {
				state = char;
				continue;
			}
			if (char === '(') depth++;
			else if (char === ')') {
				depth--;
				if (depth === 0) return i;
			}
			continue;
		}
		if (state === 'line') {
			if (char === '\n') state = 'code';
			continue;
		}
		if (state === 'block') {
			if (char === '*' && next === '/') {
				state = 'code';
				i++;
			}
			continue;
		}
		if (char === '\\') {
			i++;
			continue;
		}
		if (char === state) state = 'code';
	}
	return -1;
}

function lineOf(source, index) {
	let line = 1;
	for (let i = 0; i < index && i < source.length; i++) {
		if (source[i] === '\n') line++;
	}
	return line;
}

function walk(dir, predicate, out) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		if (SKIP_DIRS.has(entry.name)) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(full, predicate, out);
			continue;
		}
		if (!entry.isFile()) continue;
		if (entry.name.endsWith('.d.ts') || entry.name.endsWith('.test.ts')) continue;
		if (predicate(entry.name, full)) out.push(full);
	}
}

function relPath(root, file) {
	return path.relative(root, file).split(path.sep).join('/');
}

export function domainFor(rel) {
	const moduleMatch = /packages\/cli\/src\/modules\/([^/]+)/.exec(rel);
	if (moduleMatch) return moduleMatch[1];
	if (rel.includes('packages/@n8n/db/')) return 'db';
	if (rel.includes('packages/cli/src/public-api/')) return 'public-api';
	if (
		rel.includes('packages/cli/src/services/') ||
		rel.includes('packages/cli/src/controllers/')
	) {
		return 'cli';
	}
	const top = /packages\/cli\/src\/([^/]+)/.exec(rel);
	return top ? top[1] : 'cli';
}

function joinRoute(prefix, base, routePath) {
	const parts = `${prefix}/${base}/${routePath}`
		.split('/')
		.map((part) => part.trim())
		.filter(Boolean);
	return `/${parts.join('/')}`;
}

function stringsIn(list) {
	const values = [];
	const re = /(['"`])([^'"`]*)\1/g;
	let match = re.exec(list);
	while (match) {
		if (match[2]) values.push(match[2]);
		match = re.exec(list);
	}
	return values;
}

function readScope(text) {
	const hits = [];
	const simple = /@(GlobalScope|ProjectScope|ApiKeyScope)\(\s*(['"`])([^'"`]+)\2/g;
	let match = simple.exec(text);
	while (match) {
		hits.push({ index: match.index, label: match[3] });
		match = simple.exec(text);
	}
	const list = /@ApiKeyScope\(\s*\{\s*(anyOf|allOf)\s*:\s*\[([^\]]*)\]/g;
	match = list.exec(text);
	while (match) {
		const values = stringsIn(match[2]);
		const mode = match[1] === 'anyOf' ? 'any of' : 'all of';
		hits.push({ index: match.index, label: values.length ? `${mode} ${values.join(', ')}` : mode });
		match = list.exec(text);
	}
	hits.sort((a, b) => a.index - b.index);
	return hits.at(-1)?.label ?? null;
}

function readSummary(text) {
	let summary = null;
	const re = /@ApiSummary\(\s*(['"`])([^'"`]*)\1/g;
	let match = re.exec(text);
	while (match) {
		summary = match[2];
		match = re.exec(text);
	}
	return summary;
}

function readHandler(after) {
	let index = 0;
	while (index < after.length) {
		while (index < after.length && /\s/.test(after[index])) index++;
		if (after[index] !== '@') break;
		const paren = after.indexOf('(', index);
		if (paren < 0) return null;
		const end = findMatchingParen(after, paren);
		if (end < 0) return null;
		index = end + 1;
	}
	const match =
		/^(?:(?:public|private|protected|async|readonly|override|static)\s+)*([A-Za-z_]\w*)\s*(?:<[^>\n]+>)?\s*\(/.exec(
			after.slice(index),
		);
	if (!match) return null;
	return { name: match[1], index };
}

function controllerBefore(source, index) {
	const before = source.slice(0, index);
	const re =
		/@(RestController|PublicApiController)\(\s*(?:(['"`])([^'"`]*)\2)?\s*\)\s*(?:export\s+)?class\s+(\w+)/g;
	let last = null;
	let match = re.exec(before);
	while (match) {
		last = {
			kind: match[1],
			base: match[3] && match[3].length > 0 ? match[3] : '/',
			className: match[4],
			index: match.index,
		};
		match = re.exec(before);
	}
	return last;
}

function parseRoutes(source, rel, domain, restPrefix) {
	const hits = [];
	const re = new RegExp(`@(${ROUTE_METHODS.join('|')})\\(`, 'g');
	let match = re.exec(source);
	while (match) {
		const open = match.index + match[0].length - 1;
		const close = findMatchingParen(source, open);
		if (close < 0) {
			match = re.exec(source);
			continue;
		}
		hits.push({
			method: match[1].toUpperCase(),
			index: match.index,
			open,
			close,
		});
		re.lastIndex = close + 1;
		match = re.exec(source);
	}

	const mappers = extractMappers(source);
	const routes = [];
	let previousHandlerEnd = -1;
	let previousClass = '';
	for (const hit of hits) {
		const args = source.slice(hit.open + 1, hit.close);
		const pathMatch = /^\s*(['"`])([^'"`]*)\1/.exec(args);
		const controller = controllerBefore(source, hit.index);
		if (!pathMatch || !controller) continue;
		const handler = readHandler(source.slice(hit.close + 1));
		const handlerEnd = handler ? hit.close + 1 + handler.index : hit.close + 1;
		if (controller.className !== previousClass) previousHandlerEnd = controller.index;
		// Stop at this handler so the next route's scope is not included.
		const around = source.slice(Math.max(controller.index, previousHandlerEnd), handlerEnd);
		previousHandlerEnd = handlerEnd;
		previousClass = controller.className;
		const layer = controller.kind === 'PublicApiController' ? 'public' : 'rest';
		const prefix = layer === 'public' ? '/api/v1' : `/${restPrefix}`;
		const fullPath = joinRoute(prefix, controller.base, pathMatch[2]);
		routes.push({
			id: `${layer}:${hit.method}:${fullPath}:${controller.className}`,
			layer,
			method: hit.method,
			path: pathMatch[2],
			fullPath,
			handler: handler?.name ?? '',
			controller: controller.className,
			file: rel,
			line: lineOf(source, hit.index),
			domain,
			scope: readScope(around),
			summary: readSummary(around),
			open: /skipAuth\s*:\s*true/.test(args) || /allowUnauthenticated\s*:\s*true/.test(args),
			services: [],
			entities: [],
			repositories: [],
			mappers,
		});
	}
	return routes;
}

function extractMappers(source) {
	const mappers = [];
	const re = /(?:export\s+)?(?:const|function)\s+(to[A-Z]\w*)\b/g;
	let match = re.exec(source);
	while (match) {
		const excerpt = source
			.slice(match.index, match.index + 900)
			.split('\n')
			.slice(0, 24)
			.join('\n')
			.trim();
		mappers.push({ name: match[1], source: excerpt });
		if (mappers.length >= 4) break;
		match = re.exec(source);
	}
	return mappers;
}

function parseImports(source) {
	const valueNames = [];
	const allNames = [];
	const re = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"][^'"]+['"]/g;
	let match = re.exec(source);
	while (match) {
		const typeOnly = Boolean(match[1]);
		for (const part of match[2].split(',')) {
			const trimmed = part.trim();
			if (!trimmed) continue;
			const partIsType = typeOnly || trimmed.startsWith('type ');
			const name = trimmed
				.replace(/^type\s+/, '')
				.split(/\s+as\s+/)
				.pop()
				.trim();
			if (!/^[A-Za-z_]\w*$/.test(name)) continue;
			allNames.push(name);
			if (!partIsType) valueNames.push(name);
		}
		match = re.exec(source);
	}
	return { valueNames, allNames };
}

function parseService(source, rel, domain) {
	const services = [];
	const re = /export\s+(?:abstract\s+)?class\s+(\w+)/g;
	let match = re.exec(source);
	while (match) {
		const name = match[1];
		const next = source.slice(match.index + match[0].length);
		const bodyEnd = next.indexOf('\nexport ');
		const body = bodyEnd === -1 ? next : next.slice(0, bodyEnd);
		const methods = [];
		const methodRe =
			/\n\t(?:(?:public|private|protected|async|override|static|readonly)\s+)*(#?[A-Za-z_]\w*)\s*(?:<[^>\n]+>)?\s*\(/g;
		let method = methodRe.exec(body);
		while (method) {
			const methodName = method[1];
			if (!['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(methodName)) {
				methods.push(methodName);
			}
			method = methodRe.exec(body);
		}
		const unique = [...new Set(methods)];
		services.push({
			name,
			file: rel,
			domain,
			methods: unique.slice(0, 40),
			methodCount: unique.length,
			entities: [],
			repositories: [],
			imports: parseImports(source),
		});
		match = re.exec(source);
	}
	return services;
}

function inheritedColumns(source) {
	const match = /export\s+class\s+\w+[^{]*\bextends\s+([A-Za-z0-9_]+)/.exec(source);
	if (!match) return [];
	const columns = INHERITED_COLUMNS[match[1]] ?? [];
	return columns.map(([name, decorator]) => ({ name, decorator, inherited: true }));
}

function readProperty(after) {
	const window = after.slice(0, 800);
	let index = 0;
	while (index < window.length) {
		while (index < window.length && /\s/.test(window[index])) index++;
		if (window[index] !== '@') break;
		index++;
		while (index < window.length && /[A-Za-z0-9_]/.test(window[index])) index++;
		while (index < window.length && /\s/.test(window[index])) index++;
		if (window[index] === '(') {
			const end = findMatchingParen(window, index);
			if (end < 0) return null;
			index = end + 1;
		}
	}
	const match = /^([A-Za-z_]\w*)\s*[?!]?\s*:/.exec(window.slice(index));
	return match?.[1] ?? null;
}

function parseEntity(source, rel, domain) {
	const at = source.indexOf('@Entity');
	if (at < 0) return null;
	const classMatch = /export\s+class\s+(\w+)/.exec(source);
	if (!classMatch) return null;
	let args = '';
	let cursor = at + '@Entity'.length;
	while (/\s/.test(source[cursor])) cursor++;
	if (source[cursor] === '(') {
		const end = findMatchingParen(source, cursor);
		if (end > cursor) args = source.slice(cursor + 1, end).trim();
	}
	let table = classMatch[1];
	let tableExplicit = false;
	const quoted = /^(['"`])([^'"`]+)\1/.exec(args);
	const named = /name\s*:\s*(['"`])([^'"`]+)\1/.exec(args);
	if (quoted) {
		table = quoted[2];
		tableExplicit = true;
	} else if (named) {
		table = named[2];
		tableExplicit = true;
	}
	const columns = inheritedColumns(source);
	const body = source.slice(classMatch.index);
	const deco = new RegExp(`@(${COLUMN_DECORATORS.join('|')})\\b`, 'g');
	let match = deco.exec(body);
	while (match) {
		const property = readProperty(body.slice(match.index));
		if (property) {
			const existing = columns.findIndex((column) => column.name === property);
			const entry = { name: property, decorator: match[1], inherited: false };
			if (existing >= 0) columns[existing] = entry;
			else columns.push(entry);
		}
		match = deco.exec(body);
	}
	return {
		name: classMatch[1],
		table,
		tableExplicit,
		file: rel,
		domain,
		columns,
		imports: parseImports(source),
	};
}

function parseRepository(source, rel, domain) {
	const repositories = [];
	const re = /export\s+class\s+(\w+)/g;
	let match = re.exec(source);
	while (match) {
		repositories.push({
			name: match[1],
			file: rel,
			domain,
			entities: [],
			imports: parseImports(source),
		});
		match = re.exec(source);
	}
	return repositories;
}

function readSource(file) {
	try {
		const info = statSync(file);
		if (info.size > 1_500_000) return null;
		return stripComments(readFileSync(file, 'utf8'));
	} catch {
		return null;
	}
}

function finishLinks(routes, services, repositories, entities) {
	const entityNames = new Set(entities.map((entity) => entity.name));
	const repositoryNames = new Set(repositories.map((repository) => repository.name));
	const serviceNames = new Set(services.map((service) => service.name));

	const linksFrom = (imports) => ({
		entities: [...new Set(imports.allNames.filter((name) => entityNames.has(name)))],
		repositories: [...new Set(imports.valueNames.filter((name) => repositoryNames.has(name)))],
		services: [...new Set(imports.valueNames.filter((name) => serviceNames.has(name)))],
	});

	for (const service of services) {
		const links = linksFrom(service.imports);
		service.entities = links.entities;
		service.repositories = links.repositories;
		delete service.imports;
	}
	for (const repository of repositories) {
		repository.entities = linksFrom(repository.imports).entities;
		delete repository.imports;
	}
	for (const entity of entities) delete entity.imports;

	const serviceByName = new Map(services.map((service) => [service.name, service]));
	const repositoryByName = new Map(repositories.map((repository) => [repository.name, repository]));

	for (const route of routes) {
		const fileImports = route.imports;
		delete route.imports;
		const direct = linksFrom(fileImports);
		const entitiesForRoute = new Set(direct.entities);
		const repositoriesForRoute = new Set(direct.repositories);
		for (const name of direct.services) {
			const service = serviceByName.get(name);
			if (!service) continue;
			for (const entity of service.entities) entitiesForRoute.add(entity);
			for (const repository of service.repositories) {
				repositoriesForRoute.add(repository);
				for (const entity of repositoryByName.get(repository)?.entities ?? []) {
					entitiesForRoute.add(entity);
				}
			}
		}
		for (const repository of repositoriesForRoute) {
			for (const entity of repositoryByName.get(repository)?.entities ?? []) {
				entitiesForRoute.add(entity);
			}
		}
		route.services = direct.services;
		route.entities = [...entitiesForRoute];
		route.repositories = [...repositoriesForRoute];
	}
}

/**
 * Read controllers, services, entities, and repositories from an n8n checkout.
 * The result is source structure. It does not start n8n.
 */
export function scanCatalog(root, { restPrefix = 'rest' } = {}) {
	const controllerFiles = [];
	const serviceFiles = [];
	const entityFiles = [];
	const repositoryFiles = [];
	const cliSrc = path.join(root, 'packages/cli/src');
	const dbSrc = path.join(root, 'packages/@n8n/db/src');

	walk(
		cliSrc,
		(name) => name.endsWith('.ts') && name.toLowerCase().includes('controller'),
		controllerFiles,
	);
	walk(cliSrc, (name) => name.endsWith('.service.ts'), serviceFiles);
	walk(cliSrc, (name) => name.endsWith('.entity.ts'), entityFiles);
	// Shared entities live in this folder and do not all use the `.entity.ts` suffix.
	walk(path.join(dbSrc, 'entities'), (name) => name.endsWith('.ts'), entityFiles);
	walk(cliSrc, (name) => name.endsWith('.repository.ts'), repositoryFiles);
	walk(
		path.join(dbSrc, 'repositories'),
		(name) => name.endsWith('.repository.ts'),
		repositoryFiles,
	);

	const routes = [];
	const services = [];
	const entities = [];
	const repositories = [];
	const warnings = [];

	const take = (file, parse) => {
		const rel = relPath(root, file);
		const source = readSource(file);
		if (source == null) return;
		try {
			parse(source, rel, domainFor(rel));
		} catch (error) {
			warnings.push({ file: rel, message: error instanceof Error ? error.message : 'Parse failed' });
		}
	};

	for (const file of controllerFiles) {
		take(file, (source, rel, domain) => {
			const found = parseRoutes(source, rel, domain, restPrefix);
			const imports = parseImports(source);
			for (const route of found) route.imports = imports;
			routes.push(...found);
		});
	}
	for (const file of serviceFiles) {
		take(file, (source, rel, domain) => {
			services.push(...parseService(source, rel, domain));
		});
	}
	for (const file of entityFiles) {
		take(file, (source, rel, domain) => {
			if (!source.includes('@Entity')) return;
			const entity = parseEntity(source, rel, domain);
			if (entity) entities.push(entity);
		});
	}
	for (const file of repositoryFiles) {
		take(file, (source, rel, domain) => {
			repositories.push(...parseRepository(source, rel, domain));
		});
	}

	finishLinks(routes, services, repositories, entities);

	const domainIds = new Set([
		...routes.map((route) => route.domain),
		...services.map((service) => service.domain),
		...entities.map((entity) => entity.domain),
		...repositories.map((repository) => repository.domain),
	]);
	const domains = [...domainIds]
		.map((id) => ({
			id,
			services: services
				.filter((service) => service.domain === id)
				.sort((a, b) => a.name.localeCompare(b.name)),
			repositories: repositories
				.filter((repository) => repository.domain === id)
				.sort((a, b) => a.name.localeCompare(b.name)),
		}))
		.sort((a, b) => a.id.localeCompare(b.id));

	routes.sort((a, b) => a.fullPath.localeCompare(b.fullPath) || a.method.localeCompare(b.method));
	entities.sort((a, b) => a.name.localeCompare(b.name));
	repositories.sort((a, b) => a.name.localeCompare(b.name));

	return {
		restPrefix,
		routes,
		domains,
		entities,
		repositories,
		warnings,
		counts: {
			publicApi: routes.filter((route) => route.layer === 'public').length,
			rest: routes.filter((route) => route.layer === 'rest').length,
			services: services.length,
			entities: entities.length,
			repositories: repositories.length,
			domains: domains.length,
		},
	};
}
