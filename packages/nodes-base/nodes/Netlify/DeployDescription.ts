import { INodeProperties } from 'n8n-workflow';

export const deployOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['deploy'],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a deployment',
				action: 'Cancel a deployment',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new deployment',
				action: 'Create a deployment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a deployment',
				action: 'Get a deployment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all deployments',
				action: 'Get many deployments',
			},
		],
		default: 'getAll',
	},
];

export const deployFields: INodeProperties[] = [
	{
		displayName: 'Site Name or ID',
		name: 'siteId',
		required: true,
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getSites',
		},
		description:
			'Enter the Site ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['deploy'],
				operation: ['get', 'create', 'getAll'],
			},
		},
	},
	{
		displayName: 'Deploy ID',
		name: 'deployId',
		required: true,
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['deploy'],
				operation: ['get', 'cancel'],
			},
		},
	},
	// ----- Get All Deploys ------ //
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['deploy'],
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
				operation: ['getAll'],
				resource: ['deploy'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	// ---- Create Site Deploy ---- //
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Fields',
		default: {},
		displayOptions: {
			show: {
				resource: ['deploy'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Branch',
				name: 'branch',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
		],
	},
];
