import type { INodeProperties } from 'n8n-workflow';

import { limitWaitTimeOption } from '../../utils/sendAndWait/descriptions';

const slackUserLocator: INodeProperties = {
	displayName: 'User',
	name: 'slackUser',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	noDataExpression: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a user...',
			typeOptions: { searchListMethod: 'getSlackUsers', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'U123AB45JGM',
			validation: [
				{
					type: 'regex',
					properties: { regex: '^[UW][A-Z0-9]{2,}$', errorMessage: 'Not a valid Slack User ID' },
				},
			],
		},
	],
	displayOptions: { show: { channel: ['slack'], slackTarget: ['user'] } },
};

const slackChannelLocator: INodeProperties = {
	displayName: 'Slack Channel',
	name: 'slackChannel',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	noDataExpression: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a channel...',
			typeOptions: { searchListMethod: 'getSlackChannels', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'C0122KQ70S7E',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[CGD][A-Z0-9]{2,}$',
						errorMessage: 'Not a valid Slack Channel ID',
					},
				},
			],
		},
	],
	displayOptions: { show: { channel: ['slack'], slackTarget: ['channel'] } },
};

const approverFields: INodeProperties[] = [
	{
		displayName: 'Label',
		name: 'label',
		type: 'string',
		default: '',
		placeholder: 'e.g. Finance lead',
		description:
			'The name of the approver in the result. Leave empty to use the channel and the recipient.',
	},
	{
		displayName: 'Channel',
		name: 'channel',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Email', value: 'email' },
			{ name: 'Slack', value: 'slack' },
			{ name: 'Telegram', value: 'telegram' },
		],
		default: 'email',
		description: 'Where to send the approval request. Add the channel to Channels too.',
	},
	{
		displayName: 'Send To',
		name: 'slackTarget',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'User', value: 'user' },
			{ name: 'Channel', value: 'channel' },
		],
		default: 'user',
		displayOptions: { show: { channel: ['slack'] } },
	},
	slackUserLocator,
	slackChannelLocator,
	{
		displayName: 'Email Address',
		name: 'email',
		type: 'string',
		default: '',
		required: true,
		noDataExpression: true,
		placeholder: 'e.g. finance@example.com',
		displayOptions: { show: { channel: ['email'] } },
	},
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		default: '',
		required: true,
		noDataExpression: true,
		description: 'The Telegram chat to send the approval request to',
		displayOptions: { show: { channel: ['telegram'] } },
	},
	{
		displayName: 'Message Override',
		name: 'messageOverride',
		type: 'string',
		default: '',
		typeOptions: { rows: 4 },
		description: 'A message for this approver only. Leave empty to use the shared message.',
	},
];

export const quorumApprovalProperties: INodeProperties[] = [
	{
		displayName: 'Channels',
		name: 'channels',
		type: 'multiOptions',
		noDataExpression: true,
		required: true,
		options: [
			{ name: 'Email', value: 'email' },
			{ name: 'Slack', value: 'slack' },
			{ name: 'Telegram', value: 'telegram' },
		],
		default: ['email'],
		description:
			'The channels that the approvers use. The node asks for a credential for each one.',
	},
	{
		displayName: 'Slack Authentication',
		name: 'authentication',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Access Token', value: 'accessToken' },
			{ name: 'OAuth2', value: 'oAuth2' },
		],
		default: 'accessToken',
		displayOptions: { show: { channels: ['slack'] } },
	},
	{
		displayName: 'Approvers',
		name: 'approvers',
		type: 'fixedCollection',
		placeholder: 'Add approver',
		default: {},
		typeOptions: {
			multipleValues: true,
			sortable: true,
			fixedCollection: { itemTitle: '={{ $collection.item.value.label || "Approver" }}' },
		},
		options: [{ displayName: 'Approver', name: 'approver', values: approverFields }],
	},
	{
		displayName: 'Approvals Required',
		name: 'approvalsRequired',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Any One', value: 'any', description: 'One approval approves the request' },
			{
				name: 'Majority',
				value: 'majority',
				description: 'More than half of the approvers must approve',
			},
			{ name: 'All', value: 'all', description: 'Every approver must approve' },
			{ name: 'Custom', value: 'custom', description: 'Set the number of approvals' },
		],
		default: 'majority',
	},
	{
		displayName: 'Number of Approvals',
		name: 'customRequired',
		type: 'number',
		noDataExpression: true,
		typeOptions: { minValue: 1 },
		default: 2,
		description:
			'How many approvers must approve. The request is declined as soon as this can no longer be reached.',
		displayOptions: { show: { approvalsRequired: ['custom'] } },
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: 'Approval required',
		required: true,
		description: 'The subject of the email. Only Email uses it.',
		displayOptions: { show: { channels: ['email'] } },
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '',
		required: true,
		typeOptions: { rows: 4 },
	},
	{
		displayName: 'Email Sender',
		name: 'fromEmail',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'admin@example.com',
		description: 'The email address that sends the request',
		displayOptions: { show: { channels: ['email'] } },
	},
	{
		displayName: 'Approval Type',
		name: 'approvalType',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Approve Only', value: 'single' },
			{ name: 'Approve and Decline', value: 'double' },
		],
		default: 'double',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [limitWaitTimeOption],
	},
];
