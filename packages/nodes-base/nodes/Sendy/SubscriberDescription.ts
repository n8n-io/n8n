import {
	INodeProperties,
} from 'n8n-workflow';

export const subscriberOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a subscriber to a list',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Count subscribers',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a subscriber from a list',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Unsubscribe user from a list',
			},
			{
				name: 'Status',
				value: 'status',
				description: 'Get the status of subscriber',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
];

export const subscriberFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                subscriber:add                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
		description: 'Email address of the subscriber.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
		description: `The list id you want to subscribe a user to. This encrypted & hashed id can be found under View all lists section named ID.`,
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
					'subscriber',
				],
				operation: [
					'add',
				],
			},
		},
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: `User's 2 letter country code`,
			},
			{
				displayName: 'GDPR',
				name: 'gdpr',
				type: 'boolean',
				default: false,
				description: `If you're signing up EU users in a GDPR compliant manner, set this to "true"`,
			},
			{
				displayName: 'Honeypot',
				name: 'hp',
				type: 'boolean',
				default: false,
				description: `Include this 'honeypot' field to prevent spambots from signing up via this API call. When spambots fills in this field, this API call will exit, preventing them from signing up fake addresses to your form. This parameter is only supported in Sendy 3.0 onwards.`,
			},
			{
				displayName: 'IP Address',
				name: 'ipaddress',
				type: 'string',
				default: '',
				description: `User's IP address`,
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: `User's name`,
			},
			{
				displayName: 'Referrer',
				name: 'referrer',
				type: 'string',
				default: '',
				description: `The URL where the user signed up from`,
			},
			{
				displayName: 'Silent',
				name: 'silent',
				type: 'boolean',
				default: false,
				description: `Set to "true" if your list is 'Double opt-in' but you want to bypass that and signup the user to the list as 'Single Opt-in instead' (optional)`,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                subscriber:count                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'count',
				],
			},
		},
		default: '',
		description: `The list id you want to subscribe a user to. This encrypted & hashed id can be found under View all lists section named ID.`,
	},
/* -------------------------------------------------------------------------- */
/*                                subscriber:delete                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'Email address of the subscriber.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: `The list id you want to subscribe a user to. This encrypted & hashed id can be found under View all lists section named ID.`,
	},
/* -------------------------------------------------------------------------- */
/*                                subscriber:remove                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'remove',
				],
			},
		},
		default: '',
		description: 'Email address of the subscriber.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'remove',
				],
			},
		},
		default: '',
		description: `The list id you want to subscribe a user to. This encrypted & hashed id can be found under View all lists section named ID.`,
	},
/* -------------------------------------------------------------------------- */
/*                                subscriber:status                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'status',
				],
			},
		},
		default: '',
		description: 'Email address of the subscriber.',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'status',
				],
			},
		},
		default: '',
		description: `The list id you want to subscribe a user to. This encrypted & hashed id can be found under View all lists section named ID.`,
	},
];
