import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { FilterValue, INode, INodeProperties } from '../src/interfaces';
import { getNodeParametersIssues } from '../src/node-helpers';
import { executeFilter } from '../src/node-parameters/filter-parameter';
import { resetSafeRegexEngine, setSafeRegexEngine } from '../src/safe-regex';

// https://github.com/n8n-io/n8n/issues/44319
describe('regex checks when the safe regex engine times out', () => {
	// The reported timeout is intermittent (wall-clock budget exceeded under CPU/GC pressure),
	// so force the engine into that state deterministically.
	beforeEach(() => {
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
	});

	afterEach(() => {
		resetSafeRegexEngine();
	});

	const nodeFactory = (parameters: INode['parameters']): INode => ({
		id: 'node-1',
		name: 'OpenAI Chat Model',
		type: 'test.openAiChatModel',
		typeVersion: 1,
		position: [0, 0],
		parameters,
	});

	describe('node-description patterns', () => {
		it('does not abort validation of a displayOptions regex', () => {
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
			const node = nodeFactory({
				model: { __rl: true, mode: 'list', value: 'gpt-5.4' },
				options: { reasoningEffort: 'medium' },
			});

			expect(() => getNodeParametersIssues(properties, node, null)).not.toThrow();
		});

		describe('resource locator regex validation', () => {
			const properties: INodeProperties[] = [
				{
					displayName: 'Document',
					name: 'documentId',
					type: 'resourceLocator',
					default: { mode: 'id', value: '' },
					modes: [
						{
							displayName: 'ID',
							name: 'id',
							type: 'string',
							validation: [
								{
									type: 'regex',
									properties: { regex: '[0-9]+', errorMessage: 'Not a valid document ID' },
								},
							],
						},
					],
				},
			];

			it('accepts a matching value', () => {
				const node = nodeFactory({ documentId: { __rl: true, mode: 'id', value: '12345' } });

				expect(getNodeParametersIssues(properties, node, null)).toBeNull();
			});

			it('reports a value that does not match', () => {
				const node = nodeFactory({ documentId: { __rl: true, mode: 'id', value: 'abc' } });

				expect(getNodeParametersIssues(properties, node, null)).toEqual({
					parameters: { documentId: ['Not a valid document ID'] },
				});
			});
		});
	});

	describe('user-authored patterns', () => {
		it('still run through the timed safe regex engine', () => {
			const filter: FilterValue = {
				combinator: 'and',
				conditions: [
					{
						id: '1',
						leftValue: 'aaaa',
						rightValue: 'a+',
						operator: { operation: 'regex', type: 'string' },
					},
				],
				options: { version: 3, leftValue: '', caseSensitive: true, typeValidation: 'strict' },
			};

			expect(() => executeFilter(filter)).toThrow('Regular expression execution timed out');
		});
	});
});
