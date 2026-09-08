import type { INodeProperties } from 'n8n-workflow';

export const formOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['form'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a form',
				action: 'Get a form',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many forms',
				action: 'Get many forms',
			},
			{
				name: 'Redeploy',
				value: 'redeploy',
				description: 'Redeploy Current Form Version',
				action: 'Redeploy current form version',
			},
		],
		default: 'get',
	},
];

export const formFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                form:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Form name or ID',
		name: 'formId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadForms',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['get', 'redeploy'],
			},
		},
		description:
			'Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                form:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			maxValue: 3000,
		},
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		default: 1000,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add option',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				placeholder: 'Add sort',
				options: [
					{
						displayName: 'Sort',
						name: 'value',
						values: [
							{
								displayName: 'Descending',
								name: 'descending',
								type: 'boolean',
								default: true,
								description: 'Whether to sort by descending order',
							},
							{
								displayName: 'Order by',
								name: 'ordering',
								type: 'options',
								default: 'date_modified',
								options: [
									{
										name: 'Asset type',
										value: 'asset_type',
									},
									{
										name: 'Date modified',
										value: 'date_modified',
									},
									{
										name: 'Name',
										value: 'name',
									},
									{
										name: 'Owner username',
										value: 'owner__username',
									},
									{
										name: 'Subscribers count',
										value: 'subscribers_count',
									},
								],
								description: 'Field to order by',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: 'asset_type:survey',
				description:
					'A text search query based on form data - e.g. "owner__username:meg AND name__icontains:quixotic" - see <a href="https://github.com/kobotoolbox/kpi#searching" target="_blank">docs</a> for more details',
			},
		],
	},
];
