import {
	INodeProperties,
} from 'n8n-workflow';

export const registrantOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
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
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'registrant',
				],
			},
		},
	},
] as INodeProperties[];

export const registrantFields = [
	// ----------------------------------
	//         registrant: create
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: 'The key of the webinar for which the registrant is created.',
		displayOptions: {
			show: {
				resource: [
					'registrant',
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
		displayOptions: {
			show: {
				resource: [
					'registrant',
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
		displayOptions: {
			show: {
				resource: [
					'registrant',
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
		displayOptions: {
			show: {
				resource: [
					'registrant',
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
					'registrant',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Full Address',
				name: 'fullAddress',
				placeholder: 'Add Address Fields',
				type: 'fixedCollection',
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
				description: 'The type of industry the registrant\'s organization belongs to.',
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Number of Employees',
				name: 'numberOfEmployees',
				type: 'string',
				default: '',
				description: 'The size in employees of the registrant\'s organization.',
			},
			{
				displayName: 'Organization',
				name: 'organization',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Purchasing Role',
				name: 'purchasingRole',
				type: 'string',
				default: '',
				description: 'The registrant\'s role in purchasing the product.',
			},
			{
				displayName: 'Purchasing Time Frame',
				name: 'purchasingTimeFrame',
				type: 'string',
				default: '',
				description: 'The time frame within which the product will be purchased.',
			},
			{
				displayName: 'Questions and Comments',
				name: 'questionsAndComments',
				type: 'string',
				default: '',
				description: 'Any questions or comments the registrant made at the time of registration.',
			},
			{
				displayName: 'Resend Confirmation',
				name: 'resendConfirmation',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Responses',
				name: 'responses',
				placeholder: 'Add Response',
				type: 'fixedCollection',
				description: 'Set the answers of all questions.',
				default: {},
				options: [
					{
						displayName: 'Details',
						name: 'details',
						values: [
							{
								displayName: 'Question Key',
								name: 'questionKey',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Response Text',
								name: 'responseText',
								type: 'string',
								default: '',
								description: 'Text of the response to the question.',
							},
							{
								displayName: 'Answer Key',
								name: 'answerKey',
								type: 'string',
								default: '',
								description: 'The numeric key of the answer to a multiple-choice question.',
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
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: 'The key of the webinar to retrieve registrants from.',
		displayOptions: {
			show: {
				resource: [
					'registrant',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	// ----------------------------------
	//         registrant: delete
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: 'The key of the webinar whose registrant to delete.',
		displayOptions: {
			show: {
				resource: [
					'registrant',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Registrant Key',
		name: 'registrantKey',
		type: 'string',
		required: true,
		default: '',
		description: 'The key of the registrant to delete.',
		displayOptions: {
			show: {
				resource: [
					'registrant',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	// ----------------------------------
	//         registrant: get
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: 'The key of the webinar whose registrant to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'registrant',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Registrant Key',
		name: 'registrantKey',
		type: 'string',
		required: true,
		default: '',
		description: 'The key of the registrant to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'registrant',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];
