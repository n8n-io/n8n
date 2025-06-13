import type { INodeProperties } from 'n8n-workflow';

export const commentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['comment'],
			},
		},
		options: [
			{
				name: 'Add Comment',
				value: 'addComment',
				description: 'Add a comment to an issue',
				action: 'Add a comment to an issue',
			},
		],
		default: 'addComment',
	},
];

export const commentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                comment:addComment                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue ID',
		name: 'issueId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['comment'],
				operation: ['addComment'],
			},
		},
		default: '',
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['comment'],
				operation: ['addComment'],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['comment'],
				operation: ['addComment'],
			},
		},
		options: [
			{
				displayName: 'Parent Comment ID',
				name: 'parentId',
				type: 'string',
				description: 'ID of the parent comment if this is a reply',
				default: '',
			},
		],
	},
];
