import {
	INodeProperties,
} from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new company',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a company',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a company',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all companies',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a company',
			},
		],
		default: 'create',
		description: 'The operation to perform',
	},
];

export const companyFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                company:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The name of the company to create.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'create',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'addressUi',
				placeholder: 'Address',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						name: 'addressValues',
						displayName: 'Address',
						values: [
							{
								displayName: 'Address Line 1',
								name: 'address1',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Address Line 2',
								name: 'address2',
								type: 'string',
								default: '',
							},
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
							},
							{
								displayName: 'State',
								name: 'state',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country',
								name: 'country',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Zip Code',
								name: 'zipCode',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Annual Revenue',
				name: 'annualRevenue',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Company Email',
				name: 'companyEmail',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Fields',
				description: 'Adds a custom fields to set also values which have not been predefined.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customFieldValues',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCompanyFields',
								},
								default: '',
								description: 'ID of the field to set.',
							},
							{
								displayName: 'Field Value',
								name: 'fieldValue',
								type: 'string',
								default: '',
								description: 'Value of the field to set.',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIndustries',
				},
				default: '',
			},
			{
				displayName: 'Is Published',
				name: 'isPublished',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Number of Employees',
				name: 'numberOfEmpoyees',
				type: 'number',
				default: 0,
			},

			{
				displayName: 'Overwrite With Blank',
				name: 'overwriteWithBlank',
				type: 'boolean',
				default: false,
				description: 'If true, then empty values are set to fields. Otherwise empty values are skipped',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                               company:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'company',
				],
			},
		},
		default: '',
		description: 'The ID of the company to update.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'update',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'addressUi',
				placeholder: 'Address',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						name: 'addressValues',
						displayName: 'Address',
						values: [
							{
								displayName: 'Address Line 1',
								name: 'address1',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Address Line 2',
								name: 'address2',
								type: 'string',
								default: '',
							},
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
							},
							{
								displayName: 'State',
								name: 'state',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country',
								name: 'country',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Zip Code',
								name: 'zipCode',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Annual Revenue',
				name: 'annualRevenue',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Company Email',
				name: 'companyEmail',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Company Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Fields',
				description: 'Adds a custom fields to set also values which have not been predefined.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customFieldValues',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCompanyFields',
								},
								default: '',
								description: 'ID of the field to set.',
							},
							{
								displayName: 'Field Value',
								name: 'fieldValue',
								type: 'string',
								default: '',
								description: 'Value of the field to set.',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIndustries',
				},
				default: '',
			},
			{
				displayName: 'Is Published',
				name: 'isPublished',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Number of Employees',
				name: 'numberOfEmpoyees',
				type: 'number',
				default: 0,
			},

			{
				displayName: 'Overwrite With Blank',
				name: 'overwriteWithBlank',
				type: 'boolean',
				default: false,
				description: 'If true, then empty values are set to fields. Otherwise empty values are skipped',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Website',
				name: 'website',
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
		name: 'companyId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'company',
				],
			},
		},
		default: '',
		description: 'The ID of the company to return.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'get',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                company:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'company',
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
			maxValue: 30,
		},
		default: 30,
		description: 'How many results to return.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Order Direction',
				name: 'orderByDir',
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
				default: '',
				description: 'Sort direction: asc or desc.',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyFields',
				},
				default: '',
				description: 'Column to sort by. Can use any column listed in the response.',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'String or search command to filter entities by.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                               company:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'company',
				],
			},
		},
		default: '',
		description: 'The ID of the company to delete.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'delete',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
];
