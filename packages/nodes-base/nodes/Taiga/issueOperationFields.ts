import {
	INodeProperties,
} from 'n8n-workflow';

export const issueOperationFields = [
	{
		displayName: 'Project Slug',
		name: 'projectSlug',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create',
					'getAll',
				],
			},
		},
		default: '',
		description: 'The project slug.  ',
		required: true,
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Assigned To',
				name: 'assigned_to',
				type: 'string',
				default: '',
				description: 'User id to you want assign the issue to',
			},
			{
				displayName: 'Blocked Note',
				name: 'blocked_note',
				type: 'string',
				default: '',
				description: 'Reason why the issue is blocked',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Is Blocked',
				name: 'is_blocked',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Is Closed',
				name: 'is_closed',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Milestone ID',
				name: 'milestone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Priority ID',
				name: 'priority',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Severity ID',
				name: 'severity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getStatuses',
				},
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				description: 'Tags separated by comma.',
				default: '',
				placeholder: 'product, sales',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getTypes'
				},
				default: '',
			},
			{
				displayName: 'Watcher IDs',
				name: 'watchers',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Issue ID',
		name: 'issueId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'update',
					'delete',
					'get',
				],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Assigned To',
				name: 'assigned_to',
				type: 'string',
				default: '',
				description: 'User id to you want assign the issue to',
			},
			{
				displayName: 'Blocked Note',
				name: 'blocked_note',
				type: 'string',
				default: '',
				description: 'Reason why the issue is blocked',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Is Blocked',
				name: 'is_blocked',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Is Closed',
				name: 'is_closed',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Milestone ID',
				name: 'milestone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Priority ID',
				name: 'priority',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Severity ID',
				name: 'severity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getStatuses',
				},
				default: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				description: 'Tags separated by comma.',
				default: '',
				placeholder: 'product, sales',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getTypes'
				},
				default: '',
			},
			{
				displayName: 'Watcher IDs',
				name: 'watchers',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'issue',
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
				operation: [
					'getAll',
				],
				resource: [
					'issue',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},

] as INodeProperties[];
