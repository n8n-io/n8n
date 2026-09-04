import { GROUP_NODE_TYPE } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Group } from '../Group.node';

describe('Group node', () => {
	const group = new Group();

	it('declares the type the engine and the canvas look for', () => {
		expect(`n8n-nodes-base.${group.description.name}`).toBe(GROUP_NODE_TYPE);
	});

	it('has one main input and one main output', () => {
		// The outside world connects to these ports, never to a member.
		expect(group.description.inputs).toEqual(['main']);
		expect(group.description.outputs).toEqual(['main']);
	});

	it('stays out of the node creator', () => {
		// Only the canvas creates a group.
		expect(group.description.hidden).toBe(true);
	});

	it('carries the objective, which the card shows as the description', () => {
		expect(group.description.properties.map((property) => property.name)).toContain('objective');
	});

	it('forwards its input, which is what an empty group does', async () => {
		// A safety net: the engine resolves the boundary before a run, so this
		// path is reached only if a group node is executed directly.
		const items: INodeExecutionData[] = [{ json: { a: 1 } }];
		const context = mock<IExecuteFunctions>();
		context.getInputData.mockReturnValue(items);

		expect(await group.execute.call(context)).toEqual([items]);
	});
});
