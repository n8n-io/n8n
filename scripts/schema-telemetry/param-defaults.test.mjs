import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findParamDefault } from './param-defaults.mjs';

const definition = (name, value) =>
	`{\n\t\tdisplayName: 'Simplify',\n\t\tname: '${name}',\n\t\ttype: 'boolean',\n\t\tdefault: ${value},\n\t}`;

describe('findParamDefault', () => {
	it('reads the default of the only definition', () => {
		const sources = [
			{ path: 'Perplexity/search.operation.ts', text: definition('simplify', false) },
		];

		assert.equal(findParamDefault(sources, { param: 'simplify', operation: 'search' }), 'false');
	});

	it('reads the default when every definition agrees', () => {
		const sources = [
			{ path: 'Notion/a.ts', text: definition('simple', true) },
			{ path: 'Notion/b.ts', text: definition('simple', true) },
		];

		assert.equal(findParamDefault(sources, { param: 'simple', operation: 'get' }), 'true');
	});

	it('uses the definition in the operation file when definitions disagree', () => {
		const sources = [
			{ path: 'OpenAi/v2/actions/text/classify.operation.ts', text: definition('simplify', false) },
			{ path: 'OpenAi/v2/actions/text/response.operation.ts', text: definition('simplify', true) },
		];

		assert.equal(findParamDefault(sources, { param: 'simplify', operation: 'classify' }), 'false');
	});

	it('returns undefined when definitions disagree and no file names the operation', () => {
		const sources = [
			{ path: 'Node/a.ts', text: definition('simplify', false) },
			{ path: 'Node/b.ts', text: definition('simplify', true) },
		];

		assert.equal(findParamDefault(sources, { param: 'simplify', operation: 'get' }), undefined);
	});

	it('returns undefined when the parameter is not defined', () => {
		const sources = [{ path: 'Node/a.ts', text: definition('other', true) }];

		assert.equal(findParamDefault(sources, { param: 'simplify', operation: 'get' }), undefined);
	});

	it('ignores a definition of a parameter whose name only starts the same', () => {
		const sources = [
			{ path: 'Node/a.ts', text: definition('simpleMode', false) + definition('simple', true) },
		];

		assert.equal(findParamDefault(sources, { param: 'simple', operation: 'get' }), 'true');
	});
});
