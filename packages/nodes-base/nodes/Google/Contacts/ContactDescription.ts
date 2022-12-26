import { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a contact',
				action: 'Create a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many contacts',
				action: 'Get many contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
				action: 'Update a contact',
			},
		],
		default: 'create',
	},
];

export const contactFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 contact:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Family Name',
		name: 'familyName',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['contact'],
			},
		},
		default: '',
	},
	{
		displayName: 'Given Name',
		name: 'givenName',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['contact'],
			},
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
				operation: ['create'],
				resource: ['contact'],
			},
		},
		options: [
			{
				displayName: 'Addresses',
				name: 'addressesUi',
				placeholder: 'Add Address',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Address',
						name: 'addressesValues',
						values: [
							{
								displayName: 'Street Address',
								name: 'streetAddress',
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
								displayName: 'Region',
								name: 'region',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country Code',
								name: 'countryCode',
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
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Other',
										value: 'other',
									},
								],
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Birthday',
				name: 'birthday',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Company',
				name: 'companyUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Company',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'companyValues',
						displayName: 'Company',
						values: [
							{
								displayName: 'Current',
								name: 'current',
								type: 'boolean',
								default: false,
							},
							{
								displayName: 'Domain',
								name: 'domain',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Title',
								name: 'title',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								description: 'The end user specified key of the user defined data',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								description: 'The end user specified value of the user defined data',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Emails',
				name: 'emailsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Email',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'emailsValues',
						displayName: 'Email',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Other',
										value: 'other',
									},
								],
								default: '',
								description:
									'The type of the email address. The type can be custom or one of these predefined values.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The email address',
							},
						],
					},
				],
			},
			{
				displayName: 'Events',
				name: 'eventsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Event',
				description: 'An event related to the person',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'eventsValues',
						displayName: 'Event',
						values: [
							{
								displayName: 'Date',
								name: 'date',
								type: 'dateTime',
								default: '',
								description: 'The date of the event',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Anniversary',
										value: 'anniversary',
									},
									{
										name: 'Other',
										value: 'other',
									},
								],
								default: '',
								description:
									'The type of the event. The type can be custom or one of these predefined values.',
							},
						],
					},
				],
			},
			{
				displayName: 'File As',
				name: 'fileAs',
				type: 'string',
				default: '',
				description: 'The name that should be used to sort the person in a list',
			},
			{
				displayName: 'Group Names or IDs',
				name: 'group',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
				default: [],
			},
			{
				displayName: 'Honorific Prefix',
				name: 'honorificPrefix',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Honorific Suffix',
				name: 'honorificSuffix',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Middle Name',
				name: 'middleName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Notes',
				name: 'biographies',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'phoneUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Phone',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'phoneValues',
						displayName: 'Phone',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Google Voice',
										value: 'googleVoice',
									},
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Home Fax',
										value: 'homeFax',
									},
									{
										name: 'Main',
										value: 'main',
									},
									{
										name: 'Mobile',
										value: 'mobile',
									},
									{
										name: 'Other',
										value: 'other',
									},
									{
										name: 'Other Fax',
										value: 'otherFax',
									},
									{
										name: 'Pager',
										value: 'pager',
									},
									{
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Work Fax',
										value: 'workFax',
									},
									{
										name: 'Work Mobile',
										value: 'workMobile',
									},
									{
										name: 'Work Pager',
										value: 'workPager',
									},
								],
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The phone number',
							},
						],
					},
				],
			},
			{
				displayName: 'Relations',
				name: 'relationsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Relation',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'relationsValues',
						displayName: 'Relation',
						values: [
							{
								displayName: 'Person',
								name: 'person',
								type: 'string',
								default: '',
								description: 'The name of the other person this relation refers to',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Assistant',
										value: 'assistant',
									},
									{
										name: 'Brother',
										value: 'brother',
									},
									{
										name: 'Child',
										value: 'child',
									},
									{
										name: 'Domestic Partner',
										value: 'domesticPartner',
									},
									{
										name: 'Father',
										value: 'father',
									},
									{
										name: 'Friend',
										value: 'friend',
									},
									{
										name: 'Manager',
										value: 'manager',
									},
									{
										name: 'Mother',
										value: 'mother',
									},
									{
										name: 'Parent',
										value: 'parent',
									},
									{
										name: 'Referred By',
										value: 'referredBy',
									},
									{
										name: 'Relative',
										value: 'relative',
									},
									{
										name: 'Sister',
										value: 'sister',
									},
									{
										name: 'Spouse',
										value: 'spouse',
									},
								],
								default: '',
								description:
									"The person's relation to the other person. The type can be custom or one of these predefined values.",
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
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['contact'],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 contact:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['contact'],
			},
		},
		default: '',
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		options: [
			{
				name: '*',
				value: '*',
			},
			{
				name: 'Addresses',
				value: 'addresses',
			},
			{
				name: 'Biographies',
				value: 'biographies',
			},
			{
				name: 'Birthdays',
				value: 'birthdays',
			},
			{
				name: 'Cover Photos',
				value: 'coverPhotos',
			},
			{
				name: 'Email Addresses',
				value: 'emailAddresses',
			},
			{
				name: 'Events',
				value: 'events',
			},
			{
				name: 'Genders',
				value: 'genders',
			},
			{
				name: 'IM Clients',
				value: 'imClients',
			},
			{
				name: 'Interests',
				value: 'interests',
			},
			{
				name: 'Locales',
				value: 'locales',
			},
			{
				name: 'Memberships',
				value: 'memberships',
			},
			{
				name: 'Metadata',
				value: 'metadata',
			},
			{
				name: 'Names',
				value: 'names',
			},
			{
				name: 'Nicknames',
				value: 'nicknames',
			},
			{
				name: 'Occupations',
				value: 'occupations',
			},
			{
				name: 'Organizations',
				value: 'organizations',
			},
			{
				name: 'Phone Numbers',
				value: 'phoneNumbers',
			},
			{
				name: 'Photos',
				value: 'photos',
			},
			{
				name: 'Relations',
				value: 'relations',
			},
			{
				name: 'Residences',
				value: 'residences',
			},
			{
				name: 'Sip Addresses',
				value: 'sipAddresses',
			},
			{
				name: 'Skills',
				value: 'skills',
			},
			{
				name: 'URLs',
				value: 'urls',
			},
			{
				name: 'User Defined',
				value: 'userDefined',
			},
		],
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['contact'],
			},
		},
		default: [],
		description:
			'A field mask to restrict which fields on each person are returned. Multiple fields can be specified by separating them with commas.',
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['contact'],
			},
		},
		default: false,
		description: 'Whether to return the data exactly in the way it got received from the API',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 contact:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['contact'],
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
				operation: ['getAll'],
				resource: ['contact'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		options: [
			{
				name: '*',
				value: '*',
			},
			{
				name: 'Addresses',
				value: 'addresses',
			},
			{
				name: 'Biographies',
				value: 'biographies',
			},
			{
				name: 'Birthdays',
				value: 'birthdays',
			},
			{
				name: 'Cover Photos',
				value: 'coverPhotos',
			},
			{
				name: 'Email Addresses',
				value: 'emailAddresses',
			},
			{
				name: 'Events',
				value: 'events',
			},
			{
				name: 'Genders',
				value: 'genders',
			},
			{
				name: 'IM Clients',
				value: 'imClients',
			},
			{
				name: 'Interests',
				value: 'interests',
			},
			{
				name: 'Locales',
				value: 'locales',
			},
			{
				name: 'Memberships',
				value: 'memberships',
			},
			{
				name: 'Metadata',
				value: 'metadata',
			},
			{
				name: 'Names',
				value: 'names',
			},
			{
				name: 'Nicknames',
				value: 'nicknames',
			},
			{
				name: 'Occupations',
				value: 'occupations',
			},
			{
				name: 'Organizations',
				value: 'organizations',
			},
			{
				name: 'Phone Numbers',
				value: 'phoneNumbers',
			},
			{
				name: 'Photos',
				value: 'photos',
			},
			{
				name: 'Relations',
				value: 'relations',
			},
			{
				name: 'Residences',
				value: 'residences',
			},
			{
				name: 'Sip Addresses',
				value: 'sipAddresses',
			},
			{
				name: 'Skills',
				value: 'skills',
			},
			{
				name: 'URLs',
				value: 'urls',
			},
			{
				name: 'User Defined',
				value: 'userDefined',
			},
		],
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['contact'],
			},
		},
		default: [],
		description:
			'A field mask to restrict which fields on each person are returned. Multiple fields can be specified by separating them with commas.',
	},
	{
		displayName: 'Use Query',
		name: 'useQuery',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['contact'],
			},
		},
		default: false,
		description: 'Whether or not to use a query to filter the results',
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['contact'],
				useQuery: [true],
			},
		},
		default: '',
		description:
			'The plain-text query for the request. The query is used to match prefix phrases of the fields on a person. For example, a person with name "foo name" matches queries such as "f", "fo", "foo", "foo n", "nam", etc., but not "oo n".',
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['contact'],
			},
		},
		default: false,
		description: 'Whether to return the data exactly in the way it got received from the API',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['contact'],
				useQuery: [false],
			},
		},
		options: [
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{
						name: 'Last Modified Ascending',
						value: 'LAST_MODIFIED_ASCENDING',
						description: 'Sort people by when they were changed; older entries first',
					},
					{
						name: 'Last Modified Descending',
						value: 'LAST_MODIFIED_DESCENDING',
						description: 'Sort people by when they were changed; newer entries first',
					},
					{
						name: 'First Name Ascending',
						value: 'FIRST_NAME_ASCENDING',
						description: 'Sort people by first name',
					},
					{
						name: 'Last Name Ascending',
						value: 'LAST_NAME_ASCENDING',
						description: 'Sort people by last name',
					},
				],
				default: '',
				description: 'The order of the contacts returned in the result',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 contact:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['contact'],
			},
		},
		default: '',
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		options: [
			{
				name: '*',
				value: '*',
			},
			{
				name: 'Addresses',
				value: 'addresses',
			},
			{
				name: 'Biographies',
				value: 'biographies',
			},
			{
				name: 'Birthdays',
				value: 'birthdays',
			},
			{
				name: 'Cover Photos',
				value: 'coverPhotos',
			},
			{
				name: 'Email Addresses',
				value: 'emailAddresses',
			},
			{
				name: 'Events',
				value: 'events',
			},
			{
				name: 'Genders',
				value: 'genders',
			},
			{
				name: 'IM Clients',
				value: 'imClients',
			},
			{
				name: 'Interests',
				value: 'interests',
			},
			{
				name: 'Locales',
				value: 'locales',
			},
			{
				name: 'Memberships',
				value: 'memberships',
			},
			{
				name: 'Metadata',
				value: 'metadata',
			},
			{
				name: 'Names',
				value: 'names',
			},
			{
				name: 'Nicknames',
				value: 'nicknames',
			},
			{
				name: 'Occupations',
				value: 'occupations',
			},
			{
				name: 'Organizations',
				value: 'organizations',
			},
			{
				name: 'Phone Numbers',
				value: 'phoneNumbers',
			},
			{
				name: 'Photos',
				value: 'photos',
			},
			{
				name: 'Relations',
				value: 'relations',
			},
			{
				name: 'Residences',
				value: 'residences',
			},
			{
				name: 'Sip Addresses',
				value: 'sipAddresses',
			},
			{
				name: 'Skills',
				value: 'skills',
			},
			{
				name: 'URLs',
				value: 'urls',
			},
			{
				name: 'User Defined',
				value: 'userDefined',
			},
		],
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['contact'],
			},
		},
		default: [],
		description:
			'A field mask to restrict which fields on each person are returned. Multiple fields can be specified by separating them with commas.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['contact'],
			},
		},
		options: [
			{
				displayName: 'Etag',
				name: 'etag',
				type: 'string',
				default: '',
				description:
					'The etag field in the person is nedded to make sure the contact has not changed since your last read',
			},
			{
				displayName: 'Family Name',
				name: 'familyName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Given Name',
				name: 'givenName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Addresses',
				name: 'addressesUi',
				placeholder: 'Add Address',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Address',
						name: 'addressesValues',
						values: [
							{
								displayName: 'Street Address',
								name: 'streetAddress',
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
								displayName: 'Region',
								name: 'region',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country Code',
								name: 'countryCode',
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
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Other',
										value: 'other',
									},
								],
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Birthday',
				name: 'birthday',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Company',
				name: 'companyUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Company',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'companyValues',
						displayName: 'Company',
						values: [
							{
								displayName: 'Current',
								name: 'current',
								type: 'boolean',
								default: false,
							},
							{
								displayName: 'Domain',
								name: 'domain',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Title',
								name: 'title',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								description: 'The end user specified key of the user defined data',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								description: 'The end user specified value of the user defined data',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Emails',
				name: 'emailsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Email',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'emailsValues',
						displayName: 'Email',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Other',
										value: 'other',
									},
								],
								default: '',
								description:
									'The type of the email address. The type can be custom or one of these predefined values.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The email address',
							},
						],
					},
				],
			},
			{
				displayName: 'Events',
				name: 'eventsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Event',
				description: 'An event related to the person',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'eventsValues',
						displayName: 'Event',
						values: [
							{
								displayName: 'Date',
								name: 'date',
								type: 'dateTime',
								default: '',
								description: 'The date of the event',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Anniversary',
										value: 'anniversary',
									},
									{
										name: 'Other',
										value: 'other',
									},
								],
								default: '',
								description:
									'The type of the event. The type can be custom or one of these predefined values.',
							},
						],
					},
				],
			},
			{
				displayName: 'File As',
				name: 'fileAs',
				type: 'string',
				default: '',
				description: 'The name that should be used to sort the person in a list',
			},
			{
				displayName: 'Group Names or IDs',
				name: 'group',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
				default: [],
			},
			{
				displayName: 'Honorific Prefix',
				name: 'honorificPrefix',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Honorific Suffix',
				name: 'honorificSuffix',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Middle Name',
				name: 'middleName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Notes',
				name: 'biographies',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'phoneUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Phone',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'phoneValues',
						displayName: 'Phone',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Google Voice',
										value: 'googleVoice',
									},
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Home Fax',
										value: 'homeFax',
									},
									{
										name: 'Main',
										value: 'main',
									},
									{
										name: 'Mobile',
										value: 'mobile',
									},
									{
										name: 'Other',
										value: 'other',
									},
									{
										name: 'Other Fax',
										value: 'otherFax',
									},
									{
										name: 'Pager',
										value: 'pager',
									},
									{
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Work Fax',
										value: 'workFax',
									},
									{
										name: 'Work Mobile',
										value: 'workMobile',
									},
									{
										name: 'Work Pager',
										value: 'workPager',
									},
								],
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The phone number',
							},
						],
					},
				],
			},
			{
				displayName: 'Relations',
				name: 'relationsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Relation',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'relationsValues',
						displayName: 'Relation',
						values: [
							{
								displayName: 'Person',
								name: 'person',
								type: 'string',
								default: '',
								description: 'The name of the other person this relation refers to',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Assistant',
										value: 'assistant',
									},
									{
										name: 'Brother',
										value: 'brother',
									},
									{
										name: 'Child',
										value: 'child',
									},
									{
										name: 'Domestic Partner',
										value: 'domesticPartner',
									},
									{
										name: 'Father',
										value: 'father',
									},
									{
										name: 'Friend',
										value: 'friend',
									},
									{
										name: 'Manager',
										value: 'manager',
									},
									{
										name: 'Mother',
										value: 'mother',
									},
									{
										name: 'Parent',
										value: 'parent',
									},
									{
										name: 'Referred By',
										value: 'referredBy',
									},
									{
										name: 'Relative',
										value: 'relative',
									},
									{
										name: 'Sister',
										value: 'sister',
									},
									{
										name: 'Spouse',
										value: 'spouse',
									},
								],
								default: '',
								description:
									"The person's relation to the other person. The type can be custom or one of these predefined values.",
							},
						],
					},
				],
			},
		],
	},
];
