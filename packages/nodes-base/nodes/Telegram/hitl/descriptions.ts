import type { INodeProperties } from 'n8n-workflow';

/**
 * The advanced HITL section for Send and Wait: one-tap approval inside the
 * Telegram chat instead of a link that opens a browser. Top-level properties,
 * not members of the `options` collection: `displayOptions` on collection
 * children cannot reference siblings outside the collection.
 */
export const telegramHitlProperties: INodeProperties[] = [
	{
		displayName: 'Approve Within Chat',
		name: 'chatApproval',
		type: 'boolean',
		default: false,
		description:
			'Whether approvers respond with one tap on buttons inside the Telegram chat, instead of opening a link in the browser. Requires this n8n instance to be reachable over public HTTPS.',
		displayOptions: {
			show: {
				responseType: ['approval'],
			},
		},
	},
	{
		displayName: 'Chat Approval Options',
		name: 'chatApprovalOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				responseType: ['approval'],
				chatApproval: [true],
			},
		},
		options: [
			{
				displayName: 'Restrict to User IDs',
				name: 'approverIds',
				type: 'string',
				default: '',
				description:
					'The user IDs allowed to approve or decline. Multiple can be defined separated by comma. If empty, anyone who can see the message can respond.',
			},
			{
				displayName: 'Unauthorized Reply',
				name: 'unauthorizedReplyText',
				type: 'string',
				default: 'You are not authorized to respond to this request.',
				description:
					'Popup shown (via Telegram alert) to users who tap a button but are not in the approver list',
			},
			{
				displayName: 'After Decision',
				name: 'postDecisionBehavior',
				type: 'options',
				default: 'showOutcome',
				options: [
					{ name: 'Show Outcome and Remove Buttons', value: 'showOutcome' },
					{ name: 'Remove Buttons Only', value: 'removeButtons' },
					{ name: 'Keep Message Unchanged', value: 'keepMessage' },
				],
			},
		],
	},
];

export interface TelegramChatApprovalOptions {
	approverIds?: string;
	unauthorizedReplyText?: string;
	postDecisionBehavior?: 'showOutcome' | 'removeButtons' | 'keepMessage';
}
