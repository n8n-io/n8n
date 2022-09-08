import { INodeProperties } from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['company'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a company',
				action: 'Create a company',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a company',
				action: 'Delete a company',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a company',
				action: 'Get a company',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all companies',
				action: 'Get many companies',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a company',
				action: 'Update a company',
			},
		],
		default: 'create',
	},
];

export const companyFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                company:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create'],
			},
		},
		required: true,
	},
	{
		displayName: 'Owner Name or ID',
		name: 'owner',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create'],
			},
		},
		required: true,
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create'],
			},
		},
		default: false,
		description: 'Whether the data should include the fields details',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other Phone',
				name: 'otherPhone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Facebook Handle',
				name: 'facebookHandle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Google Plus Handle',
				name: 'googlePlusHandle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'LinkedIn Handle',
				name: 'linkedInHandle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Skype ID',
				name: 'skypeId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Twitter Handle',
				name: 'twitterHandle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Billing Address Line 1',
				name: 'billingAddressLine1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Billing Address Line 2',
				name: 'billingAddressLine2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Billing City',
				name: 'billingCity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Billing Zip Code',
				name: 'billingZipCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Billing State',
				name: 'billingState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Billing Country',
				name: 'billingState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                company:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['update'],
			},
		},
		default: false,
		description: 'Whether the data should include the fields details',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other Phone',
				name: 'otherPhone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Facebook Handle',
				name: 'facebookHandle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Google Plus Handle',
				name: 'googlePlusHandle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'LinkedIn Handle',
				name: 'linkedInHandle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Skype ID',
				name: 'skypeId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Twitter Handle',
				name: 'twitterHandle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Billing Address Line 1',
				name: 'billingAddressLine1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Billing Address Line 2',
				name: 'billingAddressLine2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Billing City',
				name: 'billingCity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Billing Zip Code',
				name: 'billingZipCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Billing State',
				name: 'billingState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Billing Country',
				name: 'billingState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 company:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['get'],
			},
		},
		default: false,
		description: 'Whether the data should include the fields details',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 company:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['company'],
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
				resource: ['company'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 25,
		},
		default: 10,
		description: 'Max number of results to return',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['company'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Comma-separated list of fields to return',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'string',
				default: '',
				description: 'The field to sort by',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'asc',
					},
					{
						name: 'DESC',
						value: 'desc',
					},
				],
				default: 'desc',
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filtersJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['company'],
				jsonParameters: [true],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		placeholder: 'Add filter',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getAll'],
				jsonParameters: [false],
			},
		},
		default: {},
		options: [
			{
				name: 'filtersUi',
				displayName: 'Filters',
				values: [
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						options: [
							{
								name: 'AND',
								value: 'AND',
							},
							{
								name: 'OR',
								value: 'OR',
							},
						],
						default: 'AND',
					},
					{
						displayName: 'Conditions',
						name: 'conditions',
						placeholder: 'Add Condition',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'conditionsUi',
								displayName: 'Conditions',
								values: [
									{
										displayName: 'Field',
										name: 'field',
										type: 'options',
										options: [
											{
												name: 'Name',
												value: 'name',
											},
											{
												name: 'Email',
												value: 'email',
											},
											{
												name: 'Phone',
												value: 'phone',
											},
										],
										default: 'name',
									},
									{
										displayName: 'Condition',
										name: 'condition',
										type: 'options',
										// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
										options: [
											{
												name: 'Equals',
												value: 'EQUALS',
											},
											{
												name: 'Not Equals',
												value: 'NOT_EQUALS',
											},
											{
												name: 'CONTAINS',
												value: 'Contains',
											},
											{
												name: 'Does Not Contains',
												value: 'DOES_NOT_CONTAINS',
											},
											{
												name: 'Empty',
												value: 'EMPTY',
											},
											{
												name: 'Not Empty',
												value: 'NOT_EMPTY',
											},
											{
												name: 'Starts With',
												value: 'STARTS_WITH',
											},
											{
												name: 'Ends With',
												value: 'ENDS_WITH',
											},
										],
										default: 'EQUALS',
										description: 'Value of the property to set',
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
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                company:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['delete'],
			},
		},
		description: 'If more than one company add them separated by ,',
	},
];
