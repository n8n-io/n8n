import { INodeProperties } from 'n8n-workflow';

export const subscriberOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['subscriber'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a subscriber to a list',
				action: 'Add a subscriber',
			},
			{
				name: 'Count',
				value: 'count',
				description: 'Count subscribers',
				action: 'Count a subscriber',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a subscriber from a list',
				action: 'Delete a subscriber',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Unsubscribe user from a list',
				action: 'Remove a subscriber',
			},
			{
				name: 'Status',
				value: 'status',
				description: 'Get the status of subscriber',
				action: "Get subscriber's status",
			},
		],
		default: 'add',
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
		placeholder: 'name@email.com',
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['add'],
			},
		},
		default: '',
		description: 'Email address of the subscriber',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['add'],
			},
		},
		default: '',
		description:
			'The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['add'],
			},
		},
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: "User's 2 letter country code",
			},
			{
				displayName: 'GDPR',
				name: 'gdpr',
				type: 'boolean',
				default: false,
				description: "Whether you're signing up EU users in a GDPR compliant manner",
			},
			{
				displayName: 'Honeypot',
				name: 'hp',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					"Include this 'honeypot' field to prevent spambots from signing up via this API call. When spambots fills in this field, this API call will exit, preventing them from signing up fake addresses to your form. This parameter is only supported in Sendy 3.0 onwards.",
			},
			{
				displayName: 'IP Address',
				name: 'ipaddress',
				type: 'string',
				default: '',
				description: "User's IP address",
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: "User's name",
			},
			{
				displayName: 'Referrer',
				name: 'referrer',
				type: 'string',
				default: '',
				description: 'The URL where the user signed up from',
			},
			{
				displayName: 'Silent',
				name: 'silent',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					"Set to \"true\" if your list is 'Double opt-in' but you want to bypass that and signup the user to the list as 'Single Opt-in instead' (optional)",
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
				resource: ['subscriber'],
				operation: ['count'],
			},
		},
		default: '',
		description:
			'The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                subscriber:delete                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'Email address of the subscriber',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['delete'],
			},
		},
		default: '',
		description:
			'The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                subscriber:remove                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['remove'],
			},
		},
		default: '',
		description: 'Email address of the subscriber',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['remove'],
			},
		},
		default: '',
		description:
			'The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                subscriber:status                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['status'],
			},
		},
		default: '',
		description: 'Email address of the subscriber',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['status'],
			},
		},
		default: '',
		description:
			'The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.',
	},
];
