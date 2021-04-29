import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	gitlabApiRequest,
	gitlabApiRequestAllItems,
} from './GenericFunctions';

export class Gitlab implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GitLab',
		name: 'gitlab',
		icon: 'file:gitlab.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Retrieve data from GitLab API.',
		defaults: {
			name: 'Gitlab',
			color: '#FC6D27',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gitlabApi',
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
				name: 'gitlabOAuth2Api',
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
						description: 'Get the data of a single issue',
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
						name: 'Get Issues',
						value: 'getIssues',
						description: 'Returns issues of a repository',
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
						description: 'Create a new release',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a new release',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a new release',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all releases',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a new release',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},



			// ----------------------------------
			//         shared
			// ----------------------------------
			{
				displayName: 'Project Owner',
				name: 'owner',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'n8n-io',
				description: 'User, group or namespace of the project.',
			},
			{
				displayName: 'Project Name',
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
				description: 'The name of the project.',
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
				displayName: 'Due Date',
				name: 'due_date',
				type: 'dateTime',
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
				default: '',
				description: 'Due Date for issue.',
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
				name: 'assignee_ids',
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
						type: 'number',
						default: 0,
						description: 'User ID to assign issue to.',
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
						name: 'description',
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
						name: 'assignee_ids',
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
					{
						displayName: 'Due Date',
						name: 'due_date',
						type: 'dateTime',
						default: '',
						description: 'Due Date for issue.',
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
						description: 'The name of the release.',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: {
							rows: 5,
						},
						default: '',
						description: 'The description of the release.',
					},
					{
						displayName: 'Ref',
						name: 'ref',
						type: 'string',
						default: '',
						description: 'If Tag doesn’t exist, the release will be created from Ref. It can be a commit SHA, another tag name, or a branch name.',
					},
				],
			},

			// ----------------------------------
			//         release:get/delete
			// ----------------------------------
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'delete',
							'get',
						],
						resource: [
							'release',
						],
					},
				},
				description: 'The ID or URL-encoded path of the project.',
			},
			{
				displayName: 'Tag Name',
				name: 'tag_name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'delete',
							'get',
						],
						resource: [
							'release',
						],
					},
				},
				description: 'The Git tag the release is associated with.',
			},

			// ----------------------------------
			//         release:getAll
			// ----------------------------------
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getAll',
						],
						resource: [
							'release',
						],
					},
				},
				description: 'The ID or URL-encoded path of the project.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'release',
						],
						operation: [
							'getAll',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: [
							'release',
						],
						operation: [
							'getAll',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 20,
				description: 'How many results to return.',
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
							'getAll',
						],
						resource: [
							'release',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Order by',
						name: 'order_by',
						type: 'options',
						options: [
							{
								name: 'Created At',
								value: 'created_at',
							},
							{
								name: 'Released At',
								value: 'released_at',
							},
						],
						default: 'released_at',
						description: 'The field to use as order.',
					},
					{
						displayName: 'Sort',
						name: 'sort',
						type: 'options',
						options: [
							{
								name: 'ASC',
								value: 'asc',
							},
							{
								name: 'DESC',
								value: 'desc',
							},
						],
						default: 'desc',
						description: 'The direction of the order. .',
					},
				],
			},

			// ----------------------------------
			//         release:update
			// ----------------------------------
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'release',
						],
					},
				},
				description: 'The ID or URL-encoded path of the project.',
			},
			{
				displayName: 'Tag Name',
				name: 'tag_name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'release',
						],
					},
				},
				description: 'The Git tag the release is associated with.',
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
							'update',
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
						description: 'The release name.',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'The description of the release. You can use Markdown.',
					},
					{
						displayName: 'Milestones',
						name: 'milestones',
						type: 'string',
						default: '',
						description: 'The title of each milestone to associate with the release (provide a titles list spearated with comma).',
					},
					{
						displayName: 'Released At',
						name: 'released_at',
						type: 'dateTime',
						default: '',
						description: 'The date when the release is/was ready..',
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
							'getIssues',
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
						name: 'assignee_username',
						type: 'string',
						default: '',
						description: 'Return only issues which are assigned to a specific user.',
					},
					{
						displayName: 'Creator',
						name: 'author_username',
						type: 'string',
						default: '',
						description: 'Return only issues which were created by a specific user.',
					},
					{
						displayName: 'Labels',
						name: 'labels',
						type: 'string',
						default: '',
						description: 'Return only issues with the given labels. Multiple lables can be separated by comma.',
					},
					{
						displayName: 'Updated After',
						name: 'updated_after',
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
								value: '',
								description: 'Returns issues with any state',
							},
							{
								name: 'Closed',
								value: 'closed',
								description: 'Return issues with "closed" state',
							},
							{
								name: 'Open',
								value: 'opened',
								description: 'Return issues with "open" state',
							},
						],
						default: 'opened',
						description: 'The state to filter by.',
					},
					{
						displayName: 'Sort',
						name: 'order_by',
						type: 'options',
						options: [
							{
								name: 'Created At',
								value: 'created_at',
								description: 'Sort by created date.',
							},
							{
								name: 'Updated At',
								value: 'updated_at',
								description: 'Sort by updated date.',
							},
							{
								name: 'Priority',
								value: 'priority',
								description: 'Sort by priority.',
							},
						],
						default: 'created_at',
						description: 'The order the issues should be returned in.',
					},
					{
						displayName: 'Direction',
						name: 'sort',
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

		let credentials;

		const authenticationMethod = this.getNodeParameter('authentication', 0);

		try {
			if (authenticationMethod === 'accessToken') {
				credentials = await this.getCredentials('gitlabApi');

				if (credentials === undefined) {
					throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
				}
			} else {
				credentials = await this.getCredentials('gitlabOAuth2Api');

				if (credentials === undefined) {
					throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
				}
			}
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error);
		}

		// Operations which overwrite the returned data
		const overwriteDataOperations = [
			'issue:create',
			'issue:createComment',
			'issue:edit',
			'issue:get',
			'release:create',
			'release:delete',
			'release:get',
			'release:update',
			'repository:get',
		];
		// Operations which overwrite the returned data and return arrays
		// and has so to be merged with the data of other items
		const overwriteDataOperationsArray = [
			'release:getAll',
			'repository:getIssues',
			'user:getRepositories',
		];

		let responseData;
		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;
		let returnAll = false;

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
			let owner = this.getNodeParameter('owner', i) as string;

			// Replace all slashes to work with subgroups
			owner = owner.replace(new RegExp(/\//g), '%2F');

			let repository = '';
			if (fullOperation !== 'user:getRepositories') {
				repository = this.getNodeParameter('repository', i) as string;
			}

			const baseEndpoint = `/projects/${owner}%2F${repository}`;

			if (resource === 'issue') {
				if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'POST';

					body.title = this.getNodeParameter('title', i) as string;
					body.description = this.getNodeParameter('body', i) as string;
					body.due_date = this.getNodeParameter('due_date', i) as string;
					const labels = this.getNodeParameter('labels', i) as IDataObject[];

					const assigneeIds = this.getNodeParameter('assignee_ids', i) as IDataObject[];

					body.labels = labels.map((data) => data['label']).join(',');
					body.assignee_ids = assigneeIds.map((data) => data['assignee']);

					endpoint = `${baseEndpoint}/issues`;
				} else if (operation === 'createComment') {
					// ----------------------------------
					//         createComment
					// ----------------------------------
					requestMethod = 'POST';

					const issueNumber = this.getNodeParameter('issueNumber', i) as string;

					body.body = this.getNodeParameter('body', i) as string;

					endpoint = `${baseEndpoint}/issues/${issueNumber}/notes`;
				} else if (operation === 'edit') {
					// ----------------------------------
					//         edit
					// ----------------------------------

					requestMethod = 'PUT';

					const issueNumber = this.getNodeParameter('issueNumber', i) as string;

					body = this.getNodeParameter('editFields', i, {}) as IDataObject;

					if (body.labels !== undefined) {
						body.labels = (body.labels as IDataObject[]).map((data) => data['label']).join(',');
					}
					if (body.assignee_ids !== undefined) {
						body.assignee_ids = (body.assignee_ids as IDataObject[]).map((data) => data['assignee']);
					}

					endpoint = `${baseEndpoint}/issues/${issueNumber}`;
				} else if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';

					const issueNumber = this.getNodeParameter('issueNumber', i) as string;

					endpoint = `${baseEndpoint}/issues/${issueNumber}`;
				} else if (operation === 'lock') {
					// ----------------------------------
					//         lock
					// ----------------------------------

					requestMethod = 'PUT';

					const issueNumber = this.getNodeParameter('issueNumber', i) as string;

					body.discussion_locked = true;

					endpoint = `${baseEndpoint}/issues/${issueNumber}`;
				}
			} else if (resource === 'release') {
				if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'POST';

					body = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					body.tag_name = this.getNodeParameter('releaseTag', i) as string;

					endpoint = `${baseEndpoint}/releases`;
				}
				if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const id = this.getNodeParameter('projectId', i) as string;

					const tagName = this.getNodeParameter('tag_name', i) as string;

					endpoint = `/projects/${id}/releases/${tagName}`;
				}
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';

					const id = this.getNodeParameter('projectId', i) as string;

					const tagName = this.getNodeParameter('tag_name', i) as string;

					endpoint = `/projects/${id}/releases/${tagName}`;
				}
				if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					const id = this.getNodeParameter('projectId', i) as string;

					qs = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					returnAll = this.getNodeParameter('returnAll', 0) as boolean;

					if (returnAll === false) {
						qs.per_page = this.getNodeParameter('limit', 0) as number;
					}

					endpoint = `/projects/${id}/releases`;
				}
				if (operation === 'update') {
					// ----------------------------------
					//         update
					// ----------------------------------

					requestMethod = 'PUT';

					const id = this.getNodeParameter('projectId', i) as string;

					const tagName = this.getNodeParameter('tag_name', i) as string;

					body = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					if(body.milestones){
						body.milestones = (body.milestones as string).split(',');
					}

					endpoint = `/projects/${id}/releases/${tagName}`;
				}
			} else if (resource === 'repository') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = `${baseEndpoint}`;
				} else if (operation === 'getIssues') {
					// ----------------------------------
					//         getIssues
					// ----------------------------------

					requestMethod = 'GET';

					qs = this.getNodeParameter('getRepositoryIssuesFilters', i) as IDataObject;

					endpoint = `${baseEndpoint}/issues`;
				}
			} else if (resource === 'user') {
				if (operation === 'getRepositories') {
					// ----------------------------------
					//         getRepositories
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = `/users/${owner}/projects`;
				}
			} else {
				throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
			}

			if (returnAll === true) {
				responseData = await gitlabApiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
			} else {
				responseData = await gitlabApiRequest.call(this, requestMethod, endpoint, body, qs);
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
