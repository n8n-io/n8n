import {
	INodeProperties,
} from 'n8n-workflow';

export const formQueryOptions = [
	{
		displayName: 'Options',
		name: 'formQueryOptions',
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
				displayName: 'Order By',
				name: 'ordering',
				type: 'options',
				required: false,
				default: 'date_modified',
				description:'Field to order by',
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
			},
			{
				displayName: 'Descending',
				name: 'descending',
				type: 'boolean',
				default: true,
				description:'Sort by descending order',
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'formFilterOptions',
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
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: 'asset_type:survey',
				required: false,
				description:'A text search query based on form data - e.g. "owner__username:meg AND name__icontains:quixotic" - see https://github.com/kobotoolbox/kpi#searching for more details',
			},
		],
	},
] as INodeProperties[];
