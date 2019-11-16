import { INodeProperties } from "n8n-workflow";

export const leadOpeations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new lead',
			},
		],
		default: '',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const leadFields = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		required: true,
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
		description: 'The email of the user.',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'lead'
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'lead'
				],
			},
		},
		options: [
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				required: false,
				description: 'The phone number of the user',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: '',
				description: 'Name of the user',
			},
			{
				displayName: 'Unsubscribed From Emails',
				name: 'unsubscribedFromEmails',
				type: 'boolean',
				default: '',
				placeholder: '',
				description: 'Whether the Lead is unsubscribed from emails',
			},
			{
				displayName: 'Update Last Request At',
				name: 'updateLastRequestAt',
				type: 'boolean',
				default: false,
				options: [],
				required: false,
				description: `A boolean value, which if true, instructs Intercom to update the users' last_request_at value to the current API service time in UTC. default value if not sent is false.`,
			},
			{
				displayName: 'Companies',
				name: 'companies',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: [],
				required: false,
				description: 'Identifies the companies this user belongs to.',
			},
		]
	},
	{
		displayName: 'Custom Attributes',
		name: 'customAttributes',
		type: 'fixedCollection',
		default: '',
		placeholder: 'Add Attribute',
		typeOptions: {
			multipleValues: true,
		},
		required: false,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				name: 'customAttributesValues',
				displayName: 'Attributes',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			}
		],
		description: 'A hash of key/value pairs to represent custom data you want to attribute to a user.',
	},
] as INodeProperties[];

