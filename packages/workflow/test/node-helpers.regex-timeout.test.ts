import { afterEach, describe, expect, it } from 'vitest';

import type { INode, INodeProperties } from '../src/interfaces';
import { getNodeParametersIssues } from '../src/node-helpers';
import { resetSafeRegexEngine, setSafeRegexEngine } from '../src/safe-regex';

// https://github.com/n8n-io/n8n/issues/44319
describe('getNodeParametersIssues when the safe regex engine times out', () => {
	afterEach(() => {
		resetSafeRegexEngine();
	});

	// Same shape as the OpenAI Chat Model's `reasoningEffort` option.
	const properties: INodeProperties[] = [
		{
			displayName: 'Model',
			name: 'model',
			type: 'resourceLocator',
			default: { mode: 'list', value: 'gpt-5-mini' },
			modes: [
				{ displayName: 'From List', name: 'list', type: 'list' },
				{ displayName: 'ID', name: 'id', type: 'string' },
			],
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			default: {},
			options: [
				{
					displayName: 'Reasoning Effort',
					name: 'reasoningEffort',
					type: 'options',
					default: 'medium',
					options: [
						{ name: 'Low', value: 'low' },
						{ name: 'Medium', value: 'medium' },
						{ name: 'High', value: 'high' },
					],
					displayOptions: {
						show: {
							'/model': [{ _cnd: { regex: '(^o1([-\\d]+)?$)|(^o[3-9].*)|(^gpt-5.*)' } }],
						},
					},
				},
			],
		},
	];

	const node: INode = {
		id: 'node-1',
		name: 'OpenAI Chat Model',
		type: 'test.openAiChatModel',
		typeVersion: 1,
		position: [0, 0],
		parameters: {
			model: { __rl: true, mode: 'list', value: 'gpt-5.4' },
			options: { reasoningEffort: 'medium' },
		},
	};

	it('does not abort validation of a node-description displayOptions regex', () => {
		// The reported timeout is intermittent (wall-clock budget exceeded under CPU/GC pressure),
		// so force the engine into that state deterministically.
		const timeout = () => {
			throw new Error('Regular expression execution timed out');
		};
		setSafeRegexEngine({
			exec: timeout,
			test: timeout,
			replace: timeout,
			matchAll: timeout,
			split: timeout,
		});

		expect(() => getNodeParametersIssues(properties, node, null)).not.toThrow();
	});
});
