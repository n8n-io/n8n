import * as Helpers from './helpers';
import type { NodeParameterValueType } from '../src';
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
			],
			connections: {},
			active: false,
			nodeTypes,
		});
		const expression = workflow.expression;

		const evaluate = (value: NodeParameterValueType) =>
			expression.getParameterValue(value, null, 0, 0, 'node', [], 'manual', {});

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
