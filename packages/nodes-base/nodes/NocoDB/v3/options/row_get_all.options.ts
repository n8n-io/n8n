import { INodeProperties, updateDisplayOptions } from 'n8n-workflow';

export const _rowGetAllOptions: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			// TODO: deprecated, searching for alternative
			// maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Download Attachments',
		name: 'downloadAttachments',
		type: 'boolean',
		default: false,
		description: "Whether the attachment fields define in 'Download Fields' will be downloaded",
	},
	{
		displayName: 'Download Field Name or ID',
		name: 'downloadFieldNames',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDownloadFields',
		},
		required: true,
		displayOptions: {
			show: {
				downloadAttachments: [true],
			},
		},
		default: '',
		description:
			'Name of the fields of type \'attachment\' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add option',
		options: [
			{
				displayName: 'View Name or ID',
				name: 'viewId',
				type: 'options',
				default: '',
				noDataExpression: true,
				description:
					'The view to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsDependsOn: ['table.value'],
					loadOptionsMethod: 'getViews',
				},
				placeholder: 'View ID',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Field',
				},
				default: [],
				placeholder: 'Name',
				description: 'The select fields of the returned rows',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				placeholder: 'Add Sort Rule',
				description: 'The sorting rules for the returned rows',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Property',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
								description: 'Name of the field to sort on',
							},
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
								options: [
									{
										name: 'ASC',
										value: 'asc',
										description: 'Sort in ascending order (small -> large)',
									},
									{
										name: 'DESC',
										value: 'desc',
										description: 'Sort in descending order (large -> small)',
									},
								],
								default: 'asc',
								description: 'The sort direction',
							},
						],
					},
				],
			},
			{
				displayName: 'Filter By Formula',
				name: 'where',
				type: 'string',
				default: '',
				placeholder: '(name,like,example%)~or(name,eq,test)',
				description: 'A formula used to filter rows',
			},
		],
	},
];
export const RowGetAllOptions = updateDisplayOptions(
	{
		show: {
			resource: ['row'],
			operation: ['getAll'],
		},
	},
	_rowGetAllOptions,
);
