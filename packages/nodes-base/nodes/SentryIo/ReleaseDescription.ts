import { INodeProperties } from 'n8n-workflow';

export const releaseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['release'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a release',
				action: 'Create a release',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a release',
				action: 'Delete a release',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get release by version identifier',
				action: 'Get a release by version ID',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many releases',
				action: 'Get many releases',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a release',
				action: 'Update a release',
			},
		],
		default: 'get',
	},
];

export const releaseFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                release:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug Name or ID',
		name: 'organizationSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOrganizations',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['getAll'],
			},
		},
		required: true,
		description:
			'The slug of the organization the releases belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['release'],
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
				operation: ['getAll'],
				resource: ['release'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'This parameter can be used to create a “starts with” filter for the version',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                release:get/delete                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug Name or ID',
		name: 'organizationSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOrganizations',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['get', 'delete'],
			},
		},
		required: true,
		description:
			'The slug of the organization the release belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Version',
		name: 'version',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['get', 'delete'],
			},
		},
		required: true,
		description: 'The version identifier of the release',
	},

	/* -------------------------------------------------------------------------- */
	/*                                release:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug Name or ID',
		name: 'organizationSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOrganizations',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['create'],
			},
		},
		required: true,
		description:
			'The slug of the organization the release belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Version',
		name: 'version',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['create'],
			},
		},
		required: true,
		description:
			'A version identifier for this release. Can be a version number, a commit hash etc.',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['create'],
			},
		},
		required: true,
		description:
			'A URL that points to the release. This can be the path to an online interface to the sourcecode for instance.',
	},
	{
		displayName: 'Project Names or IDs',
		name: 'projects',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		default: [],
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['create'],
			},
		},
		required: true,
		description:
			'A list of project slugs that are involved in this release. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Date Released',
				name: 'dateReleased',
				type: 'dateTime',
				default: '',
				description:
					'An optional date that indicates when the release went live. If not provided the current time is assumed.',
			},
			{
				displayName: 'Commits',
				name: 'commits',
				description: 'An optional list of commit data to be associated with the release',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'commitProperties',
						displayName: 'Commit Properties',
						values: [
							{
								displayName: 'ID',
								name: 'id',
								type: 'string',
								default: '',
								description: 'The sha of the commit',
								required: true,
							},
							{
								displayName: 'Author Email',
								name: 'authorEmail',
								type: 'string',
								default: '',
								description: 'Authors email',
							},
							{
								displayName: 'Author Name',
								name: 'authorName',
								type: 'string',
								default: '',
								description: 'Name of author',
							},
							{
								displayName: 'Message',
								name: 'message',
								type: 'string',
								default: '',
								description: 'Message of commit',
							},
							{
								displayName: 'Patch Set',
								name: 'patchSet',
								description:
									'A list of the files that have been changed in the commit. Specifying the patch_set is necessary to power suspect commits and suggested assignees.',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								options: [
									{
										name: 'patchSetProperties',
										displayName: 'Patch Set Properties',
										values: [
											{
												displayName: 'Path',
												name: 'path',
												type: 'string',
												default: '',
												description:
													'The path to the file. Both forward and backward slashes are supported.',
												required: true,
											},
											{
												displayName: 'Type',
												name: 'type',
												type: 'options',
												default: '',
												description: 'The types of changes that happend in that commit',
												options: [
													{
														name: 'Add',
														value: 'add',
													},
													{
														name: 'Modify',
														value: 'modify',
													},
													{
														name: 'Delete',
														value: 'delete',
													},
												],
											},
										],
									},
								],
							},
							{
								displayName: 'Repository',
								name: 'repository',
								type: 'string',
								default: '',
								description: 'Repository name',
							},
							{
								displayName: 'Timestamp',
								name: 'timestamp',
								type: 'dateTime',
								default: '',
								description: 'Timestamp of commit',
							},
						],
					},
				],
			},
			{
				displayName: 'Refs',
				name: 'refs',
				description:
					'An optional way to indicate the start and end commits for each repository included in a release',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'refProperties',
						displayName: 'Ref Properties',
						values: [
							{
								displayName: 'Commit',
								name: 'commit',
								type: 'string',
								default: '',
								description: 'The head sha of the commit',
								required: true,
							},
							{
								displayName: 'Repository',
								name: 'repository',
								type: 'string',
								default: '',
								description: 'Repository name',
								required: true,
							},
							{
								displayName: 'Previous Commit',
								name: 'previousCommit',
								type: 'string',
								default: '',
								description: 'The sha of the HEAD of the previous release',
							},
						],
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                release:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug Name or ID',
		name: 'organizationSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOrganizations',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['update'],
			},
		},
		required: true,
		description:
			'The slug of the organization the release belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Version',
		name: 'version',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['update'],
			},
		},
		required: true,
		description:
			'A version identifier for this release. Can be a version number, a commit hash etc.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Commits',
				name: 'commits',
				description: 'An optional list of commit data to be associated with the release',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'commitProperties',
						displayName: 'Commit Properties',
						values: [
							{
								displayName: 'ID',
								name: 'id',
								type: 'string',
								default: '',
								description: 'The sha of the commit',
								required: true,
							},
							{
								displayName: 'Author Email',
								name: 'authorEmail',
								type: 'string',
								default: '',
								description: 'Authors email',
							},
							{
								displayName: 'Author Name',
								name: 'authorName',
								type: 'string',
								default: '',
								description: 'Name of author',
							},
							{
								displayName: 'Message',
								name: 'message',
								type: 'string',
								default: '',
								description: 'Message of commit',
							},
							{
								displayName: 'Patch Set',
								name: 'patchSet',
								description:
									'A list of the files that have been changed in the commit. Specifying the patch_set is necessary to power suspect commits and suggested assignees.',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								options: [
									{
										name: 'patchSetProperties',
										displayName: 'Patch Set Properties',
										values: [
											{
												displayName: 'Path',
												name: 'path',
												type: 'string',
												default: '',
												description:
													'The path to the file. Both forward and backward slashes are supported.',
												required: true,
											},
											{
												displayName: 'Type',
												name: 'type',
												type: 'options',
												default: '',
												description: 'The types of changes that happend in that commit',
												options: [
													{
														name: 'Add',
														value: 'add',
													},
													{
														name: 'Modify',
														value: 'modify',
													},
													{
														name: 'Delete',
														value: 'delete',
													},
												],
											},
										],
									},
								],
							},
							{
								displayName: 'Repository',
								name: 'repository',
								type: 'string',
								default: '',
								description: 'Repository name',
							},
							{
								displayName: 'Timestamp',
								name: 'timestamp',
								type: 'dateTime',
								default: '',
								description: 'Timestamp of commit',
							},
						],
					},
				],
			},
			{
				displayName: 'Date Released',
				name: 'dateReleased',
				type: 'dateTime',
				default: '',
				description:
					'An optional date that indicates when the release went live. If not provided the current time is assumed.',
			},
			{
				displayName: 'Ref',
				name: 'ref',
				type: 'string',
				default: '',
				description:
					'A URL that points to the release. This can be the path to an online interface to the sourcecode for instance.',
			},
			{
				displayName: 'Refs',
				name: 'refs',
				description:
					'An optional way to indicate the start and end commits for each repository included in a release',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'refProperties',
						displayName: 'Ref Properties',
						values: [
							{
								displayName: 'Commit',
								name: 'commit',
								type: 'string',
								default: '',
								description: 'The head sha of the commit',
								required: true,
							},
							{
								displayName: 'Repository',
								name: 'repository',
								type: 'string',
								default: '',
								description: 'Repository name',
								required: true,
							},
							{
								displayName: 'Previous Commit',
								name: 'previousCommit',
								type: 'string',
								default: '',
								description: 'The sha of the HEAD of the previous release',
							},
						],
					},
				],
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description:
					'A URL that points to the release. This can be the path to an online interface to the sourcecode for instance.',
			},
		],
	},
];
