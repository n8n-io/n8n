import * as Helpers from './helpers';
import type { INodeExecutionData, NodeParameterValueType } from '../src';
import { Workflow } from '../src/workflow';

describe('WorkflowExpression', () => {
	describe('getParameterValue()', () => {
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
	});
});
