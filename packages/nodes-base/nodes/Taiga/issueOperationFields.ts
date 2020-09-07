import { INodeProperties } from 'n8n-workflow';

export const issueOperationFields = [
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
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
		required: true,
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['taigaUrl'],
			loadOptionsMethod: 'getStatuses',
		},
		default: '',
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
	},
	{
		displayName: 'Subject',
		name: 'subjectEdit',
		type: 'string',
		default: '',
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
	},
	{
		displayName: 'Subject',
		name: 'subjectCreate',
		type: 'string',
		default: '',
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
		required: true,
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		description: 'Tags separated by comma.',
		default: '',
		placeholder: 'product, sales',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['taigaUrl', 'project'],
			loadOptionsMethod: 'getTypes'
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
	},
] as INodeProperties[];
