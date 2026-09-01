import type { INodeProperties } from 'n8n-workflow';

import { userRLC } from './rlc.description';

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

/**
 * Shared by `channelMessage:create` and `chatMessage:create`. Safe to spread into both:
 * `updateDisplayOptions` merges into a fresh object rather than mutating this one.
 */
export const mentionsField: INodeProperties = {
	displayName: 'Mentions',
	name: 'mentions',
	type: 'fixedCollection',
	placeholder: 'Add Mention',
	default: {},
	typeOptions: {
		multipleValues: true,
	},
	description:
		'People to @mention. The Mention Placement option decides whether the tokens go before or after the message text, and adding a mention makes the message render as HTML even when Content Type is Text.',
	options: [
		{
			displayName: 'Mention',
			name: 'mention',
			values: [userRLC],
		},
	],
};

/**
 * Modifier for `mentionsField`, so it lives in each operation's `Options` collection rather than
 * as an always-visible field. Collection defaults only materialise once the option is added, so the
 * runtime side falls back to `start` when the key is absent.
 */
export const mentionPlacementOption: INodeProperties = {
	displayName: 'Mention Placement',
	name: 'mentionPlacement',
	type: 'options',
	default: 'start',
	description: 'Whether the mentions go before or after the message text',
	options: [
		{
			name: 'Start of Message',
			value: 'start',
			description: 'For example "@Jane please review this"',
		},
		{
			name: 'End of Message',
			value: 'end',
			description: 'For example "please review this @Jane"',
		},
	],
};
