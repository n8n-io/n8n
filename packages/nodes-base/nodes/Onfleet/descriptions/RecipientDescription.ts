import {
	INodeProperties
} from 'n8n-workflow';

export const recipientOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [ 'recipients' ],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Onfleet recipient.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific Onfleet recipient.',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Onfleet recipient.',
			},
		],
		default: 'get',
	},
] as INodeProperties[];

const additionalRecipientFields = [
	{
		displayName: 'Recipient notes',
		name: 'recipientNotes',
		type: 'string',
		default: '',
		description: 'Notes for this recipient: these are global notes that should not be task- or destination-specific.',
	},
	{
		displayName: 'Skip recipient SMS notifications',
		name: 'recipientSkipSMSNotifications',
		type: 'boolean',
		default: false,
		description: 'Whether this recipient has requested to skip SMS notifications.',
	},
	{
		displayName: 'Skip recipient phone number validation',
		name: 'recipientSkipPhoneNumberValidation',
		type: 'boolean',
		default: false,
		description: 'Whether to skip validation for this recipient\'s phone number.',
	},
];

const recipientName = {
	displayName: 'Recipient name',
	name: 'recipientName',
	type: 'string',
	description: 'The recipient\'s complete name.',
} as INodeProperties;

const recipientPhone = {
	displayName: 'Recipient phone',
	name: 'recipientPhone',
	type: 'string',
	description: 'A unique, valid phone number as per the organization\'s country if there\'s no leading + sign. If a phone number has a leading + sign, it will disregard the organization\'s country setting.',
} as INodeProperties;

const additionalRecipientFieldsUpdate = [
	recipientName,
	recipientPhone,
	{
		displayName: 'Recipient notes',
		name: 'notes',
		type: 'string',
		default: '',
		description: 'Notes for this recipient: these are global notes that should not be task- or destination-specific.',
	},
	{
		displayName: 'Skip recipient SMS notifications',
		name: 'skipSMSNotifications',
		type: 'boolean',
		default: false,
		description: 'Whether this recipient has requested to skip SMS notifications.',
	},
	{
		displayName: 'Skip recipient phone number validation',
		name: 'skipPhoneNumberValidation',
		type: 'boolean',
		default: false,
		description: 'Whether to skip validation for this recipient\'s phone number.',
	},
];

export const recipientFields = [
	{
		displayName: 'Get by',
		name: 'getBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: [ 'recipients' ],
				operation: [ 'get' ],
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
		description: 'The variable that is used for looking up a recipient.',
		required: true,
		default: 'id',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'recipients' ],
				operation: [ 'get' ],
				getBy: [ 'id' ],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the recipient object for lookup.',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'recipients' ],
				operation: [ 'update' ],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the recipient object for lookup.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'recipients' ],
				operation: [ 'get' ],
				getBy: [ 'name' ],
			},
		},
		default: '',
		required: true,
		description: 'The name of the recipient for lookup.',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'recipients' ],
				operation: [ 'get' ],
				getBy: [ 'phone' ],
			},
		},
		default: '',
		required: true,
		description: 'The phone of the recipient for lookup.',
	},
	{
		displayName: 'Recipient',
		name: 'recipient',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [ 'tasks' ],
				operation: [
					'create',
					'createBatch',
				],
			},
		},
		description: 'Whether the task has a recipient associated.',
		required: true,
		default: true,
	},
	{
		displayOptions: {
			show: {
				resource: [ 'tasks' ],
				operation: [
					'create',
					'createBatch',
				],
				recipient: [ true ],
			},
		},
		...recipientName,
		required: true,
	},
	{
		displayOptions: {
			show: {
				resource: [ 'recipients' ],
				operation: [ 'create' ],
			},
		},
		...recipientName,
		required: true,
	},
	{
		displayOptions: {
			show: {
				resource: [ 'tasks' ],
				operation: [
					'create',
					'createBatch',
				],
				recipient: [ true ],
			},
		},
		...recipientPhone,
		required: true,
	},
	{
		displayOptions: {
			show: {
				resource: [ 'recipients' ],
				operation: ['create' ],
			},
		},
		...recipientPhone,
		required: true,
	},
	{
		displayName: 'Additional recipient fields',
		name: 'additionalRecipientFields',
		type: 'collection',
		placeholder: 'Add recipient fields',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'recipients' ],
				operation: [ 'create' ],
			},
		},
		options: additionalRecipientFields,
	},
	{
		displayName: 'Additional recipient fields',
		name: 'additionalRecipientFields',
		type: 'collection',
		placeholder: 'Add recipient fields',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'tasks' ],
				operation: [
					'create',
					'createBatch',
				],
				recipient: [ true ],
			},
		},
		options: additionalRecipientFields,
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'recipients' ],
				operation: [ 'update' ],
			},
		},
		options: additionalRecipientFieldsUpdate,
	},
] as INodeProperties[];
