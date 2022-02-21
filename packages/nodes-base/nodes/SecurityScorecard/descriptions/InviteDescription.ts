import {
	INodeProperties,
} from 'n8n-workflow';

export const inviteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'invite',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an invite for a company/user',
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
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'invite',
				],
				operation: [
					'create',
				],
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
				resource: [
					'invite',
				],
				operation: [
					'create',
				],
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
				resource: [
					'invite',
				],
				operation: [
					'create',
				],
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
				resource: [
					'invite',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'invite',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Days to Resolve Issue',
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
				displayName: 'Grade to Maintain',
				description: 'Request the invitee\'s organisation to maintain a minimum grade',
				name: 'grade_to_maintain',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Is Organisation Point of Contact',
				description: 'Is the invitee organisation\'s point of contact',
				name: 'is_organization_point_of_contact',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Issue Description',
				name: 'issue_desc',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Issue Title',
				name: 'issue_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Issue Type',
				name: 'issue_type',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Send Me a Copy',
				name: 'sendme_copy',
				description: 'Send a copy of the invite to the requesting user',
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
