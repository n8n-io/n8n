import type { INodeProperties } from 'n8n-workflow';

export const inviteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: {
				resource: ['invite'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an invite for a company/user',
				action: 'Create an invite',
			},
		],
		default: 'create',
	},
];

export const inviteFields: INodeProperties[] = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['invite'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'First name',
		name: 'firstName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['invite'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Last name',
		name: 'lastName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['invite'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		description: 'Message for the invitee',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['invite'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['invite'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Days to resolve issue',
				description: 'Minimum days to resolve a scorecard issue',
				name: 'days_to_resolve_issue',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Domain',
				description: 'Invitee company domain',
				name: 'domain',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Grade to maintain',
				description: "Request the invitee's organisation to maintain a minimum grade",
				name: 'grade_to_maintain',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Is organisation point of contact',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: "Is the invitee organisation's point of contact",
				name: 'is_organization_point_of_contact',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Issue description',
				name: 'issue_desc',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Issue title',
				name: 'issue_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Issue type',
				name: 'issue_type',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Send me a copy',
				name: 'sendme_copy',
				description: 'Whether to send a copy of the invite to the requesting user',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Target URL',
				name: 'target_url',
				type: 'string',
				description: 'Optional URL to take the invitee to when arriving to the platform',
				default: '',
			},
		],
	},
];
