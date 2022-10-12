import { INodeProperties } from 'n8n-workflow';

export const propertyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['property'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create and return a copy of a new property for the specified object type',
				action: 'Create a property',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Move a property identified by {propertyName} to the recycling bin',
				action: 'Delete a property',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Read a property identified by {propertyName}',
				action: 'Get a property',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Read many existing properties for the specified object type',
				action: 'Get many properties',
			},
			{
				name: 'Update',
				value: 'update',
				description:
					'Perform a partial update of a property identified by {propertyName}. Provided fields will be overwritten.',
				action: 'Update a property',
			},
		],
		default: 'get',
		description:
			'All HubSpot objects store data in default and custom properties. These endpoints provide access to read and modify object properties in HubSpot.',
	},
];

export const propertyFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*               property:create                                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type Name or ID',
		name: 'objectType',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['create'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectTypes',
		},
		default: '',
	},
	{
		displayName: 'Property Name',
		name: 'propertyName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['create'],
			},
		},
		// typeOptions: {
		// 	loadOptionsDependsOn: ['objectType'],
		// 	loadOptionsMethod: 'getAvailableProperties',
		// },
		default: '',
		description:
			'The internal property name, which must be used when referencing the property via the API',
		hint: 'Must be lowercase or snake_case',
	},
	{
		displayName: 'Label',
		name: 'label',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'A human-readable property label that will be shown in HubSpot',
	},
	{
		displayName: 'Data Type',
		name: 'type',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Date',
				value: 'date',
			},
			{
				name: 'Datetime',
				value: 'datetime',
			},
			{
				name: 'Enumeration',
				value: 'enumeration',
			},
			{
				name: 'Number',
				value: 'number',
			},
			{
				name: 'String',
				value: 'string',
			},
		],
		default: 'string',
		description: 'The data type of the property',
	},
	{
		displayName: 'Field Type',
		name: 'fieldType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Boolean Checkbox',
				value: 'booleancheckbox',
			},
			{
				name: 'Checkbox',
				value: 'checkbox',
			},
			{
				name: 'Date',
				value: 'date',
			},
			{
				name: 'File',
				value: 'file',
			},
			{
				name: 'Number',
				value: 'number',
			},
			{
				name: 'Radio',
				value: 'radio',
			},
			{
				name: 'Select',
				value: 'select',
			},
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'Textarea',
				value: 'textarea',
			},
		],
		default: 'text',
		description: 'Controls how the property appears in HubSpot',
	},
	{
		displayName: 'Group Name or ID',
		name: 'groupName',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['create'],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['objectType'],
			loadOptionsMethod: 'getAvailablePropertyGroups',
		},
		default: '',
		description: 'The name of the property group the property belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Options as JSON',
		name: 'optionsJson',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['create'],
				type: ['enumeration'],
			},
		},
		typeOptions: {
			alwaysOpenEditWindow: true,
			editor: 'json',
			rows: 10,
		},
		default: `[
			{
				"label": "Option A",
				"description": "Choice number one",
				"value": "A",
				"displayOrder": 1,
				"hidden": false
			},
			{
				"label": "Option B",
				"description": "Choice number two",
				"value": "B",
				"displayOrder": 2,
				"hidden": false
			}
		]`,
		description:
			'The valid options as a JSON array. For more info look into the <a href="https://developers.hubspot.com/docs/api/crm/properties">documentation</a>.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A description of the property that will be shown as help text in HubSpot',
			},
			{
				displayName: 'Display Order',
				name: 'displayOrder',
				type: 'number',
				default: 2,
				description:
					'Properties are displayed in order starting with the lowest positive integer value. Values of -1 will cause the property to be displayed after any positive values.',
			},
			{
				displayName: 'Form Field',
				name: 'formField',
				type: 'boolean',
				default: false,
				description: 'Whether or not the property can be used in a HubSpot form',
			},
			{
				displayName: 'Has Unique Value',
				name: 'hasUniqueValue',
				type: 'boolean',
				default: false,
				description:
					// prettier-ignore
					'Whether or not the property\'s value must be unique. Once set, this can not be changed.',
			},
			{
				displayName: 'Hidden',
				name: 'hidden',
				type: 'boolean',
				default: false,
				description: 'Whether true, the property will not be visible and can not be used in HubSpot',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                  property:get                                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type Name or ID',
		name: 'objectType',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['get'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectTypes',
		},
		default: '',
	},
	{
		displayName: 'Property Name or ID',
		name: 'propertyName',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['get'],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: [
				'objectType',
				'additionalFields.archived',
			],
			loadOptionsMethod: 'getAvailableProperties',
		},
		default: '',
		description: 'The internal property name, which must be used when referencing the property via the API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: false,
				description: 'Whether to return only results that have been archived',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*               property:getAll                                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type Name or ID',
		name: 'objectType',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['getAll'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectTypes',
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: false,
				description: 'Whether to return only results that have been archived',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                         property:update                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type Name or ID',
		name: 'objectType',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['update'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectTypes',
		},
		default: '',
	},
	{
		displayName: 'Property Name or ID',
		name: 'propertyName',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['update'],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['objectType'],
			loadOptionsMethod: 'getAvailableProperties',
		},
		default: '',
		description: 'The internal property name, which must be used when referencing the property via the API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Data Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Date',
						value: 'date',
					},
					{
						name: 'Datetime',
						value: 'datetime',
					},
					{
						name: 'Enumeration',
						value: 'enumeration',
					},
					{
						name: 'Number',
						value: 'number',
					},
					{
						name: 'String',
						value: 'string',
					},
				],
				default: 'string',
				description: 'The data type of the property',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A description of the property that will be shown as help text in HubSpot',
			},
			{
				displayName: 'Display Order',
				name: 'displayOrder',
				type: 'number',
				default: 2,
				description:
					'Properties are displayed in order starting with the lowest positive integer value. Values of -1 will cause the property to be displayed after any positive values.',
			},
			{
				displayName: 'Field Type',
				name: 'fieldType',
				type: 'options',
				options: [
					{
						name: 'Boolean Checkbox',
						value: 'booleancheckbox',
					},
					{
						name: 'Checkbox',
						value: 'checkbox',
					},
					{
						name: 'Date',
						value: 'date',
					},
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Number',
						value: 'number',
					},
					{
						name: 'Radio',
						value: 'radio',
					},
					{
						name: 'Select',
						value: 'select',
					},
					{
						name: 'Text',
						value: 'text',
					},
					{
						name: 'Textarea',
						value: 'textarea',
					},
				],
				default: 'text',
				description: 'Controls how the property appears in HubSpot',
			},
			{
				displayName: 'Form Field',
				name: 'formField',
				type: 'boolean',
				default: false,
				description: 'Whether or not the property can be used in a HubSpot form',
			},
			{
				displayName: 'Group Name or ID',
				name: 'groupName',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['objectType'],
					loadOptionsMethod: 'getAvailablePropertyGroups',
				},
				default: '',
				description: 'The name of the property group the property belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Hidden',
				name: 'hidden',
				type: 'boolean',
				default: false,
				description: 'Whether true, the property will not be visible and can not be used in HubSpot',
			},
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				default: '',
				description: 'A human-readable property label that will be shown in HubSpot',
			},
			{
				displayName: 'Options as JSON',
				name: 'optionsJson',
				type: 'json',
				default: `
						[
							{
								"label": "Option A",
								"description": "Choice number one",
								"value": "A",
								"displayOrder": 1,
								"hidden": false
							},
							{
								"label": "Option B",
								"description": "Choice number two",
								"value": "B",
								"displayOrder": 2,
								"hidden": false
							}
						]
							`,
				typeOptions: {
					alwaysOpenEditWindow: true,
					editor: 'json',
					rows: 10,
				},
				description:
					'The valid options as a JSON array. For more info look into the <a href="https://developers.hubspot.com/docs/api/crm/properties">documentation</a>.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*               property:delete                                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type Name or ID',
		name: 'objectType',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['delete'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectTypes',
		},
		default: '',
	},
	{
		displayName: 'Property Name or ID',
		name: 'propertyName',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['delete'],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['objectType'],
			loadOptionsMethod: 'getAvailableProperties',
		},
		default: '',
		description: 'The internal property name, which must be used when referencing the property via the API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
];
