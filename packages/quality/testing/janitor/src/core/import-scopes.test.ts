import { describe, expect, it } from 'vitest';

import { translateSpans, type LineSpan } from '@n8n/test-impact';

import { moduleFacts, narrowImportHunk, type ModuleFacts } from './import-scopes.js';

const same = (spans: LineSpan[]) => spans;
/** Narrow with the base commit equal to the map commit. */
const narrow = (map: ModuleFacts, head: ModuleFacts, oldLines: number[], newLines: number[]) =>
	narrowImportHunk(map, map, head, oldLines, newLines, same);

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
		expect(narrow(facts, head, [1], [1])).toEqual([{ lo: 8, hi: 8 }]);
	});

	it('resolves type-only imports and comment lines to nothing', () => {
		const head = moduleFacts(SOURCE.replace('Runs the job', 'Runs one job'));
		expect(narrow(facts, head, [2], [])).toEqual([]);
		expect(narrow(facts, head, [5], [5])).toEqual([]);
	});

	it('keeps the module-level span for side-effect imports and other code', () => {
		expect(narrow(facts, facts, [3], [3])).toBeNull();
		expect(narrow(facts, facts, [6], [6])).toBeNull();
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
		expect(narrow(decorated, decorated, [1], [1])).toBeNull();
		const plain = moduleFacts(source.replace('@Service()', ''));
		expect(narrow(plain, plain, [1], [1])).toEqual([]);
		// TypeScript emits no metadata for a type-only import.
		const typeOnly = moduleFacts(source.replace('import { Store }', 'import type { Store }'));
		expect(narrow(typeOnly, typeOnly, [1], [1])).toEqual([]);
	});

	it('keeps the module-level span when a parameter decorator emits metadata', () => {
		const source = [
			"import { Store } from './store';", // 1
			'export class Job {', // 2
			'	constructor(@Inject() private readonly store: Store) {}', // 3
			'}', // 4
		].join('\n');
		const f = moduleFacts(source);
		expect(narrow(f, f, [1], [1])).toBeNull();
	});

	it('keeps the module-level span for an import that still loads the module', () => {
		// With `verbatimModuleSyntax`, these compile to `import {} from './store'`.
		for (const line of ["import { type Store } from './store';", "import {} from './store';"]) {
			const f = moduleFacts(line);
			expect(narrow(f, f, [1], [1])).toBeNull();
		}
	});

	it('treats a class `extends` clause as a runtime use', () => {
		const source = ["import { Base } from './base';", 'export class Job extends Base {}'].join(
			'\n',
		);
		const f = moduleFacts(source);
		expect(narrow(f, f, [1], [1])).toEqual([{ lo: 2, hi: 2 }]);
	});

	it('counts the uses that the base commit added after the map commit', () => {
		// The base commit inserted lines 8-10 (a new use of `helper`) after map line 7.
		const base = moduleFacts(
			SOURCE.replace(
				'	return helper(value);',
				['	return helper(value);', '}', 'export function again() {', '	return helper(1);'].join(
					'\n',
				),
			),
		);
		const head = moduleFacts(SOURCE);
		const drift = [{ oldStart: 8, oldCount: 0, newStart: 9, newCount: 3 }];
		const toMap = (spans: LineSpan[]) => translateSpans(spans, drift);
		// The new use is in code that changed since the map commit: no line maps to it.
		expect(narrowImportHunk(facts, base, head, [1], [1], toMap)).toBeNull();
		expect(narrowImportHunk(facts, facts, head, [1], [1], toMap)).toEqual([{ lo: 8, hi: 8 }]);
	});
});
