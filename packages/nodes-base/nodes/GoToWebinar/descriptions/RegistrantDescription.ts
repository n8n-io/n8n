import type { INodeProperties } from 'n8n-workflow';

export const registrantOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a registrant',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a registrant',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a registrant',
			},
			{
				name: 'Get many',
				value: 'getAll',
				action: 'Get many registrants',
			},
		],
		displayOptions: {
			show: {
				resource: ['registrant'],
			},
		},
	},
];

export const registrantFields: INodeProperties[] = [
	// ----------------------------------
	//         registrant: create
	// ----------------------------------
	{
		displayName: 'Webinar key name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'Key of the webinar of the registrant to create. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'First name',
		name: 'firstName',
		type: 'string',
		default: '',
		description: 'First name of the registrant to create',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Last name',
		name: 'lastName',
		type: 'string',
		default: '',
		description: 'Last name of the registrant to create',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Email address of the registrant to create',
		displayOptions: {
			show: {
				resource: ['registrant'],
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
				resource: ['registrant'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Full address',
				name: 'fullAddress',
				placeholder: 'Add address fields',
				type: 'fixedCollection',
				description: 'Full address of the registrant to create',
				default: {},
				options: [
					{
						displayName: 'Details',
						name: 'details',
						values: [
							{
								displayName: 'Address',
								name: 'address',
								type: 'string',
								default: '',
							},
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
							},
							{
								displayName: 'State',
								name: 'state',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Zip code',
								name: 'zipCode',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country',
								name: 'country',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'string',
				default: '',
				description: "The type of industry the registrant's organization belongs to",
			},
			{
				displayName: 'Job title',
				name: 'jobTitle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'MultiChoice responses',
				name: 'multiChoiceResponses',
				placeholder: 'Add MultiChoice response',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Set the answers to all questions',
				default: {},
				options: [
					{
						displayName: 'Details',
						name: 'details',
						values: [
							{
								displayName: 'Question key name or ID',
								name: 'questionKey',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'getRegistranMultiChoiceQuestions',
									loadOptionsDependsOn: ['webinarKey'],
								},
								default: '',
							},
							{
								displayName: 'Answer key',
								name: 'AnswerKey',
								type: 'string',
								default: '',
								description: 'Answer ID of the question',
							},
						],
					},
				],
			},
			{
				displayName: 'Number of employees',
				name: 'numberOfEmployees',
				type: 'string',
				default: '',
				description: "The size in employees of the registrant's organization",
			},
			{
				displayName: 'Organization',
				name: 'organization',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Telephone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Purchasing role',
				name: 'purchasingRole',
				type: 'string',
				default: '',
				description: "Registrant's role in purchasing the product",
			},
			{
				displayName: 'Purchasing time frame',
				name: 'purchasingTimeFrame',
				type: 'string',
				default: '',
				description: 'Time frame within which the product will be purchased',
			},
			{
				displayName: 'Questions and comments',
				name: 'questionsAndComments',
				type: 'string',
				default: '',
				description: 'Questions or comments made by the registrant during registration',
			},
			{
				displayName: 'Resend confirmation',
				name: 'resendConfirmation',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Simple responses',
				name: 'simpleResponses',
				placeholder: 'Add simple response',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Set the answers to all questions',
				default: {},
				options: [
					{
						displayName: 'Details',
						name: 'details',
						values: [
							{
								displayName: 'Question key name or ID',
								name: 'questionKey',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'getRegistranSimpleQuestions',
									loadOptionsDependsOn: ['webinarKey'],
								},
								default: '',
							},
							{
								displayName: 'Response text',
								name: 'responseText',
								type: 'string',
								default: '',
								description: 'Text of the response to the question',
							},
						],
					},
				],
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				description: 'The source that led to the registration',
			},
		],
	},

	// ----------------------------------
	//        registrant: getAll
	// ----------------------------------
	{
		displayName: 'Webinar key name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'The key of the webinar to retrieve registrants from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------
	//         registrant: delete
	// ----------------------------------
	{
		displayName: 'Webinar key name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'Key of the webinar of the registrant to delete. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Registrant key',
		name: 'registrantKey',
		type: 'string',
		required: true,
		default: '',
		description: 'Key of the registrant to delete',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------
	//         registrant: get
	// ----------------------------------
	{
		displayName: 'Webinar key name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'Key of the webinar of the registrant to retrieve. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Registrant key',
		name: 'registrantKey',
		type: 'string',
		required: true,
		default: '',
		description: 'Key of the registrant to retrieve',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['get'],
			},
		},
	},
];
