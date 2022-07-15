import {
	INodeProperties,
} from 'n8n-workflow';

export const customResourceOperations: INodeProperties[] = [
	{
		displayName: 'Custom Resource Name or ID',
		name: 'customResource',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getModels',
		},
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
			},
		},
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new item',
				action: 'Create an item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item',
				action: 'Delete an item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an item',
				action: 'Get an item',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all items',
				action: 'Get all items',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an item',
				action: 'Update an item',
			},
		],
	},
];

export const customResourceDescription: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                custom:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Fields',
		name: 'fieldsToCreateOrUpdate',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Field',
		},
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'custom',
				],
			},
		},
		options: [
			{
				displayName: 'Field Record:',
				name: 'fields',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'options',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getModelFields',
						},
					},
					{
						displayName: 'New Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                custom:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Custom Resource ID',
		name: 'customResourceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
					'delete',
				],
				resource: [
					'custom',
				],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                custom:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},

	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				resource: [
					'custom',
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
			maxValue: 1000,
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'get',
				],
				resource: [
					'custom',
				],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Fields to Include',
				name: 'fieldsList',
				type: 'multiOptions',
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getModelFields',
					loadOptionsDependsOn: [
						'customResource',
					],
				},
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filterRequest',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Filter',
		},
		default: {},
		description: 'Filter request by applying filters',
		placeholder: 'Add condition',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'custom',
				],
			},
		},
		options: [
			{
				name: 'filter',
				displayName: 'Filter',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'options',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						default: '',
						typeOptions: {
							loadOptionsDependsOn: [
								'customResource',
							],
							loadOptionsMethod: 'getModelFields',
						},
					},
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						default: 'equal',
						description: 'Specify an operator',
						options: [
							{
								name: '!=',
								value: 'notEqual',
							},
							{
								name: '<',
								value: 'lesserThen',
							},
							{
								name: '<=',
								value: 'lesserOrEqual',
							},
							{
								name: '=',
								value: 'equal',
							},
							{
								name: '>',
								value: 'greaterThen',
							},
							{
								name: '>=',
								value: 'greaterOrEqual',
							},
							{
								name: 'Child Of',
								value: 'childOf',
							},
							{
								name: 'In',
								value: 'in',
							},
							{
								name: 'Like',
								value: 'like',
							},
							{
								name: 'Not In',
								value: 'notIn',
							},
						],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Specify value for comparison',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                custom:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Custom Resource ID',
		name: 'customResourceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'custom',
				],
			},
		},
	},

	{
		displayName: 'Update Fields',
		name: 'fieldsToCreateOrUpdate',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Field',
		},
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'custom',
				],
			},
		},
		options: [
			{
				displayName: 'Field Record:',
				name: 'fields',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'options',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getModelFields',
						},
					},
					{
						displayName: 'New Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
];
