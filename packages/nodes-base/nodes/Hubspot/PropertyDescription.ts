import { INodeProperties } from 'n8n-workflow';

export const propertyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['property'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a property',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Read a property',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Read all properties of a type',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a property',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Archive a property',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const propertyFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*               property:create                                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type',
		name: 'objectType',
		type: 'options',
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
		displayName: 'Property name',
		name: 'propertyName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['create'],
			},
		},
		default: '',
		description:
			'The internal property name, which must be used when referencing the property via the API.',
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
		description: 'A human-readable property label that will be shown in HubSpot.',
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
				name: 'String',
				value: 'string',
			},
			{
				name: 'Number',
				value: 'number',
			},
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
		],
		default: 'string',
		description: 'The data type of the property.',
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
				name: 'Textarea',
				value: 'textarea',
			},
			{
				name: 'Text',
				value: 'text',
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
				name: 'Select',
				value: 'select',
			},
			{
				name: 'Radio',
				value: 'radio',
			},
			{
				name: 'Checkbox',
				value: 'checkbox',
			},
			{
				name: 'Boolean Checkbox',
				value: 'booleancheckbox',
			},
		],
		default: 'text',
		description: 'Controls how the property appears in HubSpot.',
	},
	{
		displayName: 'Group name',
		name: 'groupName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['create'],
			},
		},
		default: 'contactinformation',
		description: 'The name of the property group the property belongs to.',
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
		default: '[]',
		description:
			'The valid options as a json array. For more info look into the <a href="https://developers.hubspot.com/docs/api/crm/properties">documentation</a>.',
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
				description: 'A description of the property that will be shown as help text in HubSpot.',
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
				description: 'If true, the property will not be visible and can not be used in HubSpot.',
			},
			{
				displayName: 'Form Field',
				name: 'formField',
				type: 'boolean',
				default: false,
				description: 'Whether or not the property can be used in a HubSpot form.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                  property:get                                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type',
		name: 'objectType',
		type: 'options',
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
		displayName: 'Property name',
		name: 'propertyName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['get'],
			},
		},
		default: '',
		description:
			'The internal property name, which must be used when referencing the property via the API.',
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
				description: 'Whether to return only results that have been archived.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*               property:getAll                                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type',
		name: 'objectType',
		type: 'options',
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
				description: 'Whether to return only results that have been archived.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                         property:update                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type',
		name: 'objectType',
		type: 'options',
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
		displayName: 'Property name',
		name: 'propertyName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['update'],
			},
		},
		default: '',
		description:
			'The internal property name, which must be used when referencing the property via the API.',
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
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				default: '',
				description: 'A human-readable property label that will be shown in HubSpot.',
			},
			{
				displayName: 'Data Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'String',
						value: 'string',
					},
					{
						name: 'Number',
						value: 'number',
					},
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
				],
				default: 'string',
				description: 'The data type of the property.',
			},
			{
				displayName: 'Field Type',
				name: 'fieldType',
				type: 'options',
				options: [
					{
						name: 'Textarea',
						value: 'textarea',
					},
					{
						name: 'Text',
						value: 'text',
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
						name: 'Select',
						value: 'select',
					},
					{
						name: 'Radio',
						value: 'radio',
					},
					{
						name: 'Checkbox',
						value: 'checkbox',
					},
					{
						name: 'Boolean Checkbox',
						value: 'booleancheckbox',
					},
				],
				default: 'text',
				description: 'Controls how the property appears in HubSpot.',
			},
			{
				displayName: 'Group name',
				name: 'groupName',
				type: 'string',
				default: 'contactinformation',
				description: 'The name of the property group the property belongs to.',
			},
			{
				displayName: 'Options as JSON',
				name: 'optionsJson',
				type: 'json',
				default: '[]',
				description:
					'The valid options as a json array. For more info look into the <a href="https://developers.hubspot.com/docs/api/crm/properties">documentation</a>.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A description of the property that will be shown as help text in HubSpot.',
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
				displayName: 'Hidden',
				name: 'hidden',
				type: 'boolean',
				default: false,
				description: 'If true, the property will not be visible and can not be used in HubSpot.',
			},
			{
				displayName: 'Form Field',
				name: 'formField',
				type: 'boolean',
				default: false,
				description: 'Whether or not the property can be used in a HubSpot form.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*               property:delete                                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Object Type',
		name: 'objectType',
		type: 'options',
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
		displayName: 'Property name',
		name: 'propertyName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['property'],
				operation: ['delete'],
			},
		},
		default: '',
		description:
			'The internal property name, which must be used when referencing the property via the API.',
	},
];
