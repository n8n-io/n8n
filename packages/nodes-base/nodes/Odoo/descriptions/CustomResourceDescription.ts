import { INodeProperties } from 'n8n-workflow';

export const customResourceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['custom'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an item',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all items',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an item',
			},
		],
	},
];

export const customResourceDescription: INodeProperties[] = [
	{
		displayName: 'Custom Resource',
		name: 'customResource',
		type: 'string',
		default: '',
		description: 'Specify custom resource',
		required: true,
		displayOptions: {
			show: {
				resource: ['custom'],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                custom:create                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Additional Fields',
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
				operation: ['create'],
				resource: ['custom'],
			},
		},
		options: [
			{
				displayName: 'Field Record:',
				name: 'fields',
				values: [
					{
						displayName: 'Field Name',
						name: 'fieldName',
						type: 'options',
						default: '',
						noDataExpression: true,
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
	/*                                custom:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Custom Resource ID',
		name: 'customResourceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get', 'delete'],
				resource: ['custom'],
			},
		},
	},

	{
		displayName: 'Fields To Include',
		name: 'fieldsList',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Field',
		},
		default: {},
		description: 'Choose fields to be returned',
		placeholder: '',
		displayOptions: {
			show: {
				resource: ['custom'],
				operation: ['get', 'getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields To Be Returnedd',
				name: 'fields',
				values: [
					{
						displayName: 'Choose From List',
						name: 'fromList',
						type: 'boolean',
						default: false,
						description: 'Whether to use options from list',
					},
					{
						displayName: 'Field:',
						name: 'field',
						type: 'string',
						default: '',
						description: 'Enter field name',
						placeholder: '',
						displayOptions: {
							show: {
								fromList: [false],
							},
						},
					},
					{
						displayName: 'Field',
						name: 'field',
						type: 'options',
						default: '',
						noDataExpression: true,
						typeOptions: {
							loadOptionsDependsOn: ['customResource'],
							loadOptionsMethod: 'getModelFields',
						},
						displayOptions: {
							show: {
								fromList: [true],
							},
						},
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                custom:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Filter Results',
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
				operation: ['getAll'],
				resource: ['custom'],
			},
		},
		options: [
			{
				name: 'filter',
				displayName: 'Filter',
				values: [
					{
						displayName: 'Field Name',
						name: 'fieldName',
						type: 'string',
						default: '',
						description: 'Specify field name',
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
								name: '=',
								value: 'equal',
							},
							{
								name: '=<',
								value: 'lesserOrEqual',
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
								name: 'Chield Of',
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
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['custom'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},

	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: ['custom'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 0,
			maxValue: 1000,
		},
		description: 'The offset of results to return',
	},

	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				resource: ['custom'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                custom:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Custom Resource ID',
		name: 'customResourceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['custom'],
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
				operation: ['update'],
				resource: ['custom'],
			},
		},
		options: [
			{
				displayName: 'Field Record:',
				name: 'fields',
				values: [
					{
						displayName: 'Field Name',
						name: 'fieldName',
						type: 'options',
						default: '',
						noDataExpression: true,
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
