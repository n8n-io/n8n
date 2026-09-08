import type { INodeProperties } from 'n8n-workflow';

export const pullRequestFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['pullRequest'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new pull request',
				action: 'Create a pull request',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a pull request',
				action: 'Update a pull request',
			},
			{
				name: 'Close',
				value: 'close',
				description: 'Close a pull request',
				action: 'Close a pull request',
			},
			{
				name: 'Reopen',
				value: 'reopen',
				description: 'Reopen a pull request',
				action: 'Reopen a pull request',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data of a single pull request',
				action: 'Get a pull request',
			},
			{
				name: 'Create comment',
				value: 'createComment',
				description: 'Create a new comment on a pull request',
				action: 'Create a comment on a pull request',
			},
			{
				name: 'Edit comment',
				value: 'editComment',
				description: 'Edit a comment on a pull request',
				action: 'Edit a comment on a pull request',
			},
			{
				name: 'Get diff',
				value: 'getDiff',
				description: 'Get the raw diff of a pull request',
				action: 'Get a pull request diff',
			},
			{
				name: 'Get patch',
				value: 'getPatch',
				description: 'Get the raw patch of a pull request',
				action: 'Get a pull request patch',
			},
			{
				name: 'Merge',
				value: 'merge',
				description: 'Merge a pull request',
				action: 'Merge a pull request',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//         pullRequest:create
	// ----------------------------------
	{
		displayName: 'Base branch',
		name: 'base',
		type: 'string',
		default: '',
		required: true,
		description: 'The branch you want to merge into (e.g. master)',
		placeholder: 'master',
		displayOptions: { show: { resource: ['pullRequest'], operation: ['create'] } },
	},
	{
		displayName: 'Head branch',
		name: 'head',
		type: 'string',
		default: '',
		required: true,
		description:
			'The branch containing your changes. For a cross‑fork PR, use the format owner:branchname (e.g. johndoe:featurebranch).',
		placeholder: 'feature or johndoe:featurebranch',
		displayOptions: { show: { resource: ['pullRequest'], operation: ['create'] } },
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		description: 'The title of the pull request',
		displayOptions: { show: { resource: ['pullRequest'], operation: ['create'] } },
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 5 },
		default: '',
		description: 'The body of the pull request',
		displayOptions: { show: { resource: ['pullRequest'], operation: ['create'] } },
	},
	{
		displayName: 'Create a draft pull request',
		name: 'draft',
		type: 'boolean',
		default: false,
		description: 'Whether to create the pull request as a draft',
		displayOptions: { show: { resource: ['pullRequest'], operation: ['create'] } },
	},

	// ----------------------------------------------------------
	// Shared PR Number field (all operations that need it)
	// ----------------------------------------------------------
	{
		displayName: 'PR number',
		name: 'pullRequestNumber',
		type: 'number',
		default: 0,
		required: true,
		description: 'The number of the pull request',
		displayOptions: {
			show: {
				resource: ['pullRequest'],
				operation: [
					'update',
					'close',
					'reopen',
					'get',
					'createComment',
					'getDiff',
					'getPatch',
					'merge',
				],
			},
		},
	},

	// ----------------------------------
	//         pullRequest:update (Edit Fields)
	// ----------------------------------
	{
		displayName: 'Edit Fields',
		name: 'editFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['pullRequest'], operation: ['update'] } },
		options: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The new title of the pull request',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				description: 'The new body of the pull request',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{ name: 'Open', value: 'open' },
					{ name: 'Closed', value: 'closed' },
				],
				default: '',
				description: 'The state of the pull request',
			},
			{
				displayName: 'Base branch',
				name: 'base',
				type: 'string',
				default: '',
				description: 'The branch you want to merge into (e.g. master)',
			},
		],
	},

	// ----------------------------------
	//         pullRequest:createComment (Body)
	// ----------------------------------
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 5 },
		displayOptions: {
			show: {
				operation: ['createComment'],
				resource: ['pullRequest'],
			},
		},
		default: '',
		required: true,
		description: 'The body of the comment',
	},

	// ----------------------------------
	//         pullRequest:editComment
	// ----------------------------------
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'number',
		default: 0,
		required: true,
		description: 'The ID of the comment to edit',
		displayOptions: {
			show: {
				operation: ['editComment'],
				resource: ['pullRequest'],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 5 },
		displayOptions: {
			show: {
				operation: ['editComment'],
				resource: ['pullRequest'],
			},
		},
		default: '',
		required: true,
		description: 'The body of the comment',
	},

	// ----------------------------------
	//         pullRequest:merge
	// ----------------------------------
	{
		displayName: 'Merge method',
		name: 'mergeMethod',
		type: 'options',
		options: [
			{ name: 'Merge commit', value: 'merge' },
			{ name: 'Squash and merge', value: 'squash' },
			{ name: 'Rebase and merge', value: 'rebase' },
		],
		default: 'merge',
		displayOptions: { show: { resource: ['pullRequest'], operation: ['merge'] } },
	},
	{
		displayName: 'Commit title',
		name: 'commitTitle',
		type: 'string',
		default: '',
		description: 'Title for the automatic merge commit',
		displayOptions: { show: { resource: ['pullRequest'], operation: ['merge'] } },
	},
	{
		displayName: 'Commit message',
		name: 'commitMessage',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'Extra detail to append to automatic merge commit',
		displayOptions: { show: { resource: ['pullRequest'], operation: ['merge'] } },
	},
	{
		displayName:
			'If a merge queue is required on the target branch, this request will automatically enqueue the pull request and return 202 Accepted. If no queue is required, the pull request will be merged immediately and return 200 OK.',
		name: 'mergeQueueNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['pullRequest'],
				operation: ['merge'],
			},
		},
	},
];
