import { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new contact',
				action: 'Create a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many contacts',
				action: 'Get many contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update contact properties',
				action: 'Update a contact',
			},
		],
		default: 'get',
	},
];

export const contactFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                contact:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		default: '',
	},
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'customFieldValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'customFieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								description:
									'The end user specified key of the user defined data. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								description: 'The end user specified value of the user defined data',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Day Of Cycle',
				name: 'dayOfCycle',
				type: 'string',
				description:
					'The day on which the contact is in the Autoresponder cycle. null indicates the contacts is not in the cycle.',
				default: '',
			},
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				description: "The contact's IP address. IPv4 and IPv6 formats are accepted.",
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Scoring',
				name: 'scoring',
				type: 'number',
				default: '',
				description: 'Contact scoring, pass null to remove the score from a contact',
				typeOptions: {
					minValue: 0,
				},
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  contact:delete                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'ID of contact to delete',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['delete'],
			},
		},
		options: [
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				description:
					'This makes it possible to pass the IP from which the contact unsubscribed. Used only if the messageId was send.',
				default: '',
			},
			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'string',
				description:
					'The ID of a message (such as a newsletter, an autoresponder, or an RSS-newsletter). When passed, this method will simulate the unsubscribe process, as if the contact clicked the unsubscribe link in a given message.',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  contact:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular contact',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				description:
					'List of fields that should be returned. ID is always returned. Fields should be separated by comma',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  contact:getAll                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		description: 'Max number of results to return',
		default: 20,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Campaign ID',
				name: 'campaignId',
				type: 'string',
				description: 'Search contacts by campaign ID',
				default: '',
			},
			{
				displayName: 'Change On From',
				name: 'changeOnFrom',
				type: 'dateTime',
				default: '',
				description: 'Search contacts edited from this date',
			},
			{
				displayName: 'Change On To',
				name: 'changeOnTo',
				type: 'dateTime',
				default: '',
				description: 'Search contacts edited to this date',
			},
			{
				displayName: 'Created On From',
				name: 'createdOnFrom',
				type: 'dateTime',
				default: '',
				description: 'Count data from this date',
			},
			{
				displayName: 'Created On To',
				name: 'createdOnTo',
				type: 'dateTime',
				default: '',
				description: 'Count data from this date',
			},
			{
				displayName: 'Exact Match',
				name: 'exactMatch',
				type: 'boolean',
				default: false,
				description:
					"Whether to search for contacts with the exact value of the email and name provided in the query string. Without this flag, matching is done via a standard 'like' comparison, which may sometimes be slow.",
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				description:
					'List of fields that should be returned. ID is always returned. Fields should be separated by comma',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				description: 'Search contacts by name',
				default: '',
			},
			{
				displayName: 'Origin',
				name: 'origin',
				type: 'options',
				options: [
					{
						name: 'API',
						value: 'api',
					},
					{
						name: 'Copy',
						value: 'copy',
					},
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Forward',
						value: 'forward',
					},
					{
						name: 'Import',
						value: 'import',
					},
					{
						name: 'Iphone',
						value: 'iphone',
					},
					{
						name: 'Landing Page',
						value: 'landing_page',
					},
					{
						name: 'Leads',
						value: 'leads',
					},
					{
						name: 'Panel',
						value: 'panel',
					},
					{
						name: 'Sale',
						value: 'sale',
					},
					{
						name: 'Survey',
						value: 'survey',
					},
					{
						name: 'Webinar',
						value: 'webinar',
					},
					{
						name: 'WWW',
						value: 'www',
					},
				],
				description: 'Search contacts by origin',
				default: '',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				options: [
					{
						name: 'Campaign ID',
						value: 'campaignId',
					},
					{
						name: 'Changed On',
						value: 'changedOn',
					},
					{
						name: 'Created On',
						value: 'createdOn',
					},
					{
						name: 'Email',
						value: 'email',
					},
				],
				default: '',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'ASC',
					},
					{
						name: 'DESC',
						value: 'DESC',
					},
				],
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular contact',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Campaign Name or ID',
				name: 'campaignId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCampaigns',
				},
				default: '',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'customFieldValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'customFieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								description:
									'The end user specified key of the user defined data. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								description: 'The end user specified value of the user defined data',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Day Of Cycle',
				name: 'dayOfCycle',
				type: 'string',
				description:
					'The day on which the contact is in the Autoresponder cycle. null indicates the contacts is not in the cycle.',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				description: "The contact's IP address. IPv4 and IPv6 formats are accepted.",
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Scoring',
				name: 'scoring',
				type: 'number',
				default: '',
				description: 'Contact scoring, pass null to remove the score from a contact',
				typeOptions: {
					minValue: 0,
				},
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
		],
	},
];
