import type { INodeProperties } from 'n8n-workflow';

export const TriggerOptions: INodeProperties[] = [
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getWorkspaces',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'wi0qdp7n',
			},
		],
	},
	{
		displayName: 'Base Name or ID',
		name: 'projectId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsDependsOn: ['workspaceId.value'],
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getBases',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'p979g1063032uw4',
			},
		],
	},
	{
		displayName: 'Table Name or ID',
		name: 'table',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description:
			'The table to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsDependsOn: ['projectId.value'],
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getTables',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'ml0pwy7932yabfg',
			},
		],
	},
	{
		displayName: 'Trigger Field Name',
		name: 'triggerFieldName',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description:
			'The field to watch for trigger to occurs. Choose from the list, or specify a name using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsDependsOn: ['table.value'],
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getTriggerFields',
					searchable: true,
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				placeholder: 'Last Modified Time',
			},
		],
	},
	{
		displayName: 'Download Attachments',
		name: 'downloadAttachments',
		type: 'boolean',
		default: false,
		description: "Whether the attachment fields defined in 'Download Fields' will be downloaded",
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
