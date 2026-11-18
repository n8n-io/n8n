import {
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type ITriggerFunctions,
	type ITriggerResponse,
	type TaskBoardEventName,
} from 'n8n-workflow';

import { shouldEmit } from './shouldEmit';

export const TASK_BOARD_DISABLED_MESSAGE =
	'Task boards are not enabled on this instance (set N8N_ENABLED_MODULES=task-board)';

export class TaskBoardTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Task Board Trigger',
		name: 'taskBoardTrigger',
		icon: 'fa:tasks',
		group: ['trigger'],
		version: 1,
		subtitle: '=Board: {{$parameter["boardId"]}}',
		description: 'Starts the workflow when a task on a board changes',
		eventTriggerDescription: '',
		defaults: {
			name: 'Task Board Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Board ID',
				name: 'boardId',
				type: 'string',
				required: true,
				default: '',
				description: 'The ID of the task board to listen to',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{ name: 'Task Assigned', value: 'task.assigned' },
					{ name: 'Task Commented', value: 'task.commented' },
					{ name: 'Task Created', value: 'task.created' },
					{ name: 'Task Moved', value: 'task.moved' },
				],
				default: ['task.created', 'task.assigned', 'task.commented'],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Ignore Agent-Authored Events',
						name: 'ignoreAgentAuthored',
						type: 'boolean',
						default: true,
						description:
							'Whether to ignore events caused by an agent or a workflow acting as an agent',
					},
					{
						displayName: 'Only When Assignee Is an Agent',
						name: 'onlyAgentAssignee',
						type: 'boolean',
						default: true,
						description: "Whether to fire only when the task's current assignee is an agent",
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		if (!this.helpers.getTaskBoardProxy) {
			throw new NodeOperationError(this.getNode(), TASK_BOARD_DISABLED_MESSAGE);
		}
		const proxy = await this.helpers.getTaskBoardProxy();

		const boardId = this.getNodeParameter('boardId') as string;
		const events = this.getNodeParameter('events', []) as TaskBoardEventName[];
		const options = this.getNodeParameter('options', {}) as {
			ignoreAgentAuthored?: boolean;
			onlyAgentAssignee?: boolean;
		};
		const ignoreAgentAuthored = options.ignoreAgentAuthored ?? true;
		const onlyAgentAssignee = options.onlyAgentAssignee ?? true;

		const off = proxy.onEvent(async (event) => {
			try {
				if (!shouldEmit(event, { boardId, events, ignoreAgentAuthored })) return;
				const context = await proxy.getTaskContext(event.taskId);
				if (onlyAgentAssignee && context.assignee?.type !== 'agent') return;
				this.emit([this.helpers.returnJsonArray([{ ...event, ...context }])]);
			} catch (error) {
				// One bad event must not stop the listener.
				this.logger.error('Task Board Trigger failed to handle an event', { error });
			}
		});

		return { closeFunction: async () => off() };
	}
}
