import {
	INodeProperties,
 } from 'n8n-workflow';

export const commentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
			},
		},
		options: [
			{
				name: 'Approve',
				value: 'approve',
				description: 'Approve a comment.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a comment',
			},
			{
				name: 'Reject',
				value: 'reject',
				description: 'Reject a comment',
			},
		],
		default: 'approve',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const commentFields = [
/* -------------------------------------------------------------------------- */
/*                                 comment:approve                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'approve',
				],
				resource: [
					'comment',
				],
			},
		},
		default: '',
		description: 'The comment ID.',
	},
	{
		displayName: 'Sequence Number',
		name: 'sequenceNumber',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'approve',
				],
				resource: [
					'comment',
				],
			},
		},
		default: '',
		description: 'The sequence number of the comment being approved.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'approve',
				],
				resource: [
					'comment',
				],
			},
		},
		options: [
			{
				displayName: 'Reviewer Type',
				name: 'reviewerType',
				type: 'options',
				options: [
					{
						name: 'External',
						value: 'external',
					},
					{
						name: 'Member',
						value: 'member',
					},
				],
				default: 'external',
				description: 'The actor that will be approving the comment',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 comment:get                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'comment',
				],
			},
		},
		default: '',
		description: 'The comment ID.',
	},
/* -------------------------------------------------------------------------- */
/*                                 comment:reject                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'reject',
				],
				resource: [
					'comment',
				],
			},
		},
		description: 'The comment ID.',
		default: '',
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				operation: [
					'reject',
				],
				resource: [
					'comment',
				],
			},
		},
		default: '',
		description: 'The rejection reason to be displayed to the creator of the comment.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'reject',
				],
				resource: [
					'comment',
				],
			},
		},
		options: [
			{
				displayName: 'Reviewer Type',
				name: 'reviewerType',
				type: 'options',
				options: [
					{
						name: 'External',
						value: 'external',
					},
					{
						name: 'Member',
						value: 'member',
					},
				],
				default: 'external',
				description: 'The actor that will be approving the comment',
			},
		],
	},
] as INodeProperties[];
