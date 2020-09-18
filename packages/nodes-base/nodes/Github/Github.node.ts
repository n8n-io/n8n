import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
} from 'n8n-workflow';

import {
	githubApiRequest,
	getFileSha,
} from './GenericFunctions';

export class Github implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GitHub',
		name: 'github',
		icon: 'file:github.png',
		group: ['input'],
		version: 1,
		description: 'Retrieve data from GitHub API.',
		defaults: {
			name: 'GitHub',
			color: '#665533',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'githubApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
			{
				name: 'githubOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Issue',
						value: 'issue',
					},
					{
						name: 'Repository',
						value: 'repository',
					},
					{
						name: 'Release',
						value: 'release',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'issue',
				description: 'The resource to operate on.',
			},



			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'issue',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new issue',
					},
					{
						name: 'Create Comment',
						value: 'createComment',
						description: 'Create a new comment on an issue',
					},
					{
						name: 'Edit',
						value: 'edit',
						description: 'Edit an issue',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get the data of a single issues',
					},
					{
						name: 'Lock',
						value: 'lock',
						description: 'Lock an issue',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'file',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new file in repository',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a file in repository',
					},
					{
						name: 'Edit',
						value: 'edit',
						description: 'Edit a file in repository',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get the data of a single issue',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'repository',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get the data of a single repository',
					},
					{
						name: 'Get License',
						value: 'getLicense',
						description: 'Returns the contents of the repository\'s license file, if one is detected',
					},
					{
						name: 'Get Issues',
						value: 'getIssues',
						description: 'Returns issues of a repository',
					},
					{
						name: 'Get Profile',
						value: 'getProfile',
						description: 'Get the community profile of a repository with metrics, health score, description, license, ...',
					},
					{
						name: 'List Popular Paths',
						value: 'listPopularPaths',
						description: 'Get the top 10 popular content paths over the last 14 days.',
					},
					{
						name: 'List Referrers',
						value: 'listReferrers',
						description: 'Get the top 10 referrering domains over the last 14 days',
					},
				],
				default: 'getIssues',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'user',
						],
					},
				},
				options: [
					{
						name: 'Get Repositories',
						value: 'getRepositories',
						description: 'Returns the repositories of a user',
					},
				],
				default: 'getRepositories',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'release',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Creates a new release',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},



			// ----------------------------------
			//         shared
			// ----------------------------------
			{
				displayName: 'Repository Owner',
				name: 'owner',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'n8n-io',
				description: 'Owner of the repsitory.',
			},
			{
				displayName: 'Repository Name',
				name: 'repository',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					hide: {
						resource: [
							'user',
						],
						operation: [
							'getRepositories',
						],
					},
				},
				placeholder: 'n8n',
				description: 'The name of the repsitory.',
			},



			// ----------------------------------
			//         file
			// ----------------------------------

			// ----------------------------------
			//         file:create/delete/edit/get
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'filePath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'file',
						],
					},
				},
				placeholder: 'docs/README.md',
				description: 'The file path of the file. Has to contain the full path.',
			},

			// ----------------------------------
			//         file:create/edit
			// ----------------------------------
			{
				displayName: 'Binary Data',
				name: 'binaryData',
				type: 'boolean',
				default: false,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
							'edit',
						],
						resource: [
							'file',
						],
					},
				},
				description: 'If the data to upload should be taken from binary field.',
			},
			{
				displayName: 'File Content',
				name: 'fileContent',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						binaryData: [
							false,
						],
						operation: [
							'create',
							'edit',
						],
						resource: [
							'file',
						],
					},

				},
				placeholder: '',
				description: 'The text content of the file.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						binaryData: [
							true,
						],
						operation: [
							'create',
							'edit',
						],
						resource: [
							'file',
						],
					},

				},
				placeholder: '',
				description: 'Name of the binary property which contains<br />the data for the file.',
			},
			{
				displayName: 'Commit Message',
				name: 'commitMessage',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
							'delete',
							'edit',
						],
						resource: [
							'file',
						],
					},
				},
				description: 'The commit message.',
			},
			{
				displayName: 'Additional Parameters',
				name: 'additionalParameters',
				placeholder: 'Add Parameter',
				description: 'Additional fields to add.',
				type: 'fixedCollection',
				default: {},
				displayOptions: {
					show: {
						operation: [
							'create',
							'delete',
							'edit',
						],
						resource: [
							'file',
						],
					},
				},
				options: [
					{
						name: 'author',
						displayName: 'Author',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'The name of the author of the commit.',
							},
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								default: '',
								description: 'The email of the author of the commit.',
							},
						]
					},
					{
						name: 'branch',
						displayName: 'Branch',
						values: [
							{
								displayName: 'Branch',
								name: 'branch',
								type: 'string',
								default: '',
								description: 'The branch to commit to. If not set the repository’s default branch (usually master) is used.',
							},
						]
					},
					{
						name: 'committer',
						displayName: 'Committer',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'The name of the committer of the commit.',
							},
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								default: '',
								description: 'The email of the committer of the commit.',
							},
						]
					},
				],
			},

			// ----------------------------------
			//         file:get
			// ----------------------------------
			{
				displayName: 'As Binary Property',
				name: 'asBinaryProperty',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'file',
						],
					},
				},
				description: 'If set it will set the data of the file as binary property<br />instead of returning the raw API response.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						asBinaryProperty: [
							true,
						],
						operation: [
							'get',
						],
						resource: [
							'file',
						],
					},

				},
				placeholder: '',
				description: 'Name of the binary property in which to save<br />the binary data of the received file.',
			},



			// ----------------------------------
			//         issue
			// ----------------------------------

			// ----------------------------------
			//         issue:create
			// ----------------------------------
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'issue',
						],
					},
				},
				description: 'The title of the issue.',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'issue',
						],
					},
				},
				description: 'The body of the issue.',
			},
			{
				displayName: 'Labels',
				name: 'labels',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Label',
				},
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'issue',
						],
					},
				},
				default: { 'label': '' },
				options: [
					{
						displayName: 'Label',
						name: 'label',
						type: 'string',
						default: '',
						description: 'Label to add to issue.',
					},
				],
			},
			{
				displayName: 'Assignees',
				name: 'assignees',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Assignee',
				},
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'issue',
						],
					},
				},
				default: { 'assignee': '' },
				options: [
					{
						displayName: 'Assignee',
						name: 'assignee',
						type: 'string',
						default: '',
						description: 'User to assign issue too.',
					},
				],
			},

			// ----------------------------------
			//         issue:createComment
			// ----------------------------------
			{
				displayName: 'Issue Number',
				name: 'issueNumber',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'createComment',
						],
						resource: [
							'issue',
						],
					},
				},
				description: 'The number of the issue on which to create the comment on.',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				displayOptions: {
					show: {
						operation: [
							'createComment',
						],
						resource: [
							'issue',
						],
					},
				},
				default: '',
				description: 'The body of the comment.',
			},

			// ----------------------------------
			//         issue:edit
			// ----------------------------------
			{
				displayName: 'Issue Number',
				name: 'issueNumber',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'edit',
						],
						resource: [
							'issue',
						],
					},
				},
				description: 'The number of the issue edit.',
			},
			{
				displayName: 'Edit Fields',
				name: 'editFields',
				type: 'collection',
				typeOptions: {
					multipleValueButtonText: 'Add Field',
				},
				displayOptions: {
					show: {
						operation: [
							'edit',
						],
						resource: [
							'issue',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'The title of the issue.',
					},
					{
						displayName: 'Body',
						name: 'body',
						type: 'string',
						typeOptions: {
							rows: 5,
						},
						default: '',
						description: 'The body of the issue.',
					},
					{
						displayName: 'State',
						name: 'state',
						type: 'options',
						options: [
							{
								name: 'Closed',
								value: 'closed',
								description: 'Set the state to "closed"',
							},
							{
								name: 'Open',
								value: 'open',
								description: 'Set the state to "open"',
							},
						],
						default: 'open',
						description: 'The state to set.',
					},
					{
						displayName: 'Labels',
						name: 'labels',
						type: 'collection',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add Label',
						},
						default: { 'label': '' },
						options: [
							{
								displayName: 'Label',
								name: 'label',
								type: 'string',
								default: '',
								description: 'Label to add to issue.',
							},
						],
					},
					{
						displayName: 'Assignees',
						name: 'assignees',
						type: 'collection',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add Assignee',
						},
						default: { 'assignee': '' },
						options: [
							{
								displayName: 'Assignees',
								name: 'assignee',
								type: 'string',
								default: '',
								description: 'User to assign issue too.',
							},
						],
					},
				],
			},

			// ----------------------------------
			//         issue:get
			// ----------------------------------
			{
				displayName: 'Issue Number',
				name: 'issueNumber',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'issue',
						],
					},
				},
				description: 'The number of the issue get data of.',
			},

			// ----------------------------------
			//         issue:lock
			// ----------------------------------
			{
				displayName: 'Issue Number',
				name: 'issueNumber',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'lock',
						],
						resource: [
							'issue',
						],
					},
				},
				description: 'The number of the issue to lock.',
			},
			{
				displayName: 'Lock Reason',
				name: 'lockReason',
				type: 'options',
				displayOptions: {
					show: {
						operation: [
							'lock',
						],
						resource: [
							'issue',
						],
					},
				},
				options: [
					{
						name: 'Off-Topic',
						value: 'off-topic',
						description: 'The issue is Off-Topic',
					},
					{
						name: 'Too Heated',
						value: 'too heated',
						description: 'The discussion is too heated',
					},
					{
						name: 'Resolved',
						value: 'resolved',
						description: 'The issue got resolved',
					},
					{
						name: 'Spam',
						value: 'spam',
						description: 'The issue is spam',
					},
				],
				default: 'resolved',
				description: 'The reason to lock the issue.',
			},



			// ----------------------------------
			//         release
			// ----------------------------------

			// ----------------------------------
			//         release:create
			// ----------------------------------
			{
				displayName: 'Tag',
				name: 'releaseTag',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'release',
						],
					},
				},
				description: 'The tag of the release.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				typeOptions: {
					multipleValueButtonText: 'Add Field',
				},
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'release',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'The name of the issue.',
					},
					{
						displayName: 'Body',
						name: 'body',
						type: 'string',
						typeOptions: {
							rows: 5,
						},
						default: '',
						description: 'The body of the release.',
					},
					{
						displayName: 'Draft',
						name: 'draft',
						type: 'boolean',
						default: false,
						description: 'Set "true" to create a draft (unpublished) release, "false" to create a published one.',
					},
					{
						displayName: 'Prerelease',
						name: 'prerelease',
						type: 'boolean',
						default: false,
						description: 'If set to "true" it will point out that the release is non-production ready.',
					},
					{
						displayName: 'Target Commitish',
						name: 'target_commitish',
						type: 'string',
						default: '',
						description: 'Specifies the commitish value that determines where the Git tag is created from. Can be any branch or commit SHA. Unused if the Git tag already exists. Default: the repository\'s default branch(usually master).',
					},
				],
			},



			// ----------------------------------
			//         repository
			// ----------------------------------

			// ----------------------------------
			//         repository:getIssues
			// ----------------------------------
			{
				displayName: 'Filters',
				name: 'getRepositoryIssuesFilters',
				type: 'collection',
				typeOptions: {
					multipleValueButtonText: 'Add Filter',
				},
				displayOptions: {
					show: {
						operation: [
							'getIssues'
						],
						resource: [
							'repository',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Assignee',
						name: 'assignee',
						type: 'string',
						default: '',
						description: 'Return only issues which are assigned to a specific user.',
					},
					{
						displayName: 'Creator',
						name: 'creator',
						type: 'string',
						default: '',
						description: 'Return only issues which were created by a specific user.',
					},
					{
						displayName: 'Mentioned',
						name: 'mentioned',
						type: 'string',
						default: '',
						description: 'Return only issues in which a specific user was mentioned.',
					},
					{
						displayName: 'Labels',
						name: 'labels',
						type: 'string',
						default: '',
						description: 'Return only issues with the given labels. Multiple lables can be separated by comma.',
					},
					{
						displayName: 'Updated Since',
						name: 'since',
						type: 'dateTime',
						default: '',
						description: 'Return only issues updated at or after this time.',
					},
					{
						displayName: 'State',
						name: 'state',
						type: 'options',
						options: [
							{
								name: 'All',
								value: 'all',
								description: 'Returns issues with any state',
							},
							{
								name: 'Closed',
								value: 'closed',
								description: 'Return issues with "closed" state',
							},
							{
								name: 'Open',
								value: 'open',
								description: 'Return issues with "open" state',
							},
						],
						default: 'open',
						description: 'The state to set.',
					},
					{
						displayName: 'Sort',
						name: 'sort',
						type: 'options',
						options: [
							{
								name: 'Created',
								value: 'created',
								description: 'Sort by created date',
							},
							{
								name: 'Updated',
								value: 'updated',
								description: 'Sort by updated date',
							},
							{
								name: 'Comments',
								value: 'comments',
								description: 'Sort by comments',
							},
						],
						default: 'created',
						description: 'The order the issues should be returned in.',
					},
					{
						displayName: 'Direction',
						name: 'direction',
						type: 'options',
						options: [
							{
								name: 'Ascending',
								value: 'asc',
								description: 'Sort in ascending order',
							},
							{
								name: 'Descending',
								value: 'desc',
								description: 'Sort in descending order',
							},
						],
						default: 'desc',
						description: 'The sort order.',
					},

				],
			},

		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		// Operations which overwrite the returned data
		const overwriteDataOperations = [
			'file:create',
			'file:delete',
			'file:edit',
			'file:get',
			'issue:create',
			'issue:createComment',
			'issue:edit',
			'issue:get',
			'release:create',
			'repository:get',
			'repository:getLicense',
			'repository:getProfile',
		];
		// Operations which overwrite the returned data and return arrays
		// and has so to be merged with the data of other items
		const overwriteDataOperationsArray = [
			'repository:getIssues',
			'repository:listPopularPaths',
			'repository:listReferrers',
			'user:getRepositories',
		];


		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;

		const operation = this.getNodeParameter('operation', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const fullOperation = `${resource}:${operation}`;

		for (let i = 0; i < items.length; i++) {
			// Reset all values
			requestMethod = 'GET';
			endpoint = '';
			body = {};
			qs = {};

			// Request the parameters which almost all operations need
			const owner = this.getNodeParameter('owner', i) as string;
			let repository = '';
			if (fullOperation !== 'user:getRepositories') {
				repository = this.getNodeParameter('repository', i) as string;
			}

			if (resource === 'file') {
				if (['create', 'edit'].includes(operation)) {
					// ----------------------------------
					//         create/edit
					// ----------------------------------

					requestMethod = 'PUT';

					const filePath = this.getNodeParameter('filePath', i) as string;

					const additionalParameters = this.getNodeParameter('additionalParameters', i, {}) as IDataObject;
					if (additionalParameters.author) {
						body.author = additionalParameters.author;
					}
					if (additionalParameters.committer) {
						body.committer = additionalParameters.committer;
					}
					if (additionalParameters.branch && (additionalParameters.branch as IDataObject).branch) {
						body.branch = (additionalParameters.branch as IDataObject).branch;
					}

					if (operation === 'edit') {
						// If the file should be updated the request has to contain the SHA
						// of the file which gets replaced.
						body.sha = await getFileSha.call(this, owner, repository, filePath, body.branch as string | undefined);
					}

					body.message = this.getNodeParameter('commitMessage', i) as string;

					if (this.getNodeParameter('binaryData', i) === true) {
						// Is binary file to upload
						const item = items[i];

						if (item.binary === undefined) {
							throw new Error('No binary data exists on item!');
						}

						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

						if (item.binary[binaryPropertyName] === undefined) {
							throw new Error(`No binary data property "${binaryPropertyName}" does not exists on item!`);
						}

						// Currently internally n8n uses base64 and also Github expects it base64 encoded.
						// If that ever changes the data has to get converted here.
						body.content = item.binary[binaryPropertyName].data;
					} else {
						// Is text file
						// body.content = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'base64');
						body.content = Buffer.from(this.getNodeParameter('fileContent', i) as string).toString('base64');
					}

					endpoint = `/repos/${owner}/${repository}/contents/${encodeURI(filePath)}`;
				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const additionalParameters = this.getNodeParameter('additionalParameters', i, {}) as IDataObject;
					if (additionalParameters.author) {
						body.author = additionalParameters.author;
					}
					if (additionalParameters.committer) {
						body.committer = additionalParameters.committer;
					}
					if (additionalParameters.branch && (additionalParameters.branch as IDataObject).branch) {
						body.branch = (additionalParameters.branch as IDataObject).branch;
					}

					const filePath = this.getNodeParameter('filePath', i) as string;
					body.message = this.getNodeParameter('commitMessage', i) as string;

					body.sha = await getFileSha.call(this, owner, repository, filePath, body.branch as string | undefined);

					endpoint = `/repos/${owner}/${repository}/contents/${encodeURI(filePath)}`;
				} else if (operation === 'get') {
					requestMethod = 'GET';

					const filePath = this.getNodeParameter('filePath', i) as string;

					endpoint = `/repos/${owner}/${repository}/contents/${encodeURI(filePath)}`;
				}
			} else if (resource === 'issue') {
				if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'POST';

					body.title = this.getNodeParameter('title', i) as string;
					body.body = this.getNodeParameter('body', i) as string;
					const labels = this.getNodeParameter('labels', i) as IDataObject[];

					const assignees = this.getNodeParameter('assignees', i) as IDataObject[];

					body.labels = labels.map((data) => data['label']);
					body.assignees = assignees.map((data) => data['assignee']);

					endpoint = `/repos/${owner}/${repository}/issues`;
				} else if (operation === 'createComment') {
					// ----------------------------------
					//         createComment
					// ----------------------------------
					requestMethod = 'POST';

					const issueNumber = this.getNodeParameter('issueNumber', i) as string;

					body.body = this.getNodeParameter('body', i) as string;

					endpoint = `/repos/${owner}/${repository}/issues/${issueNumber}/comments`;
				} else if (operation === 'edit') {
					// ----------------------------------
					//         edit
					// ----------------------------------

					requestMethod = 'PATCH';

					const issueNumber = this.getNodeParameter('issueNumber', i) as string;

					body = this.getNodeParameter('editFields', i, {}) as IDataObject;

					if (body.labels !== undefined) {
						body.labels = (body.labels as IDataObject[]).map((data) => data['label']);
					}
					if (body.assignees !== undefined) {
						body.assignees = (body.assignees as IDataObject[]).map((data) => data['assignee']);
					}

					endpoint = `/repos/${owner}/${repository}/issues/${issueNumber}`;
				} else if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';

					const issueNumber = this.getNodeParameter('issueNumber', i) as string;

					endpoint = `/repos/${owner}/${repository}/issues/${issueNumber}`;
				} else if (operation === 'lock') {
					// ----------------------------------
					//         lock
					// ----------------------------------

					requestMethod = 'PUT';

					const issueNumber = this.getNodeParameter('issueNumber', i) as string;

					qs.lock_reason = this.getNodeParameter('lockReason', i) as string;

					endpoint = `/repos/${owner}/${repository}/issues/${issueNumber}/lock`;
				}
			} else if (resource === 'release') {
				if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'POST';

					body = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					body.tag_name = this.getNodeParameter('releaseTag', i) as string;

					endpoint = `/repos/${owner}/${repository}/releases`;
				}
			} else if (resource === 'repository') {
				if (operation === 'listPopularPaths') {
					// ----------------------------------
					//         listPopularPaths
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = `/repos/${owner}/${repository}/traffic/popular/paths`;
				} else if (operation === 'listReferrers') {
					// ----------------------------------
					//         listReferrers
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = `/repos/${owner}/${repository}/traffic/popular/referrers`;
				} else if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = `/repos/${owner}/${repository}`;
				} else if (operation === 'getLicense') {
					// ----------------------------------
					//         getLicense
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = `/repos/${owner}/${repository}/license`;
				} else if (operation === 'getIssues') {
					// ----------------------------------
					//         getIssues
					// ----------------------------------

					requestMethod = 'GET';

					qs = this.getNodeParameter('getRepositoryIssuesFilters', i) as IDataObject;

					endpoint = `/repos/${owner}/${repository}/issues`;
				}
			} else if (resource === 'user') {
				if (operation === 'getRepositories') {
					// ----------------------------------
					//         getRepositories
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = `/users/${owner}/repos`;
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const responseData = await githubApiRequest.call(this, requestMethod, endpoint, body, qs);

			if (fullOperation === 'file:get') {
				const asBinaryProperty = this.getNodeParameter('asBinaryProperty', i);

				if (asBinaryProperty === true) {
					// Add the returned data to the item as binary property
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

					const newItem: INodeExecutionData = {
						json: items[i].json,
						binary: {},
					};

					if (items[i].binary !== undefined) {
						// Create a shallow copy of the binary data so that the old
						// data references which do not get changed still stay behind
						// but the incoming data does not get changed.
						Object.assign(newItem.binary, items[i].binary);
					}

					newItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(Buffer.from(responseData.content, 'base64'), responseData.path);

					items[i] = newItem;

					return this.prepareOutputData(items);
				}
			}

			if (overwriteDataOperations.includes(fullOperation)) {
				returnData.push(responseData);
			} else if (overwriteDataOperationsArray.includes(fullOperation)) {
				returnData.push.apply(returnData, responseData);
			}
		}

		if (overwriteDataOperations.includes(fullOperation) || overwriteDataOperationsArray.includes(fullOperation)) {
			// Return data gets replaced
			return [this.helpers.returnJsonArray(returnData)];
		} else {
			// For all other ones simply return the unchanged items
			return this.prepareOutputData(items);
		}

	}
}
