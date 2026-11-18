import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, ITaskBoardProxy } from 'n8n-workflow';

import { TaskBoard } from '../TaskBoard.node';

/** An execute context with one input item and the given node parameters. */
function createContext(parameters: Record<string, unknown>, proxy: ITaskBoardProxy) {
	const context = mock<IExecuteFunctions>();
	context.getInputData.mockReturnValue([{ json: {} }]);
	context.getNodeParameter.mockImplementation(
		(name: string, _itemIndex?: number, fallback?: unknown) =>
			(parameters[name] ?? fallback) as object,
	);
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

	describe('create', () => {
		const createParameters = {
			operation: 'create',
			boardId: 'board-1',
			title: 'Refund request',
			description: 'The customer wants a refund',
			columnRole: 'default',
			assigneeType: 'none',
		};

		it('should send the severity and the tags as an array', async () => {
			const proxy = mock<ITaskBoardProxy>();
			proxy.createTask.mockResolvedValue(mock({ id: 'task-1' }));
			const context = createContext(
				{ ...createParameters, severity: 'high', tags: ' billing, refund ,,' },
				proxy,
			);

			await new TaskBoard().execute.call(context);

			expect(proxy.createTask).toHaveBeenCalledWith(
				expect.objectContaining({ severity: 'high', tags: ['billing', 'refund'] }),
				{ type: 'workflow', id: 'workflow-1' },
			);
		});

		it('should accept tags from an expression that returns an array', async () => {
			const proxy = mock<ITaskBoardProxy>();
			proxy.createTask.mockResolvedValue(mock({ id: 'task-1' }));
			const context = createContext({ ...createParameters, tags: ['billing', ' refund '] }, proxy);

			await new TaskBoard().execute.call(context);

			expect(proxy.createTask.mock.calls[0][0].tags).toEqual(['billing', 'refund']);
		});

		it('should send no severity and no tags when they are not set', async () => {
			const proxy = mock<ITaskBoardProxy>();
			proxy.createTask.mockResolvedValue(mock({ id: 'task-1' }));
			const context = createContext({ ...createParameters, severity: 'none', tags: '' }, proxy);

			await new TaskBoard().execute.call(context);

			const [input] = proxy.createTask.mock.calls[0];
			expect(input.severity).toBeUndefined();
			expect(input.tags).toBeUndefined();
		});
	});

	describe('update', () => {
		const run = async (updateFields: Record<string, unknown>) => {
			const proxy = mock<ITaskBoardProxy>();
			proxy.updateTask.mockResolvedValue(mock({ id: 'task-1' }));
			const context = createContext(
				{
					operation: 'update',
					taskId: 'task-1',
					updateFields,
					actAs: 'agent',
					actorAgentId: 'agent-1',
				},
				proxy,
			);
			await new TaskBoard().execute.call(context);
			return proxy;
		};

		it('should send only the fields that are set', async () => {
			const proxy = await run({ title: 'New title' });

			expect(proxy.updateTask).toHaveBeenCalledWith(
				'task-1',
				{ title: 'New title' },
				{ type: 'agent', id: 'agent-1' },
			);
		});

		it('should send every field that is set', async () => {
			const proxy = await run({
				title: 'New title',
				description: 'New description',
				severity: 'critical',
				tags: 'licence, urgent',
			});

			expect(proxy.updateTask.mock.calls[0][1]).toEqual({
				title: 'New title',
				description: 'New description',
				severity: 'critical',
				tags: ['licence', 'urgent'],
			});
		});

		it('should remove the severity and the tags when they are set to empty values', async () => {
			const proxy = await run({ severity: 'none', tags: '' });

			expect(proxy.updateTask.mock.calls[0][1]).toEqual({ severity: null, tags: [] });
		});

		it('should skip fields whose expression returns no value', async () => {
			const proxy = await run({ severity: 'low', tags: undefined, title: null });

			expect(proxy.updateTask.mock.calls[0][1]).toEqual({ severity: 'low' });
		});

		it('should fail when no field is set', async () => {
			await expect(run({})).rejects.toThrow('Set at least one field to update');
		});

		it('should fail on an unknown severity', async () => {
			await expect(run({ severity: 'urgent' })).rejects.toThrow('Unknown severity: urgent');
		});
	});

	describe('hand off', () => {
		it.each([true, false])('should output the task with handedOff set to %s', async (handedOff) => {
			const proxy = mock<ITaskBoardProxy>();
			proxy.handoffTask.mockResolvedValue({
				task: mock({ id: 'task-1', title: 'Fix login' }),
				handedOff,
			});
			const context = createContext(
				{
					operation: 'handoff',
					taskId: 'task-1',
					handoffTo: ' Research Agent ',
					actAs: 'workflow',
				},
				proxy,
			);

			const [items] = await new TaskBoard().execute.call(context);

			expect(proxy.handoffTask).toHaveBeenCalledWith('task-1', 'Research Agent', {
				type: 'workflow',
				id: 'workflow-1',
			});
			expect(items[0].json).toMatchObject({ id: 'task-1', title: 'Fix login', handedOff });
		});
	});

	it('should fail a hand-off that names no agent', async () => {
		const proxy = mock<ITaskBoardProxy>();
		const context = createContext(
			{ operation: 'handoff', taskId: 'task-1', handoffTo: undefined, actAs: 'workflow' },
			proxy,
		);

		await expect(new TaskBoard().execute.call(context)).rejects.toThrow('Hand Off To is required');
		expect(proxy.handoffTask).not.toHaveBeenCalled();
	});

	describe('record usage', () => {
		const usageParameters = { operation: 'recordUsage', taskId: 'task-1', usageAgentId: 'agent-1' };

		it('should record the tokens and the cost of an agent run', async () => {
			const proxy = mock<ITaskBoardProxy>();
			proxy.recordUsage.mockResolvedValue(mock({ id: 'task-1' }));
			const context = createContext(
				{
					...usageParameters,
					promptTokens: 120,
					completionTokens: 30,
					totalTokens: 150,
					options: { cost: 0.0042 },
				},
				proxy,
			);

			await new TaskBoard().execute.call(context);

			expect(proxy.recordUsage).toHaveBeenCalledWith('task-1', {
				agentId: 'agent-1',
				promptTokens: 120,
				completionTokens: 30,
				totalTokens: 150,
				cost: 0.0042,
			});
		});

		it('should record zero tokens and no cost when the run has no usage data', async () => {
			const proxy = mock<ITaskBoardProxy>();
			proxy.recordUsage.mockResolvedValue(mock({ id: 'task-1' }));
			const context = createContext(
				{
					...usageParameters,
					promptTokens: null,
					completionTokens: undefined,
					totalTokens: 'n/a',
					options: { cost: null },
				},
				proxy,
			);

			await new TaskBoard().execute.call(context);

			expect(proxy.recordUsage).toHaveBeenCalledWith('task-1', {
				agentId: 'agent-1',
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				cost: null,
			});
		});
	});

	it('should return the error as an item when the node continues on fail', async () => {
		const proxy = mock<ITaskBoardProxy>();
		proxy.handoffTask.mockRejectedValue(new Error('Agent not found'));
		const context = createContext(
			{ operation: 'handoff', taskId: 'task-1', handoffTo: 'nobody', actAs: 'workflow' },
			proxy,
		);
		context.continueOnFail.mockReturnValue(true);

		const [items] = await new TaskBoard().execute.call(context);

		expect(items).toEqual([{ json: { error: 'Agent not found' }, pairedItem: { item: 0 } }]);
	});
});
