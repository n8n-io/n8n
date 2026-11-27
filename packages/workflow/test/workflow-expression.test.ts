import * as Helpers from './helpers';
import type { INodeExecutionData, INodeParameters, NodeParameterValueType } from '../src';
import { Workflow } from '../src/workflow';

describe('WorkflowExpression', () => {
	describe('getParameterValue()', () => {
		const selfReferencingParameters: Record<string, INodeParameters> = {
			exactSelfReference: { value1: '={{ $parameter.value1 }}' },
			compactSelfReference: { value1: '={{$parameter.value1}}' },
			bracketSelfReference: { value1: '={{ $parameter["value1"] }}' },
			selfReferenceWithFallback: { value1: "={{ $parameter.value1 || 'fallback' }}" },
			twoParameterCycle: { value1: '={{ $parameter.value2 }}', value2: '={{ $parameter.value1 }}' },
		};
		const nodeTypes = Helpers.NodeTypes();
		const workflow = new Workflow({
			id: '1',
			nodes: [
				{
					name: 'node',
					typeVersion: 1,
					type: 'test.set',
					id: 'uuid-1234',
					position: [0, 0],
					parameters: {},
				},
				{
					name: 'arrayParameter',
					typeVersion: 1,
					type: 'test.set',
					id: 'uuid-array-parameter',
					position: [0, 0],
					parameters: { value1: '={{ $input.all().map((item) => item.json.id) }}' },
				},
				...Object.entries(selfReferencingParameters).map(([name, parameters], index) => ({
					name,
					typeVersion: 1,
					type: 'test.set',
					id: `uuid-self-reference-${index}`,
					position: [0, 0] as [number, number],
					parameters,
				})),
			],
			connections: {},
			active: false,
			nodeTypes,
		});
		const expression = workflow.expression;

		beforeAll(async () => {
			await expression.acquireIsolate();
		});
		afterAll(async () => {
			await expression.releaseIsolate();
		});

		const evaluate = (
			value: NodeParameterValueType,
			inputData: INodeExecutionData[] = [],
			nodeName = 'node',
		) => expression.getParameterValue(value, null, 0, 0, nodeName, inputData, 'manual', {});

		it.each(
			[
				'$parameter["value1"]',
				'$node["arrayParameter"].parameter["value1"]',
				'$item(0).$parameter["value1"]',
				'$item(0).$node["arrayParameter"].parameter["value1"]',
			].flatMap((access) => [access, `${access}.map((id) => id)`]),
		)('resolves an array parameter once through %s', (access) => {
			const resolve = vi.spyOn(expression, 'getParameterValue');
			const ids = Array.from({ length: 50 }, (_, id) => id);

			try {
				expect(
					evaluate(
						`={{ ${access} }}`,
						ids.map((id) => ({ json: { id } })),
						'arrayParameter',
					),
				).toEqual(ids);
				// The outer evaluation and the nested one.
				expect(resolve).toHaveBeenCalledTimes(2);
			} finally {
				resolve.mockRestore();
			}
		});

		it('preserves own input fields when copying expression results', () => {
			const input = {
				constructor: 'Constructor value',
				toString: 'String value',
				hasOwnProperty: 'Own value',
			};

			expect(evaluate('={{ { payload: $json } }}', [{ json: input }])).toEqual({ payload: input });
		});

		it('should resolve $parameter["&key"] sibling reference within an object', () => {
			// n8n uses the `&`-prefixed syntax internally (e.g. in node parameter definitions)
			// to reference sibling fields: `={{ $parameter["&key"].split("|")[1] }}`
			// getParameterValue must pass the parent object as siblingParameters so these resolve.
			const result = evaluate({
				key: 'title|display',
				type: '={{$parameter["&key"].split("|")[1]}}',
			});

			expect(result).toEqual({ key: 'title|display', type: 'display' });
		});

		it.each([
			['exactSelfReference', undefined],
			['compactSelfReference', undefined],
			['bracketSelfReference', undefined],
			['selfReferenceWithFallback', 'fallback'],
			['twoParameterCycle', undefined],
		])(
			'should resolve a $parameter reference back to the parameter itself as undefined (%s)',
			(nodeName, expected) => {
				const node = workflow.getNode(nodeName)!;
				const result = expression.getParameterValue(
					node.parameters.value1,
					null,
					0,
					0,
					nodeName,
					[],
					'manual',
					{},
				);

				expect(result).toBe(expected);
			},
		);

		describe('single-value filter conditions', () => {
			it('skips resolving rightValue when operator.singleValue is true without mutating input', () => {
				const condition = {
					id: 'cond-1',
					leftValue: '={{ $json.value }}',
					rightValue: "={{ $('DeletedNode').item.json.x }}",
					operator: {
						type: 'string',
						operation: 'exists',
						singleValue: true,
					},
				};

				const result = evaluate(condition, [{ json: { value: 'hello' } }]);

				expect(result).toEqual({
					id: 'cond-1',
					leftValue: 'hello',
					operator: {
						type: 'string',
						operation: 'exists',
						singleValue: true,
					},
				});
				expect(condition.rightValue).toBe("={{ $('DeletedNode').item.json.x }}");
			});

			it('skips resolving hidden rightValue in nested filter and Switch rules regardless of key order', () => {
				const rulesValues = [
					{
						conditions: {
							options: {
								caseSensitive: true,
								leftValue: '',
								typeValidation: 'strict',
								version: 3,
							},
							conditions: [
								{
									operator: {
										type: 'boolean',
										operation: 'true',
										singleValue: true,
									},
									rightValue: "={{ $('DeletedNode').item.json.x }}",
									leftValue: '={{ $json.active }}',
								},
								{
									id: 'cond-2',
									leftValue: '={{ $json.label }}',
									rightValue: '={{ $json.expected }}',
									operator: {
										type: 'string',
										operation: 'equals',
									},
								},
							],
							combinator: 'and',
						},
						renameOutput: true,
						outputKey: 'Matched',
					},
				];

				const result = evaluate(rulesValues, [
					{ json: { active: true, label: 'ok', expected: 'ok' } },
				]);

				expect(result).toEqual([
					{
						conditions: {
							options: {
								caseSensitive: true,
								leftValue: '',
								typeValidation: 'strict',
								version: 3,
							},
							conditions: [
								{
									operator: {
										type: 'boolean',
										operation: 'true',
										singleValue: true,
									},
									leftValue: true,
								},
								{
									id: 'cond-2',
									leftValue: 'ok',
									rightValue: 'ok',
									operator: {
										type: 'string',
										operation: 'equals',
									},
								},
							],
							combinator: 'and',
						},
						renameOutput: true,
						outputKey: 'Matched',
					},
				]);
			});

			it('still throws when leftValue references a missing node on a single-value condition', () => {
				const condition = {
					id: 'cond-1',
					leftValue: "={{ $('DeletedNode').item.json.x }}",
					rightValue: '',
					operator: {
						type: 'string',
						operation: 'exists',
						singleValue: true,
					},
				};

				expect(() => evaluate(condition)).toThrow();
			});

			it.each([undefined, false])(
				'still throws when rightValue references a missing node and singleValue is %s',
				(singleValue) => {
					const condition = {
						id: 'cond-1',
						leftValue: '={{ $json.value }}',
						rightValue: "={{ $('DeletedNode').item.json.x }}",
						operator: {
							type: 'string',
							operation: 'equals',
							...(singleValue !== undefined ? { singleValue } : {}),
						},
					};

					expect(() => evaluate(condition, [{ json: { value: 'hello' } }])).toThrow();
				},
			);
		});
	});
});
