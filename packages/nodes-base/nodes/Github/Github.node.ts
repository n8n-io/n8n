import { snakeCase } from 'change-case';
import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	WAIT_INDEFINITELY,
} from 'n8n-workflow';

import {
	getFileSha,
	githubApiRequest,
	githubApiRequestAllItems,
	isBase64,
	validateJSON,
} from './GenericFunctions';
import { getRefs, getRepositories, getUsers, getWorkflows } from './SearchFunctions';
import { removeTrailingSlash } from '../../utils/utilities';
import { defaultWebhookDescription } from '../Webhook/description';

const waitingTooltip = (parameters: { operation: string }, resumeUrl: string) => {
	if (parameters?.operation === 'dispatchAndWait') {
		const message = 'Execution will continue when the following webhook URL is called: ';
		return `${message}<a href="${resumeUrl}" target="_blank">${resumeUrl}</a>`;
	}

	return '';
};

export class Github implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GitHub',
		name: 'github',
		icon: {
			light: 'file:github.svg',
			dark: 'file:github.dark.svg',
		},
		group: ['input'],
		version: [1, 1.1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume GitHub API',
		defaults: {
			name: 'GitHub',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		waitingNodeTooltip: `={{ (${waitingTooltip})($parameter, $execution.resumeUrl) }}`,
		webhooks: [
			{
				...defaultWebhookDescription,
				path: '',
				restartWebhook: true,
				httpMethod: 'POST',
				responseMode: 'onReceived',
			},
		],
		credentials: [
			{
				name: 'githubApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'githubOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
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
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
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
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Release',
						value: 'release',
					},
					{
						name: 'Repository',
						value: 'repository',
					},
					{
						name: 'Review',
						value: 'review',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Workflow',
						value: 'workflow',
					},
				],
				default: 'issue',
			},

			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['organization'],
					},
				},
				options: [
					{
						name: 'Get Repositories',
						value: 'getRepositories',
						description: 'Returns all repositories of an organization',
						action: 'Get repositories for an organization',
					},
				],
				default: 'getRepositories',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['issue'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new issue',
						action: 'Create an issue',
					},
					{
						name: 'Create Comment',
						value: 'createComment',
						description: 'Create a new comment on an issue',
						action: 'Create a comment on an issue',
					},
					{
						name: 'Edit',
						value: 'edit',
						description: 'Edit an issue',
						action: 'Edit an issue',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get the data of a single issue',
						action: 'Get an issue',
					},
					{
						name: 'Lock',
						value: 'lock',
						description: 'Lock an issue',
						action: 'Lock an issue',
					},
				],
				default: 'create',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new file in repository',
						action: 'Create a file',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a file in repository',
						action: 'Delete a file',
					},
					{
						name: 'Edit',
						value: 'edit',
						description: 'Edit a file in repository',
						action: 'Edit a file',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get the data of a single file',
						action: 'Get a file',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List contents of a folder',
						action: 'List files',
					},
				],
				default: 'create',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['repository'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get the data of a single repository',
						action: 'Get a repository',
					},
					{
						name: 'Get Issues',
						value: 'getIssues',
						description: 'Returns issues of a repository',
						action: 'Get issues of a repository',
					},
					{
						name: 'Get License',
						value: 'getLicense',
						description:
							"Returns the contents of the repository's license file, if one is detected",
						action: 'Get the license of a repository',
					},
					{
						name: 'Get Profile',
						value: 'getProfile',
						description:
							'Get the community profile of a repository with metrics, health score, description, license, etc',
						action: 'Get the profile of a repository',
					},
					{
						name: 'Get Pull Requests',
						value: 'getPullRequests',
						description: 'Returns pull requests of a repository',
						action: 'Get pull requests of a repository',
					},
					{
						name: 'List Popular Paths',
						value: 'listPopularPaths',
						description: 'Get the top 10 popular content paths over the last 14 days',
						action: 'List popular paths in a repository',
					},
					{
						name: 'List Referrers',
						value: 'listReferrers',
						description: 'Get the top 10 referrering domains over the last 14 days',
						action: 'List the top referrers of a repository',
					},
				],
				default: 'getIssues',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['user'],
					},
				},
				options: [
					{
						name: 'Get Repositories',
						value: 'getRepositories',
						description: 'Returns the repositories of a user',
						action: "Get a user's repositories",
					},
					{
						name: 'Get Issues',
						value: 'getUserIssues',
						description: 'Returns the issues assigned to the user',
						action: "Get a user's issues",
					},
					{
						name: 'Invite',
						value: 'invite',
						description: 'Invites a user to an organization',
						action: 'Invite a user',
					},
				],
				default: 'getRepositories',
			},

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
						description: 'Creates a new release',
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
						description: 'Get a release',
						action: 'Get a release',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many repository releases',
						action: 'Get many releases',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a release',
						action: 'Update a release',
					},
				],
				default: 'create',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['review'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Creates a new review',
						action: 'Create a review',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a review for a pull request',
						action: 'Get a review',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many reviews for a pull request',
						action: 'Get many reviews',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a review',
						action: 'Update a review',
					},
				],
				default: 'create',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['workflow'],
					},
				},
				options: [
					{
						name: 'Disable',
						value: 'disable',
						description: 'Disable a workflow',
						action: 'Disable a workflow',
					},
					{
						name: 'Dispatch',
						value: 'dispatch',
						description: 'Dispatch a workflow event',
						action: 'Dispatch a workflow event',
					},
					{
						name: 'Dispatch and Wait for Completion',
						value: 'dispatchAndWait',
						description:
							'Dispatch a workflow event and wait for a webhook to be called before proceeding',
						action: 'Dispatch a workflow event and wait for completion',
					},
					{
						name: 'Enable',
						value: 'enable',
						description: 'Enable a workflow',
						action: 'Enable a workflow',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a workflow',
						action: 'Get a workflow',
					},
					{
						name: 'Get Usage',
						value: 'getUsage',
						description: 'Get the usage of a workflow',
						action: 'Get the usage of a workflow',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List workflows',
						action: 'List workflows',
					},
				],
				default: 'dispatch',
			},
			{
				displayName:
					'Your execution will pause until a webhook is called. This URL will be generated at runtime and passed to your Github workflow as a resumeUrl input.',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: {
					show: {
						resource: ['workflow'],
						operation: ['dispatchAndWait'],
					},
				},
				default: '',
			},

			// ----------------------------------
			//         shared
			// ----------------------------------
			{
				displayName: 'Repository Owner',
				name: 'owner',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'Repository Owner',
						name: 'list',
						type: 'list',
						placeholder: 'Select an owner...',
						typeOptions: {
							searchListMethod: 'getUsers',
							searchable: true,
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'Link',
						name: 'url',
						type: 'string',
						placeholder: 'e.g. https://github.com/n8n-io',
						extractValue: {
							type: 'regex',
							regex: 'https:\\/\\/(?:[^/]+)\\/([-_0-9a-zA-Z]+)',
						},
						validation: [
							{
								type: 'regex',
								properties: {
									regex: 'https:\\/\\/([^/]+)\\/([-_0-9a-zA-Z]+)(?:.*)',
									errorMessage: 'Not a valid Github URL',
								},
							},
						],
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'e.g. n8n-io',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[-_a-zA-Z0-9]+',
									errorMessage: 'Not a valid Github Owner Name',
								},
							},
						],
						url: '=https://github.com/{{$value}}',
					},
				],
				displayOptions: {
					hide: {
						operation: ['invite', 'getUserIssues'],
					},
				},
			},
			{
				displayName: 'Repository Name',
				name: 'repository',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				required: true,
				modes: [
					{
						displayName: 'Repository Name',
						name: 'list',
						type: 'list',
						placeholder: 'Select an Repository...',
						typeOptions: {
							searchListMethod: 'getRepositories',
							searchable: true,
						},
					},
					{
						displayName: 'Link',
						name: 'url',
						type: 'string',
						placeholder: 'e.g. https://github.com/n8n-io/n8n',
						extractValue: {
							type: 'regex',
							regex: 'https:\\/\\/(?:[^/]+)\\/(?:[-_0-9a-zA-Z]+)\\/([-_.0-9a-zA-Z]+)',
						},
						validation: [
							{
								type: 'regex',
								properties: {
									regex: 'https:\\/\\/([^/]+)\\/(?:[-_0-9a-zA-Z]+)\\/([-_.0-9a-zA-Z]+)(?:.*)',
									errorMessage: 'Not a valid Github Repository URL',
								},
							},
						],
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'e.g. n8n',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[-_.0-9a-zA-Z]+',
									errorMessage: 'Not a valid Github Repository Name',
								},
							},
						],
						url: '=https://github.com/{{$parameter["owner"]}}/{{$value}}',
					},
				],
				displayOptions: {
					hide: {
						resource: ['user', 'organization'],
						operation: ['getRepositories'],
					},
				},
			},

			// ----------------------------------
			//         workflow
			// ----------------------------------
			{
				displayName: 'Workflow',
				name: 'workflowId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				required: true,
				modes: [
					{
						displayName: 'Workflow',
						name: 'list',
						type: 'list',
						placeholder: 'Select a workflow...',
						typeOptions: {
							searchListMethod: 'getWorkflows',
							searchable: true,
						},
					},
					{
						displayName: 'By File Name',
						name: 'filename',
						type: 'string',
						placeholder: 'e.g. main.yaml or main.yml',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[a-zA-Z0-9_-]+.(yaml|yml)',
									errorMessage: 'Not a valid Github Workflow File Name',
								},
							},
						],
					},
					{
						displayName: 'By ID',
						name: 'name',
						type: 'string',
						placeholder: 'e.g. 12345678',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '\\d+',
									errorMessage: 'Not a valid Github Workflow ID',
								},
							},
						],
					},
				],
				displayOptions: {
					show: {
						resource: ['workflow'],
						operation: ['disable', 'dispatch', 'dispatchAndWait', 'get', 'getUsage', 'enable'],
					},
				},
				description: 'The workflow to dispatch',
			},
			{
				displayName: 'Ref',
				name: 'ref',
				type: 'string',
				default: 'main',
				required: true,
				displayOptions: {
					show: {
						resource: ['workflow'],
						operation: ['dispatch', 'dispatchAndWait'],
						'@version': [{ _cnd: { lte: 1 } }],
					},
				},
				description: 'The git reference for the workflow dispatch (branch or tag name)',
			},
			{
				displayName: 'Ref',
				name: 'ref',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a branch, tag, or commit...',
						typeOptions: {
							searchListMethod: 'getRefs',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'e.g. main',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[a-zA-Z0-9/._-]+$',
									errorMessage: 'Not a valid branch, tag',
								},
							},
						],
					},
				],
				displayOptions: {
					show: {
						resource: ['workflow'],
						operation: ['dispatch', 'dispatchAndWait'],
						'@version': [{ _cnd: { gte: 1.1 } }],
					},
				},
				description: 'The git reference for the workflow dispatch (branch, tag, or commit SHA)',
			},
			{
				displayName: 'Inputs',
				name: 'inputs',
				type: 'json',
				default: '{}',
				displayOptions: {
					show: {
						resource: ['workflow'],
						operation: ['dispatch', 'dispatchAndWait'],
					},
				},
				description: 'JSON object with input parameters for the workflow',
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
						resource: ['file'],
					},
					hide: {
						operation: ['list'],
					},
				},
				placeholder: 'docs/README.md',
				description: 'The file path of the file. Has to contain the full path.',
			},

			// ----------------------------------
			//         file:list
			// ----------------------------------
			{
				displayName: 'Path',
				name: 'filePath',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['list'],
					},
				},
				placeholder: 'docs/',
				description: 'The path of the folder to list',
			},

			// ----------------------------------
			//         file:create/edit
			// ----------------------------------
			{
				displayName: 'Binary File',
				name: 'binaryData',
				type: 'boolean',
				default: false,
				required: true,
				displayOptions: {
					show: {
						operation: ['create', 'edit'],
						resource: ['file'],
					},
				},
				description: 'Whether the data to upload should be taken from binary field',
			},
			{
				displayName: 'File Content',
				name: 'fileContent',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						binaryData: [false],
						operation: ['create', 'edit'],
						resource: ['file'],
					},
				},
				placeholder: '',
				description: 'The text content of the file',
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						binaryData: [true],
						operation: ['create', 'edit'],
						resource: ['file'],
					},
				},
				placeholder: '',
				hint: 'The name of the input binary field containing the file to be written',
			},
			{
				displayName: 'Commit Message',
				name: 'commitMessage',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create', 'delete', 'edit'],
						resource: ['file'],
					},
				},
			},
			{
				displayName: 'Additional Parameters',
				name: 'additionalParameters',
				placeholder: 'Add Parameter',
				description: 'Additional fields to add',
				type: 'fixedCollection',
				default: {},
				displayOptions: {
					show: {
						operation: ['create', 'delete', 'edit'],
						resource: ['file'],
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
								description: 'The name of the author of the commit',
							},
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								placeholder: 'name@email.com',
								default: '',
								description: 'The email of the author of the commit',
							},
						],
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
								description:
									'The branch to commit to. If not set the repository’s default branch (usually master) is used.',
							},
						],
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
								description: 'The name of the committer of the commit',
							},
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								placeholder: 'name@email.com',
								default: '',
								description: 'The email of the committer of the commit',
							},
						],
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
						operation: ['get'],
						resource: ['file'],
					},
				},
				description:
					'Whether to set the data of the file as binary property instead of returning the raw API response',
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						asBinaryProperty: [true],
						operation: ['get'],
						resource: ['file'],
					},
				},
				placeholder: '',
				hint: 'The name of the output binary field to put the file in',
			},
			{
				displayName: 'Additional Parameters',
				name: 'additionalParameters',
				placeholder: 'Add Parameter',
				description: 'Additional fields to add',
				type: 'collection',
				default: {},
				displayOptions: {
					show: {
						operation: ['get'],
						resource: ['file'],
					},
				},
				options: [
					{
						displayName: 'Reference',
						name: 'reference',
						type: 'string',
						default: '',
						placeholder: 'master',
						description:
							'The name of the commit/branch/tag. Default: the repository’s default branch (usually master).',
					},
				],
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
						operation: ['create'],
						resource: ['issue'],
					},
				},
				description: 'The title of the issue',
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
						operation: ['create'],
						resource: ['issue'],
					},
				},
				description: 'The body of the issue',
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
						operation: ['create'],
						resource: ['issue'],
					},
				},
				default: { label: '' },
				options: [
					{
						displayName: 'Label',
						name: 'label',
						type: 'string',
						default: '',
						description: 'Label to add to issue',
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
						operation: ['create'],
						resource: ['issue'],
					},
				},
				default: { assignee: '' },
				options: [
					{
						displayName: 'Assignee',
						name: 'assignee',
						type: 'string',
						default: '',
						description: 'User to assign issue too',
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
						operation: ['createComment'],
						resource: ['issue'],
					},
				},
				description: 'The number of the issue on which to create the comment on',
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
						operation: ['createComment'],
						resource: ['issue'],
					},
				},
				default: '',
				description: 'The body of the comment',
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
						operation: ['edit'],
						resource: ['issue'],
					},
				},
				description: 'The number of the issue edit',
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
						operation: ['edit'],
						resource: ['issue'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Assignees',
						name: 'assignees',
						type: 'collection',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add Assignee',
						},
						default: { assignee: '' },
						options: [
							{
								displayName: 'Assignees',
								name: 'assignee',
								type: 'string',
								default: '',
								description: 'User to assign issue to',
							},
						],
					},
					{
						displayName: 'Body',
						name: 'body',
						type: 'string',
						typeOptions: {
							rows: 5,
						},
						default: '',
						description: 'The body of the issue',
					},
					{
						displayName: 'Labels',
						name: 'labels',
						type: 'collection',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add Label',
						},
						default: { label: '' },
						options: [
							{
								displayName: 'Label',
								name: 'label',
								type: 'string',
								default: '',
								description: 'Label to add to issue',
							},
						],
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
						description: 'The state to set',
					},
					{
						displayName: 'State Reason',
						name: 'state_reason',
						type: 'options',
						options: [
							{
								name: 'Completed',
								value: 'completed',
								description: 'Issue is completed',
							},
							{
								name: 'Not Planned',
								value: 'not_planned',
								description: 'Issue is not planned',
							},
							{
								name: 'Reopened',
								value: 'reopened',
								description: 'Issue is reopened',
							},
						],
						default: 'completed',
						description: 'The reason for the state change',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'The title of the issue',
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
						operation: ['get'],
						resource: ['issue'],
					},
				},
				description: 'The issue number to get data for',
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
						operation: ['lock'],
						resource: ['issue'],
					},
				},
				description: 'The issue number to lock',
			},
			{
				displayName: 'Lock Reason',
				name: 'lockReason',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['lock'],
						resource: ['issue'],
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
				description: 'The reason for locking the issue',
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
						operation: ['create'],
						resource: ['release'],
					},
				},
				description: 'The tag of the release',
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
						operation: ['create'],
						resource: ['release'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'The name of the issue',
					},
					{
						displayName: 'Body',
						name: 'body',
						type: 'string',
						typeOptions: {
							rows: 5,
						},
						default: '',
						description: 'The body of the release',
					},
					{
						displayName: 'Draft',
						name: 'draft',
						type: 'boolean',
						default: false,
						description:
							'Whether to create a draft (unpublished) release, "false" to create a published one',
					},
					{
						displayName: 'Prerelease',
						name: 'prerelease',
						type: 'boolean',
						default: false,
						description: 'Whether to point out that the release is non-production ready',
					},
					{
						displayName: 'Target Commitish',
						name: 'target_commitish',
						type: 'string',
						default: '',
						description:
							"Specifies the commitish value that determines where the Git tag is created from. Can be any branch or commit SHA. Unused if the Git tag already exists. Default: the repository's default branch(usually master).",
					},
				],
			},

			// ----------------------------------
			//         release:get/delete/update
			// ----------------------------------
			{
				displayName: 'Release ID',
				name: 'release_id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['release'],
						operation: ['get', 'delete', 'update'],
					},
				},
			},

			// ----------------------------------
			//         release:update
			// ----------------------------------
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				typeOptions: {
					multipleValueButtonText: 'Add Field',
				},
				displayOptions: {
					show: {
						operation: ['update'],
						resource: ['release'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Body',
						name: 'body',
						type: 'string',
						typeOptions: {
							rows: 5,
						},
						default: '',
						description: 'The body of the release',
					},
					{
						displayName: 'Draft',
						name: 'draft',
						type: 'boolean',
						default: false,
						description:
							'Whether to create a draft (unpublished) release, "false" to create a published one',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'The name of the release',
					},
					{
						displayName: 'Prerelease',
						name: 'prerelease',
						type: 'boolean',
						default: false,
						description: 'Whether to point out that the release is non-production ready',
					},
					{
						displayName: 'Tag Name',
						name: 'tag_name',
						type: 'string',
						default: '',
						description: 'The name of the tag',
					},
					{
						displayName: 'Target Commitish',
						name: 'target_commitish',
						type: 'string',
						default: '',
						description:
							"Specifies the commitish value that determines where the Git tag is created from. Can be any branch or commit SHA. Unused if the Git tag already exists. Default: the repository's default branch(usually master).",
					},
				],
			},

			// ----------------------------------
			//         release:getAll
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['release'],
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
						resource: ['release'],
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

			// ----------------------------------
			//         repository
			// ----------------------------------

			// ----------------------------------
			//         repository:getIssues
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['repository'],
						operation: ['getIssues'],
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
						resource: ['repository'],
						operation: ['getIssues'],
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
				name: 'getRepositoryIssuesFilters',
				type: 'collection',
				typeOptions: {
					multipleValueButtonText: 'Add Filter',
				},
				displayOptions: {
					show: {
						operation: ['getIssues'],
						resource: ['repository'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Assignee',
						name: 'assignee',
						type: 'string',
						default: '',
						description: 'Return only issues which are assigned to a specific user',
					},
					{
						displayName: 'Creator',
						name: 'creator',
						type: 'string',
						default: '',
						description: 'Return only issues which were created by a specific user',
					},
					{
						displayName: 'Mentioned',
						name: 'mentioned',
						type: 'string',
						default: '',
						description: 'Return only issues in which a specific user was mentioned',
					},
					{
						displayName: 'Labels',
						name: 'labels',
						type: 'string',
						default: '',
						description:
							'Return only issues with the given labels. Multiple labels can be separated by comma.',
					},
					{
						displayName: 'Updated Since',
						name: 'since',
						type: 'dateTime',
						default: '',
						description: 'Return only issues updated at or after this time',
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
						description: 'The state to set',
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
						description: 'The order the issues should be returned in',
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
						description: 'The sort order',
					},
				],
			},

			// ----------------------------------
			//         repository:getPullRequests
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['repository'],
						operation: ['getPullRequests'],
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
						resource: ['repository'],
						operation: ['getPullRequests'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 50,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-limit
				description:
					'Max number of results to return. Maximum value is <a href="https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-requests">100</a>.',
			},
			{
				displayName: 'Filters',
				name: 'getRepositoryPullRequestsFilters',
				type: 'collection',
				typeOptions: {
					multipleValueButtonText: 'Add Filter',
				},
				displayOptions: {
					show: {
						operation: ['getPullRequests'],
						resource: ['repository'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'State',
						name: 'state',
						type: 'options',
						options: [
							{
								name: 'All',
								value: 'all',
								description: 'Returns pull requests with any state',
							},
							{
								name: 'Closed',
								value: 'closed',
								description: 'Return pull requests with "closed" state',
							},
							{
								name: 'Open',
								value: 'open',
								description: 'Return pull requests with "open" state',
							},
						],
						default: 'open',
						description: 'The state to set',
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
								name: 'Popularity',
								value: 'popularity',
								description: 'Sort by number of comments',
							},
							{
								name: 'Long-Running',
								value: 'long-running',
								description:
									'Sort by date created and will limit the results to pull requests that have been open for more than a month and have had activity within the past month',
							},
						],
						default: 'created',
						description: 'The order the pull requests should be returned in',
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
						description: 'The sort order',
					},
				],
			},

			// ----------------------------------
			//         rerview
			// ----------------------------------

			// ----------------------------------
			//         review:getAll
			// ----------------------------------
			{
				displayName: 'PR Number',
				name: 'pullRequestNumber',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: ['get', 'update'],
						resource: ['review'],
					},
				},
				description: 'The number of the pull request',
			},
			{
				displayName: 'Review ID',
				name: 'reviewId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['get', 'update'],
						resource: ['review'],
					},
				},
				description: 'ID of the review',
			},

			// ----------------------------------
			//         review:getAll
			// ----------------------------------
			{
				displayName: 'PR Number',
				name: 'pullRequestNumber',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: ['getAll'],
						resource: ['review'],
					},
				},
				description: 'The number of the pull request',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['review'],
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
						resource: ['review'],
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

			// ----------------------------------
			//         review:create
			// ----------------------------------
			{
				displayName: 'PR Number',
				name: 'pullRequestNumber',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['review'],
					},
				},
				description: 'The number of the pull request to review',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['review'],
					},
				},
				options: [
					{
						name: 'Approve',
						value: 'approve',
						description: 'Approve the pull request',
					},
					{
						name: 'Request Change',
						value: 'requestChanges',
						description: 'Request code changes',
					},
					{
						name: 'Comment',
						value: 'comment',
						description: 'Add a comment without approval or change requests',
					},
					{
						name: 'Pending',
						value: 'pending',
						description: 'You will need to submit the pull request review when you are ready',
					},
				],
				default: 'approve',
				description: 'The review action you want to perform',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['review'],
						event: ['requestChanges', 'comment'],
					},
				},
				default: '',
				description: 'The body of the review (required for events Request Changes or Comment)',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				placeholder: 'Add Field',
				type: 'collection',
				default: {},
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['review'],
					},
				},
				options: [
					{
						displayName: 'Commit ID',
						name: 'commitId',
						type: 'string',
						default: '',
						description: 'The SHA of the commit that needs a review, if different from the latest',
					},
				],
			},

			// ----------------------------------
			//         review:update
			// ----------------------------------
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update'],
						resource: ['review'],
					},
				},
				default: '',
				description: 'The body of the review',
			},

			// ----------------------------------
			//       user:getRepositories
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['getRepositories'],
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
						resource: ['user'],
						operation: ['getRepositories'],
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

			// ----------------------------------
			//         user:invite
			// ----------------------------------
			{
				displayName: 'Organization',
				name: 'organization',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['invite'],
						resource: ['user'],
					},
				},
				description: 'The GitHub organization that the user is being invited to',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['invite'],
						resource: ['user'],
					},
				},
				description: 'The email address of the invited user',
			},

			// ----------------------------------
			//    organization:getRepositories
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['organization'],
						operation: ['getRepositories'],
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
						resource: ['organization'],
						operation: ['getRepositories'],
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

			// ----------------------------------
			//         user:getIssues
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getUserIssues'],
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
						operation: ['getUserIssues'],
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
				name: 'getUserIssuesFilters',
				type: 'collection',
				typeOptions: {
					multipleValueButtonText: 'Add Filter',
				},
				displayOptions: {
					show: {
						operation: ['getUserIssues'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Mentioned',
						name: 'mentioned',
						type: 'string',
						default: '',
						description: 'Return only issues in which a specific user was mentioned',
					},
					{
						displayName: 'Labels',
						name: 'labels',
						type: 'string',
						default: '',
						description:
							'Return only issues with the given labels. Multiple labels can be separated by comma.',
					},
					{
						displayName: 'Updated Since',
						name: 'since',
						type: 'dateTime',
						default: '',
						description: 'Return only issues updated at or after this time',
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
						description: 'The state to set',
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
						description: 'The order the issues should be returned in',
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
						description: 'The sort order',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			getRefs,
			getRepositories,
			getUsers,
			getWorkflows,
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const requestObject = this.getRequestObject();

		return {
			workflowData: [this.helpers.returnJsonArray(requestObject.body)],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		let returnAll = false;

		let responseData;

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
			'release:delete',
			'release:get',
			'release:update',
			'repository:get',
			'repository:getLicense',
			'repository:getProfile',
			'review:create',
			'review:get',
			'review:update',
			'user:invite',
			'workflow:disable',
			'workflow:dispatch',
			'workflow:enable',
			'workflow:get',
			'workflow:getUsage',
			'workflow:list',
		];
		// Operations which overwrite the returned data and return arrays
		// and has so to be merged with the data of other items
		const overwriteDataOperationsArray = [
			'file:list',
			'repository:getIssues',
			'repository:getPullRequests',
			'repository:listPopularPaths',
			'repository:listReferrers',
			'user:getRepositories',
			'user:getUserIssues',
			'release:getAll',
			'review:getAll',
			'organization:getRepositories',
		];

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: IHttpRequestMethods;
		let endpoint: string;

		const operation = this.getNodeParameter('operation', 0);
		const resource = this.getNodeParameter('resource', 0);
		const fullOperation = `${resource}:${operation}`;

		if (resource === 'workflow' && operation === 'dispatchAndWait') {
			const owner = this.getNodeParameter('owner', 0, '', { extractValue: true }) as string;
			const repository = this.getNodeParameter('repository', 0, '', {
				extractValue: true,
			}) as string;
			const workflowId = this.getNodeParameter('workflowId', 0, '', {
				extractValue: true,
			}) as string;
			const ref = this.getNodeParameter('ref', 0, '', { extractValue: true }) as string;

			const inputs = validateJSON(this.getNodeParameter('inputs', 0) as string) as IDataObject;
			if (!inputs) {
				throw new NodeOperationError(this.getNode(), 'Inputs: Invalid JSON');
			}

			endpoint = `/repos/${owner}/${repository}/actions/workflows/${workflowId}/dispatches`;

			body = {
				ref,
				inputs,
			};

			// Generate a webhook URL for the GitHub workflow to call when done
			const resumeUrl = this.getWorkflowDataProxy(0).$execution.resumeUrl;

			body.inputs = {
				...inputs,
				resumeUrl,
			};

			try {
				responseData = await githubApiRequest.call(this, 'POST', endpoint, body);
			} catch (error) {
				if (error.httpCode === '404' || error.statusCode === 404) {
					throw new NodeOperationError(
						this.getNode(),
						'The workflow to dispatch could not be found. Adjust the "workflow" parameter setting to dispatch the workflow correctly.',
						{ itemIndex: 0 },
					);
				}
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}

			await this.putExecutionToWait(WAIT_INDEFINITELY);
			return [this.getInputData()];
		}

		for (let i = 0; i < items.length; i++) {
			try {
				// Reset all values
				requestMethod = 'GET';
				endpoint = '';
				body = {};
				qs = {};

				let owner = '';
				if (fullOperation !== 'user:invite' && fullOperation !== 'user:getUserIssues') {
					// Request the parameters which almost all operations need
					owner = this.getNodeParameter('owner', i, '', { extractValue: true }) as string;
				}

				let repository = '';
				if (
					fullOperation !== 'user:getRepositories' &&
					fullOperation !== 'user:getUserIssues' &&
					fullOperation !== 'user:invite' &&
					fullOperation !== 'organization:getRepositories'
				) {
					repository = this.getNodeParameter('repository', i, '', { extractValue: true }) as string;
				}

				if (resource === 'file') {
					if (['create', 'edit'].includes(operation)) {
						// ----------------------------------
						//         create/edit
						// ----------------------------------

						requestMethod = 'PUT';

						const filePath = removeTrailingSlash(this.getNodeParameter('filePath', i));

						const additionalParameters = this.getNodeParameter(
							'additionalParameters',
							i,
							{},
						) as IDataObject;
						if (additionalParameters.author) {
							body.author = additionalParameters.author;
						}
						if (additionalParameters.committer) {
							body.committer = additionalParameters.committer;
						}
						if (
							additionalParameters.branch &&
							(additionalParameters.branch as IDataObject).branch
						) {
							body.branch = (additionalParameters.branch as IDataObject).branch;
						}

						if (operation === 'edit') {
							// If the file should be updated the request has to contain the SHA
							// of the file which gets replaced.
							body.sha = await getFileSha.call(
								this,
								owner,
								repository,
								filePath,
								body.branch as string | undefined,
							);
						}

						body.message = this.getNodeParameter('commitMessage', i) as string;

						if (this.getNodeParameter('binaryData', i)) {
							// Currently internally n8n uses base64 and also Github expects it base64 encoded.
							// If that ever changes the data has to get converted here.
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
							const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
							// TODO: Does this work with filesystem mode
							body.content = binaryData.data;
						} else {
							const fileContent = this.getNodeParameter('fileContent', i) as string;
							if (isBase64(fileContent)) {
								body.content = fileContent;
							} else {
								body.content = Buffer.from(fileContent).toString('base64');
							}
						}

						endpoint = `/repos/${owner}/${repository}/contents/${encodeURIComponent(filePath)}`;
					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const additionalParameters = this.getNodeParameter(
							'additionalParameters',
							i,
							{},
						) as IDataObject;
						if (additionalParameters.author) {
							body.author = additionalParameters.author;
						}
						if (additionalParameters.committer) {
							body.committer = additionalParameters.committer;
						}
						if (
							additionalParameters.branch &&
							(additionalParameters.branch as IDataObject).branch
						) {
							body.branch = (additionalParameters.branch as IDataObject).branch;
						}

						const filePath = removeTrailingSlash(this.getNodeParameter('filePath', i));
						body.message = this.getNodeParameter('commitMessage', i) as string;

						body.sha = await getFileSha.call(
							this,
							owner,
							repository,
							filePath,
							body.branch as string | undefined,
						);

						endpoint = `/repos/${owner}/${repository}/contents/${encodeURIComponent(filePath)}`;
					} else if (operation === 'get') {
						requestMethod = 'GET';

						const filePath = removeTrailingSlash(this.getNodeParameter('filePath', i));
						const additionalParameters = this.getNodeParameter(
							'additionalParameters',
							i,
						) as IDataObject;

						if (additionalParameters.reference) {
							qs.ref = additionalParameters.reference;
						}

						endpoint = `/repos/${owner}/${repository}/contents/${encodeURIComponent(filePath)}`;
					} else if (operation === 'list') {
						requestMethod = 'GET';
						const filePath = removeTrailingSlash(this.getNodeParameter('filePath', i));
						endpoint = `/repos/${owner}/${repository}/contents/${encodeURIComponent(filePath)}`;
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

						body.labels = labels.map((data) => data.label);
						body.assignees = assignees.map((data) => data.assignee);

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
							body.labels = (body.labels as IDataObject[]).map((data) => data.label);
						}
						if (body.assignees !== undefined) {
							body.assignees = (body.assignees as IDataObject[]).map((data) => data.assignee);
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

						body = this.getNodeParameter('additionalFields', i, {});

						body.tag_name = this.getNodeParameter('releaseTag', i) as string;

						endpoint = `/repos/${owner}/${repository}/releases`;
					}
					if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';

						const releaseId = this.getNodeParameter('release_id', i) as string;

						endpoint = `/repos/${owner}/${repository}/releases/${releaseId}`;
					}
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';

						const releaseId = this.getNodeParameter('release_id', i) as string;

						endpoint = `/repos/${owner}/${repository}/releases/${releaseId}`;
					}
					if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						requestMethod = 'GET';

						endpoint = `/repos/${owner}/${repository}/releases`;

						returnAll = this.getNodeParameter('returnAll', 0);

						if (!returnAll) {
							qs.per_page = this.getNodeParameter('limit', 0);
						}
					}
					if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PATCH';

						const releaseId = this.getNodeParameter('release_id', i) as string;

						body = this.getNodeParameter('additionalFields', i, {});

						endpoint = `/repos/${owner}/${repository}/releases/${releaseId}`;
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

						returnAll = this.getNodeParameter('returnAll', 0);

						if (!returnAll) {
							qs.per_page = this.getNodeParameter('limit', 0);
						}
					} else if (operation === 'getPullRequests') {
						// ----------------------------------
						//         getPullRequests
						// ----------------------------------

						requestMethod = 'GET';

						qs = this.getNodeParameter('getRepositoryPullRequestsFilters', i) as IDataObject;

						endpoint = `/repos/${owner}/${repository}/pulls`;

						returnAll = this.getNodeParameter('returnAll', 0);

						if (!returnAll) {
							qs.per_page = this.getNodeParameter('limit', 0);
						}
					}
				} else if (resource === 'review') {
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------
						requestMethod = 'GET';

						const reviewId = this.getNodeParameter('reviewId', i) as string;

						const pullRequestNumber = this.getNodeParameter('pullRequestNumber', i) as string;

						endpoint = `/repos/${owner}/${repository}/pulls/${pullRequestNumber}/reviews/${reviewId}`;
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------
						requestMethod = 'GET';

						returnAll = this.getNodeParameter('returnAll', 0);

						const pullRequestNumber = this.getNodeParameter('pullRequestNumber', i) as string;

						if (!returnAll) {
							qs.per_page = this.getNodeParameter('limit', 0);
						}

						endpoint = `/repos/${owner}/${repository}/pulls/${pullRequestNumber}/reviews`;
					} else if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------
						requestMethod = 'POST';

						const pullRequestNumber = this.getNodeParameter('pullRequestNumber', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(body, additionalFields);

						body.event = snakeCase(this.getNodeParameter('event', i) as string).toUpperCase();
						if (body.event === 'REQUEST_CHANGES' || body.event === 'COMMENT') {
							body.body = this.getNodeParameter('body', i) as string;
						}

						endpoint = `/repos/${owner}/${repository}/pulls/${pullRequestNumber}/reviews`;
					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------
						requestMethod = 'PUT';

						const pullRequestNumber = this.getNodeParameter('pullRequestNumber', i) as string;
						const reviewId = this.getNodeParameter('reviewId', i) as string;

						body.body = this.getNodeParameter('body', i) as string;

						endpoint = `/repos/${owner}/${repository}/pulls/${pullRequestNumber}/reviews/${reviewId}`;
					}
				} else if (resource === 'user') {
					if (operation === 'getRepositories') {
						// ----------------------------------
						//         getRepositories
						// ----------------------------------

						requestMethod = 'GET';

						endpoint = `/users/${owner}/repos`;

						returnAll = this.getNodeParameter('returnAll', 0);

						if (!returnAll) {
							qs.per_page = this.getNodeParameter('limit', 0);
						}
					} else if (operation === 'getUserIssues') {
						// ----------------------------------
						//         getIssues
						// ----------------------------------
						requestMethod = 'GET';

						endpoint = '/issues';

						qs = this.getNodeParameter('getUserIssuesFilters', i, {}) as IDataObject;

						returnAll = this.getNodeParameter('returnAll', 0);
						if (!returnAll) {
							qs.per_page = this.getNodeParameter('limit', 0);
						}
					} else if (operation === 'invite') {
						// ----------------------------------
						//            invite
						// ----------------------------------

						requestMethod = 'POST';
						const org = this.getNodeParameter('organization', i) as string;
						endpoint = `/orgs/${org}/invitations`;
						body.email = this.getNodeParameter('email', i) as string;
					}
				} else if (resource === 'organization') {
					if (operation === 'getRepositories') {
						// ----------------------------------
						//         getRepositories
						// ----------------------------------

						requestMethod = 'GET';

						endpoint = `/orgs/${owner}/repos`;
						returnAll = this.getNodeParameter('returnAll', 0);

						if (!returnAll) {
							qs.per_page = this.getNodeParameter('limit', 0);
						}
					}
				} else if (resource === 'workflow') {
					if (operation === 'disable') {
						// ----------------------------------
						//         disable
						// ----------------------------------

						requestMethod = 'PUT';

						const workflowId = this.getNodeParameter('workflowId', i, '', {
							extractValue: true,
						}) as string;

						endpoint = `/repos/${owner}/${repository}/actions/workflows/${workflowId}/disable`;
					}
					if (operation === 'dispatch') {
						// ----------------------------------
						//         dispatch
						// ----------------------------------

						requestMethod = 'POST';

						const workflowId = this.getNodeParameter('workflowId', i, '', {
							extractValue: true,
						}) as string;

						endpoint = `/repos/${owner}/${repository}/actions/workflows/${workflowId}/dispatches`;

						const ref = this.getNodeParameter('ref', i, '', { extractValue: true }) as string;
						body.ref = ref;

						const inputs = validateJSON(
							this.getNodeParameter('inputs', i) as string,
						) as IDataObject;
						if (inputs === undefined) {
							throw new NodeOperationError(this.getNode(), 'Inputs: Invalid JSON', {
								itemIndex: i,
							});
						}
						body.inputs = inputs;
					} else if (operation === 'enable') {
						// ----------------------------------
						//         enable
						// ----------------------------------

						requestMethod = 'PUT';

						const workflowId = this.getNodeParameter('workflowId', i, '', {
							extractValue: true,
						}) as string;

						endpoint = `/repos/${owner}/${repository}/actions/workflows/${workflowId}/enable`;
					} else if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';

						const workflowId = this.getNodeParameter('workflowId', i, '', {
							extractValue: true,
						}) as string;

						endpoint = `/repos/${owner}/${repository}/actions/workflows/${workflowId}`;
					} else if (operation === 'getUsage') {
						// ----------------------------------
						//         getUsage
						// ----------------------------------

						requestMethod = 'GET';

						const workflowId = this.getNodeParameter('workflowId', i, '', {
							extractValue: true,
						}) as string;

						endpoint = `/repos/${owner}/${repository}/actions/workflows/${workflowId}/timing`;
					} else if (operation === 'list') {
						// ----------------------------------
						//         list
						// ----------------------------------

						requestMethod = 'GET';

						endpoint = `/repos/${owner}/${repository}/actions/workflows`;
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
						itemIndex: i,
					});
				}

				const asBinaryProperty = this.getNodeParameter('asBinaryProperty', i, false) as boolean;
				if (returnAll) {
					responseData = await githubApiRequestAllItems.call(
						this,
						requestMethod,
						endpoint,
						body,
						qs,
					);
				} else {
					responseData = await githubApiRequest.call(this, requestMethod, endpoint, body, qs);
				}

				if (fullOperation === 'file:get') {
					if (asBinaryProperty) {
						if (Array.isArray(responseData) && responseData.length > 1) {
							throw new NodeOperationError(this.getNode(), 'File Path is a folder, not a file.', {
								itemIndex: i,
							});
						}
						// Add the returned data to the item as binary property
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);

						const newItem: INodeExecutionData = {
							json: items[i].json,
							binary: {},
							pairedItem: items[i].pairedItem,
						};

						if (items[i].binary !== undefined) {
							// Create a shallow copy of the binary data so that the old
							// data references which do not get changed still stay behind
							// but the incoming data does not get changed.
							Object.assign(newItem.binary as object, items[i].binary!);
						}
						const { content, path } = responseData;
						newItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(
							Buffer.from(content as string, 'base64'),
							path as string,
						);

						returnData.push(newItem);
						continue;
					}
				}

				if (fullOperation === 'release:delete') {
					responseData = { success: true };
				}

				if (
					overwriteDataOperations.includes(fullOperation) ||
					overwriteDataOperationsArray.includes(fullOperation)
				) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					if (
						overwriteDataOperations.includes(fullOperation) ||
						overwriteDataOperationsArray.includes(fullOperation)
					) {
						const executionErrorData = this.helpers.constructExecutionMetaData(
							[
								{
									json: {
										error: error.message,
									},
								},
							],
							{ itemData: { item: i } },
						);
						returnData.push(...executionErrorData);
					} else {
						items[i].json = { error: error.message };
					}
					continue;
				}
				throw error;
			}
		}

		if (
			overwriteDataOperations.includes(fullOperation) ||
			overwriteDataOperationsArray.includes(fullOperation)
		) {
			// Return data gets replaced
			return [returnData];
		} else {
			// For all other ones simply return the unchanged items
			return [items];
		}
	}
}
