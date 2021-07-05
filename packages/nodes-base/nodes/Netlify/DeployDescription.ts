import { INodeProperties } from 'n8n-workflow';

export const deployOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'deploy',
				],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancelSiteDeploy',
				description: 'Cancel a deploy',
			},
			{
				name: 'Create',
				value: 'createSiteDeploy',
				description: 'Create a new deploy',
			},
			{
				name: 'Get',
				value: 'getSiteDeploy',
				description: 'Returns the specified deploy',
			},
			{
				name: 'Get All',
				value: 'listSiteDeploys',
				description: 'Returns all deploys of a site',
			},
			{
				name: 'Rollback',
				value: 'rollbackSiteDeploy',
				description: 'Rollback site deploy',
			},
			// {
			// 	name: 'Update',
			// 	value: 'updateSiteDeploys',
			// 	description: 'Updates a site deploy',
			// },
		],
		default: 'listSiteDeploys',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const deployFields = [
	{
		displayName: 'Site ID',
		name: 'siteId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSites',
		},
		description: 'Enter the Site ID',
		displayOptions:{
			show: {
				resource: [
					'deploy',
				],
				operation: [
					'getSiteDeploy',
					'createSiteDeploy',
					'listSiteDeploys',
					'rollbackSiteDeploy',
				],
			},
		},
	},
	{
		displayName: 'Deploy ID',
		name: 'deployId',
		required: true,
		type: 'string',
		displayOptions:{
			show: {
				resource: [
					'deploy',
				],
				operation: [
					'getSiteDeploy',
					'cancelSiteDeploy',
				],
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
				operation: [
					'listSiteDeploys',
				],
				resource: [
					'deploy',
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
					'listSiteDeploys',
				],
				resource: [
					'deploy',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 50,
		description: 'How many results to return.',
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
				resource: [
					'deploy',
				],
				operation: [
					'createSiteDeploy',
				],
			},
		},
		options: [
			{
				displayName: 'Async',
				name: 'async',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Branch',
				name: 'branch',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Draft',
				name: 'draft',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Framework',
				name: 'framework',
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
] as INodeProperties[];
