import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, ITaskBoardProxy } from 'n8n-workflow';

import { TaskBoard } from '../TaskBoard.node';

/** An execute context with one input item and the given node parameters. */
function createContext(parameters: Record<string, string>, proxy: ITaskBoardProxy) {
	const context = mock<IExecuteFunctions>();
	context.getInputData.mockReturnValue([{ json: {} }]);
	context.getNodeParameter.mockImplementation((name: string) => parameters[name]);
	context.getWorkflow.mockReturnValue({ id: 'workflow-1', name: 'Dispatcher', active: true });
	context.helpers.getTaskBoardProxy = async () => proxy;
	return context;
}

describe('TaskBoard node', () => {
	it('should move a task to a column role as the agent that it acts as', async () => {
		const proxy = mock<ITaskBoardProxy>();
		proxy.moveTask.mockResolvedValue(
			mock({ id: 'task-1', columnId: 'col-needs-input', title: 'Fix login' }),
		);
		const context = createContext(
			{
				operation: 'move',
				taskId: 'task-1',
				moveTo: 'role',
				columnRoleTarget: 'needs_input',
				actAs: 'agent',
				actorAgentId: 'agent-1',
			},
			proxy,
		);

		const [items] = await new TaskBoard().execute.call(context);

		expect(proxy.moveTask).toHaveBeenCalledWith(
			'task-1',
			{ columnRole: 'needs_input' },
			{ type: 'agent', id: 'agent-1' },
		);
		expect(items).toHaveLength(1);
		expect(items[0].json).toMatchObject({ id: 'task-1', columnId: 'col-needs-input' });
		expect(items[0].pairedItem).toEqual({ item: 0 });
	});
});
