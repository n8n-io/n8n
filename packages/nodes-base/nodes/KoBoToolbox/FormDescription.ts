import {
	INodeProperties,
} from 'n8n-workflow';

export const formOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'form',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a form',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all forms',
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
		displayName: 'Form ID',
		name: 'formId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'form',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg)',
	},
	/* -------------------------------------------------------------------------- */
	/*                                form:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'form',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Whether to return all results',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		required: false,
		typeOptions: {
			maxValue: 3000,
		},
		displayOptions: {
			show: {
				resource: [
					'form',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		default: 1000,
		description: 'The number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'form',
				],
				operation: [
					'getAll',
				],
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
				default: '',
				placeholder: 'Add Sort',
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
								description: 'Sort by descending order',
							},
							{
								displayName: 'Order By',
								name: 'ordering',
								type: 'options',
								required: false,
								default: 'date_modified',
								options: [
									{
										name: 'Asset Type',
										value: 'asset_type',
									},
									{
										name: 'Date Modified',
										value: 'date_modified',
									},
									{
										name: 'Name',
										value: 'name',
									},
									{
										name: 'Owner Username',
										value: 'owner__username',
									},
									{
										name: 'Subscribers Count',
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
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'form',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: 'asset_type:survey',
				required: false,
				description: 'A text search query based on form data - e.g. "owner__username:meg AND name__icontains:quixotic" - see <a href="https://github.com/kobotoolbox/kpi#searching" target="_blank">docs</a> for more details',
			},
		],
	},
];
