import { Expression, Workflow } from '../../src';
import * as Helpers from '../Helpers';

export const nodeTypes = Helpers.NodeTypes();
export const workflow = new Workflow({
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
export const expression = new Expression(workflow);

export const evaluate = (value: string) =>
	expression.getParameterValue(value, null, 0, 0, 'node', [], 'manual', 'America/New_York', {});
