import { INodeProperties } from 'n8n-workflow';

export const customObjectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['customObject'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a custom object record',
				action: 'Create a custom object',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a custom object',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a custom object record',
				action: 'Delete a custom object',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a custom object record',
				action: 'Get a custom object',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all custom object records',
				action: 'Get all custom objects',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a custom object record',
				action: 'Update a custom object',
			},
		],
		default: 'create',
	},
];

export const customObjectFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                customObject:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Custom Object Name or ID',
		name: 'customObject',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjects',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['create', 'upsert'],
			},
		},
		description:
			'Name of the custom object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Match Against',
		name: 'externalId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getExternalIdFields',
			loadOptionsDependsOn: ['customObject'],
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['upsert'],
			},
		},
		description:
			'The field to check to see if the object already exists. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Value to Match',
		name: 'externalIdValue',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['upsert'],
			},
		},
		description:
			"If this value exists in the 'match against' field, update the object. Otherwise create a new one.",
	},
	{
		displayName: 'Fields',
		name: 'customFieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['create', 'upsert'],
			},
		},
		description: 'Filter by custom fields',
		default: {},
		options: [
			{
				name: 'customFieldsValues',
				displayName: 'Custom Field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getCustomObjectFields',
							loadOptionsDependsOn: ['customObject'],
						},
						default: '',
						description:
							'The ID of the field. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'The value to set on custom field',
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 customObject:update                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Custom Object Name or ID',
		name: 'customObject',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjects',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['update'],
			},
		},
		description:
			'Name of the custom object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['update'],
			},
		},
		description: 'Record ID to be updated',
	},
	{
		displayName: 'Fields',
		name: 'customFieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		description: 'Filter by custom fields',
		default: {},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['update'],
			},
		},
		options: [
			{
				name: 'customFieldsValues',
				displayName: 'Custom Field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getCustomObjectFields',
							loadOptionsDependsOn: ['customObject'],
						},
						default: '',
						description:
							'The ID of the field. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'The value to set on custom field',
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  customObject:get                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Custom Object Name or ID',
		name: 'customObject',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjects',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['get'],
			},
		},
		description:
			'Name of the custom object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['get'],
			},
		},
		description: 'Record ID to be retrieved',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  customObject:delete                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Custom Object Name or ID',
		name: 'customObject',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjects',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['delete'],
			},
		},
		description:
			'Name of the custom object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['delete'],
			},
		},
		description: 'Record ID to be deleted',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 customObject:getAll                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Custom Object Name or ID',
		name: 'customObject',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjects',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['getAll'],
			},
		},
		description:
			'Name of the custom object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['getAll'],
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
				resource: ['customObject'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Conditions',
				name: 'conditionsUi',
				placeholder: 'Add Condition',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'The condition to set',
				default: {},
				options: [
					{
						name: 'conditionValues',
						displayName: 'Condition',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomObjectFields',
									loadOptionsDependsOn: ['customObject'],
								},
								default: '',
								description:
									'For date, number, or boolean, please use expressions. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{
										name: '<',
										value: '<',
									},
									{
										name: '<=',
										value: '<=',
									},
									{
										name: '=',
										value: 'equal',
									},
									{
										name: '>',
										value: '>',
									},
									{
										name: '>=',
										value: '>=',
									},
								],
								default: 'equal',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Field Names or IDs',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCustomObjectFields',
					loadOptionsDependsOn: ['customObject'],
				},
				default: [],
				description:
					'Fields to include separated by commas. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['create', 'upsert'],
				resource: ['customObject'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Record Type Name or ID',
				name: 'recordTypeId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getRecordTypes',
					loadOptionsDependsOn: ['customObject'],
				},
				default: '',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['customObject'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Record Type Name or ID',
				name: 'recordTypeId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getRecordTypes',
					loadOptionsDependsOn: ['customObject'],
				},
				default: '',
			},
		],
	},
];
