import type { INodeProperties } from 'n8n-workflow';

export const recipientOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['recipient'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Onfleet recipient',
				action: 'Create a recipient',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific Onfleet recipient',
				action: 'Get a recipient',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Onfleet recipient',
				action: 'Update a recipient',
			},
		],
		default: 'get',
	},
];

const additionalRecipientFields: INodeProperties[] = [
	{
		displayName: 'Recipient Notes',
		name: 'recipientNotes',
		type: 'string',
		default: '',
		description:
			'Notes for this recipient: these are global notes that should not be task- or destination-specific',
	},
	{
		displayName: 'Skip Recipient SMS Notifications',
		name: 'recipientSkipSMSNotifications',
		type: 'boolean',
		default: false,
		description: 'Whether this recipient has requested to skip SMS notifications',
	},
];

const recipientName = {
	displayName: 'Recipient Name',
	name: 'recipientName',
	type: 'string',
	description: "The recipient's complete name",
	default: '',
} as INodeProperties;

const recipientPhone = {
	displayName: 'Recipient Phone',
	name: 'recipientPhone',
	type: 'string',
	description:
		"A unique, valid phone number as per the organization's country if there's no leading + sign. If a phone number has a leading + sign, it will disregard the organization's country setting.",
	default: '',
} as INodeProperties;

const updateFields: INodeProperties[] = [
	{
		...recipientName,
		required: false,
	},
	{
		displayName: 'Recipient Notes',
		name: 'notes',
		type: 'string',
		default: '',
		description:
			'Notes for this recipient: these are global notes that should not be task- or destination-specific',
	},
	{
		...recipientPhone,
		required: false,
	},
	{
		displayName: 'Skip Recipient SMS Notifications',
		name: 'skipSMSNotifications',
		type: 'boolean',
		default: false,
		description: 'Whether this recipient has requested to skip SMS notifications',
	},
];

export const recipientExternalField = {
	displayName: 'Recipient',
	name: 'recipient',
	type: 'fixedCollection',
	placeholder: 'Add Recipient',
	default: {},
	options: [
		{
			displayName: 'Recipient Properties',
			name: 'recipientProperties',
			default: {},
			values: [
				{
					...recipientName,
					required: true,
				},
				{
					...recipientPhone,
					required: true,
				},
				...additionalRecipientFields,
			],
		},
	],
} as INodeProperties;

export const recipientFields: INodeProperties[] = [
	{
		displayName: 'Get By',
		name: 'getBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'ID',
				value: 'id',
			},
			{
				name: 'Phone',
				value: 'phone',
			},
			{
				name: 'Name',
				value: 'name',
			},
		],
		description: 'The variable that is used for looking up a recipient',
		required: true,
		default: 'id',
	},
	{
		displayName: 'Recipient ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['get'],
				getBy: ['id'],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the recipient object for lookup',
	},
	{
		displayName: 'Recipient ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['update'],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the recipient object for lookup',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['get'],
				getBy: ['name'],
			},
		},
		default: '',
		required: true,
		description: 'The name of the recipient for lookup',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['get'],
				getBy: ['phone'],
			},
		},
		default: '',
		required: true,
		description: 'The phone of the recipient for lookup',
	},
	{
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['create'],
			},
		},
		...recipientName,
		required: true,
	},
	{
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['create'],
			},
		},
		...recipientPhone,
		required: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['create'],
			},
		},
		options: additionalRecipientFields,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Update Fields',
		default: {},
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['update'],
			},
		},
		options: updateFields,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['recipient'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Skip Recipient Phone Number Validation',
				name: 'recipientSkipPhoneNumberValidation',
				type: 'boolean',
				default: false,
				description: "Whether to skip validation for this recipient's phone number",
			},
		],
	},
];
