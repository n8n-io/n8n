import {
	INodeProperties,
} from 'n8n-workflow';

export const inviteOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['invites'],
			},
		},
		options: [
			{ name: 'Create', value: 'create', description: 'Create an invite for a company/user' },
		],
		default: 'create',
	},
] as INodeProperties[];

export const inviteFields = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['invites'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['invites'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['invites'],
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
				resource: ['invites'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Optional Fields',
		name: 'optional',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['invites'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Target URL',
				name: 'target_url',
				type: 'string',
				description: 'Optional URL to take the invitee to when arriving to the platform',
				default: '',
				required: false,
			},
			{
				displayName: 'Is organisation point of contact',
				description: 'Is the invitee organisation\'s point of contact',
				name: 'is_organization_point_of_contact',
				type: 'boolean',
				default: false,
				required: false,
			},
			{
				displayName: 'Domain',
				description: 'Invitee company domain',
				name: 'domain',
				type: 'string',
				default: '',
				required: false,
			},
			{
				displayName: 'Grade to maintain',
				description: 'Request the invitee\'s organisation to maintain a minimum grade',
				name: 'grade_to_maintain',
				type: 'string',
				default: '',
				required: false,
			},
			{
				displayName: 'Days to resolve issue',
				description: 'Minimum days to resolve a scorecard issue',
				name: 'days_to_resolve_issue',
				type: 'float',
				default: 0,
				required: false,
			},
			{
				displayName: 'Issue Title',
				name: 'issue_title',
				type: 'string',
				default: '',
				required: false,
			},
			{
				displayName: 'Issue Type',
				name: 'issue_type',
				type: 'string',
				default: '',
				required: false,
			},
			{
				displayName: 'Issue Description',
				name: 'issue_desc',
				type: 'string',
				default: '',
				required: false,
			},
			{
				displayName: 'Send me a copy',
				name: 'sendme_copy',
				description: 'Send a copy of the invite to the requesting user',
				type: 'boolean',
				default: false,
				required: false,
			},
		],
	},
] as INodeProperties[];
