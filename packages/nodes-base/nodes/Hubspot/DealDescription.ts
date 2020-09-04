import {
	INodeProperties,
 } from 'n8n-workflow';

export const dealOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a deal',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a deal',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a deal',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all deals',
			},
			{
				name: 'Get Recently Created',
				value: 'getRecentlyCreated',
				description: 'Get recently created deals',
			},
			{
				name: 'Get Recently Modified',
				value: 'getRecentlyModified',
				description: 'Get recently modified deals',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a deal',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const dealFields = [

/* -------------------------------------------------------------------------- */
/*                                deal:create                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal Stage',
		name: 'stage',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDealStages'
		},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		options: [],
		description: 'The dealstage is required when creating a deal. See the CRM Pipelines API for details on managing pipelines and stages.',
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
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Deal Name',
				name: 'dealName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Pipeline',
				name: 'pipeline',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Close Date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal Type',
				name: 'dealType',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDealTypes',
				},
				default: '',
			},
			{
				displayName: 'Associated Company',
				name: 'associatedCompany',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod:'getCompanies' ,
				},
				default: [],
			},
			{
				displayName: 'Associated Vids',
				name: 'associatedVids',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod:'getContacts' ,
				},
				default: [],
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                                 deal:update                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular deal',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Update Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Deal Name',
				name: 'dealName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal Stage',
				name: 'stage',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getDealStages'
				},
				default: '',
				description: 'The dealstage is required when creating a deal. See the CRM Pipelines API for details on managing pipelines and stages.',
			},
			{
				displayName: 'Pipeline',
				name: 'pipeline',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Close Date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal Type',
				name: 'dealType',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDealTypes',
				},
				default: '',
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                                  deal:get                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular deal',
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
					'deal',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Include Property Versions	',
				name: 'includePropertyVersions',
				type: 'boolean',
				default: false,
				description: `By default, you will only get data for the most recent version of a property in the "versions" data.<br/>
				If you include this parameter, you will get data for all previous versions.`,
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                                 deal:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'deal',
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
					'deal',
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
			maxValue: 250,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Include Associations',
				name: 'includeAssociations',
				type: 'boolean',
				default: false,
				description: `Include the IDs of the associated contacts and companies in the results<br/>.
				This will also automatically include the num_associated_contacts property.`,
			},
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'string',
				default: '',
				description: `Used to include specific deal properties in the results.<br/>
				By default, the results will only include Deal ID and will not include the values for any properties for your Deals.<br/>
				Including this parameter will include the data for the specified property in the results.<br/>
				You can include this parameter multiple times to request multiple properties separed by ,.`,
			},
			{
				displayName: 'Properties With History',
				name: 'propertiesWithHistory',
				type: 'string',
				default: '',
				description: `Works similarly to properties=, but this parameter will include the history for the specified property,<br/>
				instead of just including the current value. Use this parameter when you need the full history of changes to a property's value.`,
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                                 deal:delete                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular deal',
	},
/* -------------------------------------------------------------------------- */
/*               deal:getRecentlyCreated deal:getRecentlyModified             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'getRecentlyCreated',
					'getRecentlyModified',
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
					'deal',
				],
				operation: [
					'getRecentlyCreated',
					'getRecentlyModified',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'getRecentlyCreated',
					'getRecentlyModified',
				],
			},
		},
		options: [
			{
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description: `Only return deals created after timestamp x`,
			},
			{
				displayName: 'Include Property Versions',
				name: 'includePropertyVersions',
				type: 'boolean',
				default: false,
				description: `By default, you will only get data for the most recent version of a property in the "versions" data.<br/>
				If you include this parameter, you will get data for all previous versions.`,
			},
		]
	},
] as INodeProperties[];
