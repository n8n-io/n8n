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
				name: 'Get Many',
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
		displayName: 'Webinar Key Name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'Key of the webinar of the registrant to create. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'First Name',
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
		displayName: 'Last Name',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Full Address',
				name: 'fullAddress',
				placeholder: 'Add Address Fields',
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
								displayName: 'Zip Code',
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
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'MultiChoice Responses',
				name: 'multiChoiceResponses',
				placeholder: 'Add MultiChoice Response',
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
								displayName: 'Question Key Name or ID',
								name: 'questionKey',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'getRegistranMultiChoiceQuestions',
									loadOptionsDependsOn: ['webinarKey'],
								},
								default: '',
							},
							{
								displayName: 'Answer Key',
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
				displayName: 'Number of Employees',
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
				displayName: 'Purchasing Role',
				name: 'purchasingRole',
				type: 'string',
				default: '',
				description: "Registrant's role in purchasing the product",
			},
			{
				displayName: 'Purchasing Time Frame',
				name: 'purchasingTimeFrame',
				type: 'string',
				default: '',
				description: 'Time frame within which the product will be purchased',
			},
			{
				displayName: 'Questions and Comments',
				name: 'questionsAndComments',
				type: 'string',
				default: '',
				description: 'Questions or comments made by the registrant during registration',
			},
			{
				displayName: 'Resend Confirmation',
				name: 'resendConfirmation',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Simple Responses',
				name: 'simpleResponses',
				placeholder: 'Add Simple Response',
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
								displayName: 'Question Key Name or ID',
								name: 'questionKey',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'getRegistranSimpleQuestions',
									loadOptionsDependsOn: ['webinarKey'],
								},
								default: '',
							},
							{
								displayName: 'Response Text',
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
		displayName: 'Webinar Key Name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'The key of the webinar to retrieve registrants from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
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
		displayName: 'Webinar Key Name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'Key of the webinar of the registrant to delete. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Registrant Key',
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
		displayName: 'Webinar Key Name or ID',
		name: 'webinarKey',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWebinars',
		},
		required: true,
		default: [],
		description:
			'Key of the webinar of the registrant to retrieve. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['registrant'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Registrant Key',
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
