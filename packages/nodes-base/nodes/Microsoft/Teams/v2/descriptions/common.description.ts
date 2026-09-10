import type { INodeProperties } from 'n8n-workflow';

import { teamworkTagRLC, userRLC } from './rlc.description';

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
 * Users only, for `chatMessage:create`. A chat is not team-scoped, so there is no team to scope
 * team tags to; the channel operations use `channelMentionsField`. Safe to spread:
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
		sortable: true,
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
 * Users or team tags, for the two channel operations. `mentionsField` with its own description
 * and the mention type discriminator in front of the two pickers.
 */
export const channelMentionsField: INodeProperties = {
	...mentionsField,
	description:
		'People or team tags to @mention. A team tag notifies everyone who carries it. The Mention Placement option decides whether the tokens go before or after the message text, and adding a mention makes the message render as HTML even when Content Type is Text.',
	options: [
		{
			displayName: 'Mention',
			name: 'mention',
			values: [
				{
					displayName: 'Mention Type',
					name: 'mentionType',
					type: 'options',
					default: 'user',
					// No expression on the discriminator: an expression-valued one makes both
					// pickers below count as displayed, so both report a missing required
					// parameter at once. This is an editor-side guard only, a lone `$fromAI()`
					// expression survives by design, so `resolveMentions` checks the value too.
					noDataExpression: true,
					options: [
						{ name: 'Team Tag', value: 'tag' },
						{ name: 'User', value: 'user' },
					],
				},
				{ ...userRLC, displayOptions: { show: { mentionType: ['user'] } } },
				{ ...teamworkTagRLC, displayOptions: { show: { mentionType: ['tag'] } } },
			],
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
