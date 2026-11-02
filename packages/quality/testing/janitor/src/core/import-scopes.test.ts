import { describe, expect, it } from 'vitest';

import { moduleFacts, narrowImportHunk } from './import-scopes.js';

const SOURCE = [
	"import { helper, type Shape } from './helper';", // 1
	"import type { Config } from './config';", // 2
	"import './register';", // 3
	'', // 4
	'/** Runs the job. */', // 5
	'export function run(input: Shape): Config {', // 6
	'	const value: Shape = input;', // 7
	'	return helper(value);', // 8
	'}', // 9
].join('\n');

const facts = moduleFacts(SOURCE);

describe('narrowImportHunk', () => {
	it('resolves a changed import to the runtime uses of its value bindings', () => {
		const head = moduleFacts(SOURCE.replace("from './helper'", "from './helper-v2'"));
		expect(narrowImportHunk(facts, head, [1], [1])).toEqual([{ lo: 8, hi: 8 }]);
	});

	it('resolves type-only imports and comment lines to nothing', () => {
		const head = moduleFacts(SOURCE.replace('Runs the job', 'Runs one job'));
		expect(narrowImportHunk(facts, head, [2], [])).toEqual([]);
		expect(narrowImportHunk(facts, head, [5], [5])).toEqual([]);
	});

	it('keeps the module-level span for side-effect imports and other code', () => {
		expect(narrowImportHunk(facts, facts, [3], [3])).toBeNull();
		expect(narrowImportHunk(facts, facts, [6], [6])).toBeNull();
	});

	it('keeps the module-level span when a type is emitted as decorator metadata', () => {
		const source = [
			"import { Store } from './store';", // 1
			'@Service()', // 2
			'export class Job {', // 3
			'	constructor(private readonly store: Store) {}', // 4
			'}', // 5
		].join('\n');
		const decorated = moduleFacts(source);
		expect(narrowImportHunk(decorated, decorated, [1], [1])).toBeNull();
		const plain = moduleFacts(source.replace('@Service()', ''));
		expect(narrowImportHunk(plain, plain, [1], [1])).toEqual([]);
		// TypeScript emits no metadata for a type-only import.
		for (const typeOnly of ['import type { Store }', 'import { type Store }']) {
			const f = moduleFacts(source.replace('import { Store }', typeOnly));
			expect(narrowImportHunk(f, f, [1], [1])).toEqual([]);
		}
	});

	it('treats a class `extends` clause as a runtime use', () => {
		const source = ["import { Base } from './base';", 'export class Job extends Base {}'].join(
			'\n',
		);
		const f = moduleFacts(source);
		expect(narrowImportHunk(f, f, [1], [1])).toEqual([{ lo: 2, hi: 2 }]);
	});
});
