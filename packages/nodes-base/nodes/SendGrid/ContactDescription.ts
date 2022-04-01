import {
	INodeProperties,
} from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Create/Update',
				value: 'upsert',
				description: 'Create/update a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact by ID',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts',
			},
		],
		default: 'upsert',
		description: 'The operation to perform.',
	},
];

export const contactFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 contact:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If set to true, all the results will be returned.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'contact',
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
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'The query field accepts valid  <a href="https://sendgrid.com/docs/for-developers/sending-email/segmentation-query-language/">SGQL</a> for searching for a contact.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upsert',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'Primary email for the contact.',
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
					'contact',
				],
				operation: [
					'upsert',
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
						],
					},
				],
			},
			{
				displayName: 'Alternate Emails',
				name: 'alternateEmails',
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
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'State/Province/Region',
				name: 'stateProvinceRegion',
				type: 'string',
				default: '',
			},
			{
				displayName: 'List IDs',
				name: 'listIdsUi',
				placeholder: 'List IDs',
				description: 'Adds a custom field to set also values which have not been predefined.',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'listIdValues',
						displayName: 'List IDs',
						values: [
							{
								displayName: 'List IDs',
								name: 'listIds',
								type: 'multiOptions',
								typeOptions: {
									loadOptionsMethod: 'getListIds',
								},
								default: '',
								description: 'ID of the field to set.',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Fields',
				description: 'Adds custom fields',
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
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description: 'ID of the field',
							},
							{
								displayName: 'Field Value',
								name: 'fieldValue',
								type: 'string',
								default: '',
								description: 'Value for the field',
							},
						],
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact IDs',
		name: 'ids',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'delete',
				],
				deleteAll: [
					false,
				],
			},
		},
		description: 'ID of the contact. Multiple can be added separated by comma.',
	},
	{
		displayName: 'Delete All',
		name: 'deleteAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'delete',
				],
			},
		},
		default: false,
		description: 'If set to true, all contacts will be deleted.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'By',
		name: 'by',
		type: 'options',
		options: [
			{
				name: 'ID',
				value: 'id',
			},
			{
				name: 'Email',
				value: 'email',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'contact',
				],
			},
		},
		default: 'id',
		description: 'Search the user by ID or email.',
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'contact',
				],
				by: [
					'id',
				],
			},
		},
		default: '',
		description: 'ID of the contact.',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'contact',
				],
				by: [
					'email',
				],
			},
		},
		default: '',
		description: 'Email of the contact.',
	},
];
