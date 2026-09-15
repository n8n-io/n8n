import type { INodeProperties } from 'n8n-workflow';

/**
 * Shared by `channelMessage:create` and `channelMessage:reply`. Both read it with
 * the same destructuring default (unset means on), so one definition keeps the
 * two operations from drifting apart on when the link is appended.
 */
export const includeLinkToWorkflowOption: INodeProperties = {
	displayName: 'Include Link to Workflow',
	name: 'includeLinkToWorkflow',
	type: 'boolean',
	default: true,
	description:
		'Whether to append a link to this workflow at the end of the message. This is helpful if you have many workflows sending messages.',
};
