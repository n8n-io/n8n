import { INodeProperties } from "n8n-workflow";

export const issueOpeations = [
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
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const issueFields = [

/* -------------------------------------------------------------------------- */
/*                                issue:create                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project',
		name: 'project',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create'
				]
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		description: 'Project',
	},
	{
		displayName: 'Issue Type',
		name: 'issueType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create'
				]
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getIssueTypes',
		},
		description: 'Issue Types',
	},
	{
		displayName: 'Summary',
		name: 'summary',
		type: 'string',
		required: true,
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
		description: 'Summary',
	},
	{
		displayName: 'Parent Issue Identifier',
		name: 'parentIssueId',
		type: 'options',
		required: false,
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
		default: 'id',
		options: [
			{
				name: 'ID',
				value: 'id',
				description: 'Issue ID',
			},
			{
				name: 'Key',
				value: 'key',
				description: 'Issue Key',

			}
		],
		description: 'Parent Issue Identifier',
	},
	{
		displayName: 'Parent Issue Identifier Value',
		name: 'parentIssueIdValue',
		type: 'string',
		required: false,
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
		description: 'Parent Issue ID/Key valie',
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
				displayName: 'Labels',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
				default: [],
				required : false,
				description: 'Labels',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPriorities',
				},
				default: [],
				required : false,
				description: 'Priority',
			},
			{
				displayName: 'Assignee',
				name: 'assignee',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: [],
				required : false,
				description: 'Assignee',
			},
		],
	},
] as INodeProperties[];
