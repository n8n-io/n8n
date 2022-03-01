import {
	INodeProperties,
} from 'n8n-workflow';

export const leadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Unsubscribe',
				value: 'unsubscribe',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
			},
		},
	},
];

export const leadFields: INodeProperties[] = [
	// ----------------------------------
	//        lead: create
	// ----------------------------------
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description: 'ID of the campaign to create the lead under.',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		description: 'Email of the lead to create.',
		displayOptions: {
			show: {
				resource: [
					'lead',
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
		default: {},
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				description: 'Company name of the lead to create.',
			},
			{
				displayName: 'Deduplicate',
				name: 'deduplicate',
				type: 'boolean',
				default: false,
				description: 'Do not insert if this email is already present in another campaign.',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the lead to create.',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the lead to create.',
			},
			{
				displayName: 'Icebreaker',
				name: 'icebreaker',
				type: 'string',
				default: '',
				description: 'Icebreaker of the lead to create.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the lead to create.',
			},
			{
				displayName: 'Picture URL',
				name: 'picture',
				type: 'string',
				default: '',
				description: 'Picture url of the lead to create.',
			},
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				default: '',
				description: 'LinkedIn url of the lead to create.',
			},
		],
	},

	// ----------------------------------
	//        lead: delete
	// ----------------------------------
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description: 'ID of the campaign to remove the lead from.',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		description: 'Email of the lead to delete.',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//           lead: get
	// ----------------------------------
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		description: 'Email of the lead to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------
	//        lead: unsubscribe
	// ----------------------------------
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description: 'ID of the campaign to unsubscribe the lead from.',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'unsubscribe',
				],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		description: 'Email of the lead to unsubscribe.',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'unsubscribe',
				],
			},
		},
	},
];
