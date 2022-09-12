import { INodeProperties } from 'n8n-workflow';

export const storyManagementOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
			},
		},
		options: [
			// {
			// 	name: 'Create',
			// 	value: 'create',
			// 	description: 'Create a story',
			// },
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a story',
				action: 'Delete a story',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a story',
				action: 'Get a story',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all stories',
				action: 'Get many stories',
			},
			{
				name: 'Publish',
				value: 'publish',
				description: 'Publish a story',
				action: 'Publish a story',
			},
			{
				name: 'Unpublish',
				value: 'unpublish',
				description: 'Unpublish a story',
				action: 'Unpublish a story',
			},
		],
		default: 'get',
	},
];

export const storyManagementFields: INodeProperties[] = [
	// /* -------------------------------------------------------------------------- */
	// /*                                story:create                                */
	// /* -------------------------------------------------------------------------- */
	// {
	// 	displayName: 'Space ID',
	// 	name: 'space',
	// 	type: 'options',
	// 	typeOptions: {
	// 		loadOptionsMethod: 'getSpaces',
	// 	},
	// 	default: '',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			source: [
	// 				'managementApi',
	// 			],
	// 			resource: [
	// 				'story',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	description: 'The name of the space.',
	// },
	// {
	// 	displayName: 'Name',
	// 	name: 'name',
	// 	type: 'string',
	// 	default: '',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			source: [
	// 				'managementApi',
	// 			],
	// 			resource: [
	// 				'story',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	description: 'The name you give this story.',
	// },
	// {
	// 	displayName: 'Slug',
	// 	name: 'slug',
	// 	type: 'string',
	// 	default: '',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			source: [
	// 				'managementApi',
	// 			],
	// 			resource: [
	// 				'story',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	description: 'The slug/path you give this story.',
	// },
	// {
	// 	displayName: 'JSON Parameters',
	// 	name: 'jsonParameters',
	// 	type: 'boolean',
	// 	default: false,
	// 	description: '',
	// 	displayOptions: {
	// 		show: {
	// 			source: [
	// 				'managementApi',
	// 			],
	// 			resource: [
	// 				'story',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// },
	// {
	// 	displayName: 'Additional Fields',
	// 	name: 'additionalFields',
	// 	type: 'collection',
	// 	placeholder: 'Add Field',
	// 	displayOptions: {
	// 		show: {
	// 			source: [
	// 				'managementApi',
	// 			],
	// 			resource: [
	// 				'story',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	default: {},
	// 	options: [
	// 		{
	// 			displayName: 'Content',
	// 			name: 'contentUi',
	// 			type: 'fixedCollection',
	// 			description: 'Add Content',
	// 			typeOptions: {
	// 				multipleValues: false,
	// 			},
	// 			displayOptions: {
	// 				show: {
	// 					'/jsonParameters': [
	// 						false,
	// 					],
	// 				},
	// 			},
	// 			placeholder: 'Add Content',
	// 			default: '',
	// 			options: [
	// 				{
	// 					displayName: 'Content Data',
	// 					name: 'contentValue',
	// 					values: [
	// 						{
	// 							displayName: 'Component',
	// 							name: 'component',
	// 							type: 'options',
	// 							typeOptions: {
	// 								loadOptionsMethod: 'getComponents',
	// 								loadOptionsDependsOn: [
	// 									'space',
	// 								],
	// 							},
	// 							default: '',
	// 						},
	// 						{
	// 							displayName: 'Elements',
	// 							name: 'elementUi',
	// 							type: 'fixedCollection',
	// 							description: 'Add Body',
	// 							typeOptions: {
	// 								multipleValues: true,
	// 							},
	// 							placeholder: 'Add Element',
	// 							default: '',
	// 							options: [
	// 								{
	// 									displayName: 'Element',
	// 									name: 'elementValues',
	// 									values: [
	// 										{
	// 											displayName: 'Component',
	// 											name: 'component',
	// 											type: 'options',
	// 											typeOptions: {
	// 												loadOptionsMethod: 'getComponents',
	// 												loadOptionsDependsOn: [
	// 													'space',
	// 												],
	// 											},
	// 											default: '',
	// 										},
	// 										{
	// 											displayName: 'Element Data',
	// 											name: 'dataUi',
	// 											type: 'fixedCollection',
	// 											description: 'Add Data',
	// 											typeOptions: {
	// 												multipleValues: true,
	// 											},
	// 											placeholder: 'Add Data',
	// 											default: '',
	// 											options: [
	// 												{
	// 													displayName: 'Data',
	// 													name: 'dataValues',
	// 													values: [
	// 														{
	// 															displayName: 'Key',
	// 															name: 'key',
	// 															type: 'string',
	// 															default: '',
	// 														},
	// 														{
	// 															displayName: 'Value',
	// 															name: 'value',
	// 															type: 'string',
	// 															default: '',
	// 														},
	// 													],
	// 												},
	// 											],
	// 										},
	// 									],
	// 								},
	// 							],
	// 						},
	// 					],
	// 				},
	// 			],
	// 		},
	// 		{
	// 			displayName: 'Content (JSON)',
	// 			name: 'contentJson',
	// 			type: 'string',
	// 			displayOptions: {
	// 				show: {
	// 					'/jsonParameters': [
	// 						true,
	// 					],
	// 				},
	// 			},
	// 			default: '',
	// 		},
	// 		{
	// 			displayName: 'Parent ID',
	// 			name: 'parentId',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'Parent story/folder numeric ID.',
	// 		},
	// 		{
	// 			displayName: 'Path',
	// 			name: 'path',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'Given real path, used in the preview editor.',
	// 		},
	// 		{
	// 			displayName: 'Is Startpage',
	// 			name: 'isStartpage',
	// 			type: 'boolean',
	// 			default: false,
	// 			description: 'Is startpage of current folder.',
	// 		},
	// 		{
	// 			displayName: 'First Published At',
	// 			name: 'firstPublishedAt',
	// 			type: 'dateTime',
	// 			default: '',
	// 			description: 'First publishing date.',
	// 		},
	// 	],
	// },

	/* -------------------------------------------------------------------------- */
	/*                                story:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Space Name or ID',
		name: 'space',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
				operation: ['delete'],
			},
		},
		description:
			'The name of the space. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Story ID',
		name: 'storyId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
				operation: ['delete'],
			},
		},
		description: 'Numeric ID of the story',
	},

	/* -------------------------------------------------------------------------- */
	/*                                story:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Space Name or ID',
		name: 'space',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
				operation: ['get'],
			},
		},
		description:
			'The name of the space. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Story ID',
		name: 'storyId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
				operation: ['get'],
			},
		},
		description: 'Numeric ID of the story',
	},

	/* -------------------------------------------------------------------------- */
	/*                                story:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Space Name or ID',
		name: 'space',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
				operation: ['getAll'],
			},
		},
		description:
			'The name of the space. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
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
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Starts With',
				name: 'starts_with',
				type: 'string',
				default: '',
				description: 'Filter by slug',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                story:publish                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Space Name or ID',
		name: 'space',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
				operation: ['publish'],
			},
		},
		description:
			'The name of the space. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Story ID',
		name: 'storyId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
				operation: ['publish'],
			},
		},
		description: 'Numeric ID of the story',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
				operation: ['publish'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Release ID',
				name: 'releaseId',
				type: 'string',
				default: '',
				description: 'Numeric ID of release',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				description:
					'Language code to publish the story individually (must be enabled in the space settings)',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                story:unpublish                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Space Name or ID',
		name: 'space',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
				operation: ['unpublish'],
			},
		},
		description:
			'The name of the space. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Story ID',
		name: 'storyId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['managementApi'],
				resource: ['story'],
				operation: ['unpublish'],
			},
		},
		description: 'Numeric ID of the story',
	},
];
