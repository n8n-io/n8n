import type { INodeProperties } from 'n8n-workflow';

export const profileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['profile'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a profile',
				action: 'Create a profile',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a profile',
				action: 'Get a profile',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a profile',
				action: 'Update a profile',
			},
		],
		default: 'create',
	},
];

export const profileFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 profile:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['profile'],
			},
		},
		description:
			'The LinkedIn profile URL or email ID for creating a Humantic profile. If you are sending the resume, this should be a unique string.',
	},
	{
		displayName: 'Send Resume',
		name: 'sendResume',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['profile'],
			},
		},
		description: 'Whether to send a resume for a resume based analysis',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['profile'],
				sendResume: [true],
			},
		},
		description: 'The resume in PDF or DOCX format',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 profile:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['profile'],
			},
		},
		description:
			'This value is the same as the User ID that was provided when the analysis was created. This could be a LinkedIn URL, email ID, or a unique string in case of resume based analysis.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['profile'],
			},
		},
		options: [
			{
				displayName: 'Persona',
				name: 'persona',
				type: 'multiOptions',
				options: [
					{
						name: 'Sales',
						value: 'sales',
					},
					{
						name: 'Hiring',
						value: 'hiring',
					},
				],
				default: [],
				description:
					'Fetch the Humantic profile of the user for a particular persona type. Multiple persona values can be supported using comma as a delimiter.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 profile:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['profile'],
			},
		},
		description:
			'This value is the same as the User ID that was provided when the analysis was created. Currently only supported for profiles created using LinkedIn URL.',
	},
	{
		displayName: 'Send Resume',
		name: 'sendResume',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['profile'],
			},
		},
		description: 'Whether to send a resume for a resume of the user',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['profile'],
				sendResume: [false],
			},
		},
		description: 'Additional text written by the user',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['profile'],
				sendResume: [true],
			},
		},
		description: 'The resume in PDF or DOCX format',
	},
];
