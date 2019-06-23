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
		displayName: 'Github',
		name: 'github',
		icon: 'file:github.png',
		group: ['input'],
		version: 1,
		description: 'Retrieve data from Github API.',
		defaults: {
			name: 'Github',
			color: '#665533',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'githubApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Create File',
						value: 'createFile',
						description: 'Creates a new file in a repository',
					},
					{
						name: 'Create Issue',
						value: 'createIssue',
						description: 'Creates a new issue',
					},
					{
						name: 'Create Issue Comment',
						value: 'createIssueComment',
						description: 'Creates a new comment on an issue',
					},
					{
						name: 'Create Release',
						value: 'createRelease',
						description: 'Creates a new release',
					},
					{
						name: 'Delete File',
						value: 'deleteFile',
						description: 'Deletes a file',
					},
					{
						name: 'Edit Issue',
						value: 'editIssue',
						description: 'Edits an existing issue',
					},
					{
						name: 'Get Community Profile',
						value: 'getCommunityProfile',
						description: 'Get the community profile of a repository with metrics, health score, description, license, ...',
					},
					{
						name: 'Get File',
						value: 'getFile',
						description: 'Get the data of a file',
					},
					{
						name: 'Get Issue',
						value: 'getIssue',
						description: 'Get the data of a single issues',
					},
					{
						name: 'Get Repository Issues',
						value: 'getRepositoryIssues',
						description: 'Returns issues of a repository',
					},
					{
						name: 'Get Repository License',
						value: 'getRepositoryLicense',
						description: 'Returns the contents of the repository\'s license file, if one is detected',
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
					{
						name: 'List User Repositories',
						value: 'listUserRepositories',
						description: 'Returns the repositories of a user',
					},
					{
						name: 'Lock Issue',
						value: 'lockIssue',
						description: 'Lock an issue',
					},
					{
						name: 'Update File',
						value: 'updateFile',
						description: 'Updates an existing file',
					},
				],
				default: 'createIssue',
				description: 'The operation to perform.',
			},

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
						operation: [
							'listUserRepositories',
						],
					},
				},
				placeholder: 'n8n',
				description: 'The name of the repsitory.',
			},



			// ----------------------------------
			//         createFile / deleteFile / getFile / updateFile
			// ----------------------------------

			{
				displayName: 'File Path',
				name: 'filePath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'createFile',
							'deleteFile',
							'getFile',
							'updateFile',
						],
					},
				},
				placeholder: 'docs/README.md',
				description: 'The file path of the file. Has to contain the full path.',
			},



			// ----------------------------------
			//         createFile / updateFile
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
							'createFile',
							'updateFile',
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
						operation: [
							'createFile',
							'updateFile',
						],
						binaryData: [
							false,
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
						operation: [
							'createFile',
							'updateFile',
						],
						binaryData: [
							true,
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
							'createFile',
							'deleteFile',
							'updateFile',
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
							'createFile',
							'deleteFile',
							'updateFile',
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
								displayName: 'EMail',
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
								displayName: 'EMail',
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
			//         createIssue
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
							'createIssue',
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
							'createIssue',
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
							'createIssue',
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
							'createIssue',
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
			//         createIssueComment
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
							'createIssueComment',
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
							'createIssueComment',
						],
					},
				},
				default: '',
				description: 'The body of the comment.',
			},


			// ----------------------------------
			//         createRelease
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
							'createRelease',
						],
					},
				},
				description: 'The tag of the release.',
			},
			{
				displayName: 'Edit Fields',
				name: 'createReleaseFields',
				type: 'collection',
				typeOptions: {
					multipleValueButtonText: 'Add Field',
				},
				displayOptions: {
					show: {
						operation: [
							'createRelease'
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
			//         editIssue
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
							'editIssue',
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
							'editIssue'
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
			//         getFile
			// ----------------------------------

			{
				displayName: 'As Binary Property',
				name: 'asBinaryProperty',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: [
							'getFile',
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
						operation: [
							'getFile',
						],
						asBinaryProperty: [
							true,
						],
					},

				},
				placeholder: '',
				description: 'Name of the binary property in which to save<br />the binary data of the received file.',
			},



			// ----------------------------------
			//         getIssue
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
							'getIssue',
						],
					},
				},
				description: 'The number of the issue get data of.',
			},


			// ----------------------------------
			//         getRepositoryIssues
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
							'getRepositoryIssues'
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
						description: 'Return only issuse which are assigned to a specific user.',
					},
					{
						displayName: 'Creator',
						name: 'creator',
						type: 'string',
						default: '',
						description: 'Return only issuse which were created by a specific user.',
					},
					{
						displayName: 'Mentioned',
						name: 'mentioned',
						type: 'string',
						default: '',
						description: 'Return only issuse in which a specific user was mentioned.',
					},
					{
						displayName: 'Labels',
						name: 'labels',
						type: 'string',
						default: '',
						description: 'Return only issuse with the given labels. Multiple lables can be separated by comma.',
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


			// ----------------------------------
			//         lockIssue
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
							'lockIssue',
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
							'lockIssue'
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
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const credentials = this.getCredentials('githubApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		// Operations which overwrite the returned data
		const overwriteDataOperations = [
			'createFile',
			'createIssue',
			'createIssueComment',
			'createRelease',
			'deleteFile',
			'editIssue',
			'getCommunityProfile',
			'getFile',
			'getIssue',
			'getRepositoryLicense',
			'updateFile',
		];
		// Operations which overwrite the returned data and return arrays
		// and has so to be merged with the data of other items
		const overwriteDataOperationsArray = [
			'getRepositoryIssues',
			'listPopularPaths',
			'listReferrers',
			'listUserRepositories',
		];


		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;

		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			// Reset all values
			requestMethod = 'GET';
			endpoint = '';
			body = {};
			qs = {};

			// Request the parameters which almost all operations need
			const owner = this.getNodeParameter('owner', i) as string;
			let repository = '';
			if (operation !== 'listUserRepositories') {
				repository = this.getNodeParameter('repository', i) as string;
			}

			if (['createFile', 'updateFile'].includes(operation)) {
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

				if (operation === 'updateFile') {
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
			} else if (operation === 'createIssue') {
				requestMethod = 'POST';

				body.title = this.getNodeParameter('title', i) as string;
				body.body = this.getNodeParameter('body', i) as string;
				const labels = this.getNodeParameter('labels', i) as IDataObject[];

				const assignees = this.getNodeParameter('assignees', i) as IDataObject[];

				body.labels = labels.map((data) => data['label']);
				body.assignees = assignees.map((data) => data['assignee']);

				endpoint = `/repos/${owner}/${repository}/issues`;
			} else if (operation === 'createIssueComment') {
				requestMethod = 'POST';

				const issueNumber = this.getNodeParameter('issueNumber', i) as string;

				body.body = this.getNodeParameter('body', i) as string;

				endpoint = `/repos/${owner}/${repository}/issues/${issueNumber}/comments`;
			} else if (operation === 'createRelease') {
				requestMethod = 'POST';

				body = this.getNodeParameter('createReleaseFields', i, {}) as IDataObject;

				body.tag_name = this.getNodeParameter('releaseTag', i) as string;

				endpoint = `/repos/${owner}/${repository}/releases`;
			} else if (operation === 'deleteFile') {
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
			} else if (operation === 'editIssue') {
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
			} else if (operation === 'getFile') {
				requestMethod = 'GET';

				const filePath = this.getNodeParameter('filePath', i) as string;

				endpoint = `/repos/${owner}/${repository}/contents/${encodeURI(filePath)}`;
			} else if (operation === 'getIssue') {
				requestMethod = 'GET';

				const issueNumber = this.getNodeParameter('issueNumber', i) as string;

				endpoint = `/repos/${owner}/${repository}/issues/${issueNumber}`;
			} else if (operation === 'listPopularPaths') {
				requestMethod = 'GET';

				endpoint = `/repos/${owner}/${repository}/traffic/popular/paths`;
			} else if (operation === 'listReferrers') {
				requestMethod = 'GET';

				endpoint = `/repos/${owner}/${repository}/traffic/popular/referrers`;
			} else if (operation === 'getRepositoryLicense') {
				requestMethod = 'GET';

				endpoint = `/repos/${owner}/${repository}/license`;
			} else if (operation === 'getRepositoryIssues') {
				requestMethod = 'GET';

				qs = this.getNodeParameter('getRepositoryIssuesFilters', i) as IDataObject;

				endpoint = `/repos/${owner}/${repository}/issues`;
			} else if (operation === 'listUserRepositories') {
				requestMethod = 'GET';

				endpoint = `/users/${owner}/repos`;
			} else if (operation === 'lockIssue') {
				requestMethod = 'PUT';

				const issueNumber = this.getNodeParameter('issueNumber', i) as string;

				qs.lock_reason = this.getNodeParameter('lockReason', i) as string;

				endpoint = `/repos/${owner}/${repository}/issues/${issueNumber}/lock`;
			}

			const responseData = await githubApiRequest.call(this, requestMethod, endpoint, body, qs);

			if (operation === 'getFile') {
				const asBinaryProperty = this.getNodeParameter('asBinaryProperty', i);

				if (asBinaryProperty === true) {
					// Add the returned data to the item as binary property
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					if (items[i].binary === undefined) {
						items[i].binary = {};
					}
					items[i].binary![binaryPropertyName] = await this.helpers.prepareBinaryData(Buffer.from(responseData.content, 'base64'), responseData.path);
					return this.prepareOutputData(items);
				}
			}

			if (overwriteDataOperations.includes(operation)) {
				returnData.push(responseData);
			} else if (overwriteDataOperationsArray.includes(operation)) {
				returnData.push.apply(returnData, responseData);
			}
		}

		if (overwriteDataOperations.includes(operation) || overwriteDataOperationsArray.includes(operation)) {
			// Return data gets replaced
			return [this.helpers.returnJsonArray(returnData)];
		} else {
			// For all other ones simply return the unchanged items
			return this.prepareOutputData(items);
		}

	}
}
