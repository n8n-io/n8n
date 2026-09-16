import type { INodeProperties } from 'n8n-workflow';

import { userRLC } from './rlc.description';

/**
 * Shared by `channelMessage:create`, `channelMessage:reply` and `chatMessage:create`. One
 * definition keeps the three from drifting apart on the field itself. They do NOT agree on the
 * unset fallback, and that is deliberate: `chatMessage:create` and `channelMessage:reply` treat
 * unset as on, while `channelMessage:create` treats it as on only from `nodeVersion >= 1.1`,
 * because v1 shipped without the link.
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
		'People to @mention. Mention Placement puts the mentions before or after the message text. A mention makes the message render as HTML, even if Content Type is Text.',
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
	// Repeats the HTML note from `mentionsField`, because the collection-overhaul UI does not
	// render a fixedCollection's own description and this is the only other mention-specific copy.
	description:
		'Whether the mentions go before or after the message text. A mention makes the message render as HTML, even if Content Type is Text.',
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
