import { describe, expect, it } from 'vitest';

import { parseImports } from './imports.js';
import { createInMemoryProject } from './project.js';

describe('parseImports', () => {
	const parse = (source: string) => {
		const project = createInMemoryProject();
		const sourceFile = project.createSourceFile('module.ts', source);
		return parseImports(sourceFile).map(({ specifier, typeOnly }) => ({ specifier, typeOnly }));
	};

	it('treats `import type` / `export type` as erased', () => {
		expect(parse("import type { Foo } from './foo';")).toEqual([
			{ specifier: './foo', typeOnly: true },
		]);
		expect(parse("export type { Foo } from './foo';")).toEqual([
			{ specifier: './foo', typeOnly: true },
		]);
	});

	it('treats inline type-only imports / re-exports as erased', () => {
		expect(parse("import { type Foo } from './foo';")).toEqual([
			{ specifier: './foo', typeOnly: true },
		]);
		expect(parse("export { type Foo } from './foo';")).toEqual([
			{ specifier: './foo', typeOnly: true },
		]);
	});

	it('treats a mixed inline-type import / re-export as runtime', () => {
		expect(parse("import { type Foo, bar } from './foo';")).toEqual([
			{ specifier: './foo', typeOnly: false },
		]);
		expect(parse("export { type Foo, bar } from './foo';")).toEqual([
			{ specifier: './foo', typeOnly: false },
		]);
	});

	it('treats static value imports and re-exports as runtime', () => {
		expect(parse("import { foo } from './foo';")).toEqual([
			{ specifier: './foo', typeOnly: false },
		]);
		expect(parse("export { foo } from './foo';")).toEqual([
			{ specifier: './foo', typeOnly: false },
		]);
		expect(parse("import './bare';")).toEqual([{ specifier: './bare', typeOnly: false }]);
	});

	it('treats default and namespace imports as runtime', () => {
		expect(parse("import Foo from './foo';")).toEqual([{ specifier: './foo', typeOnly: false }]);
		expect(parse("import * as foo from './foo';")).toEqual([
			{ specifier: './foo', typeOnly: false },
		]);
	});

	it('ignores a bare `export {}` with no module specifier', () => {
		expect(parse('const foo = 1;\nexport { foo };')).toEqual([]);
	});

	// AST over regex: dynamic forms are runtime dependencies a regex over
	// import/export statements would silently miss.
	it('catches dynamic import() and require() as runtime', () => {
		expect(parse("async function f() { await import('@n8n/di'); }")).toEqual([
			{ specifier: '@n8n/di', typeOnly: false },
		]);
		expect(parse("const di = require('@n8n/di');")).toEqual([
			{ specifier: '@n8n/di', typeOnly: false },
		]);
	});
});
