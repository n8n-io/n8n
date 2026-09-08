import type { INodeProperties } from 'n8n-workflow';

import { accountResourceLocator } from './SharedDescriptions';

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
				name: 'Add contact to campaign',
				value: 'addToCampaign',
				description: 'Add contact to a campaign',
				action: 'Add a contact to a campaign',
			},
			{
				name: 'Add note',
				value: 'addNote',
				description: 'Add note to a contact',
				action: 'Add a note to a contact',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a contact',
				action: 'Create a contact',
			},
			{
				name: 'Create or update',
				value: 'upsert',
				description:
					'Create a new contact, or update the current one if it already exists (upsert)',
				action: 'Create or update a contact',
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
				name: 'Get many',
				value: 'getAll',
				description: 'Get many contacts',
				action: 'Get many contacts',
			},
			{
				name: 'Get summary',
				value: 'getSummary',
				description: "Returns an overview of contact's metadata",
				action: 'Get a contact summary',
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
	/*                                contact:create                              */
	/* -------------------------------------------------------------------------- */
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Match against',
		name: 'externalId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getExternalIdFields',
			loadOptionsDependsOn: ['resource'],
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		description:
			'The field to check to see if the contact already exists. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Value to match',
		name: 'externalIdValue',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		description:
			"If this value exists in the 'match against' field, update the contact. Otherwise create a new one.",
	},
	{
		displayName: 'Last name',
		name: 'lastname',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create', 'upsert'],
			},
		},
		description: 'Required. Last name of the contact. Limited to 80 characters.',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create', 'upsert'],
			},
		},
		options: [
			accountResourceLocator('acconuntId', 'The account that is the parent of this contact'),
			{
				displayName: 'Assistant name',
				name: 'assistantName',
				type: 'string',
				default: '',
				description: 'The name of the assistant',
			},
			{
				displayName: 'Assistant phone',
				name: 'Assistant Phone',
				type: 'string',
				default: '',
				description: 'The telephone number of the assistant',
			},
			{
				displayName: 'Birth date',
				name: 'birthdate',
				type: 'dateTime',
				default: '',
				description: 'The birth date of the contact',
			},
			{
				displayName: 'Custom fields',
				name: 'customFieldsUi',
				placeholder: 'Add custom field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom field',
						values: [
							{
								displayName: 'Field name or ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description:
									'The ID of the field to add custom field to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
				description: 'The department of the contact',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A description of the contact. Label is Contact Description. Limit: 32 KB.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email address for the contact',
			},
			{
				displayName: 'Email bounced date',
				name: 'otherPostalCode',
				type: 'dateTime',
				default: '',
				description:
					'If bounce management is activated and an email sent to the contact bounces, the date and time the bounce occurred',
			},
			{
				displayName: 'Email bounced reason',
				name: 'emailBouncedReason',
				type: 'string',
				default: '',
				description:
					'If bounce management is activated and an email sent to the contact bounces, the reason the bounce occurred',
			},
			{
				displayName: 'Email opt out',
				name: 'hasOptedOutOfEmail',
				type: 'boolean',
				default: false,
				description: 'Whether the contact does not want to receive email from Salesforce',
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
				description: 'Fax number for the contact. Label is Business Fax.',
			},
			{
				displayName: 'First name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the contact. Maximum size is 40 characters.',
			},
			{
				displayName: 'Middle name',
				name: 'middleName',
				type: 'string',
				default: '',
				description: 'Middle name of the contact. Maximum size is 40 characters.',
			},
			{
				displayName: 'Suffix',
				name: 'suffix',
				type: 'string',
				default: '',
				description: 'Name suffix of the contact. Maximum size is 40 characters.',
			},
			{
				displayName: 'Home phone',
				name: 'homePhone',
				type: 'string',
				default: '',
				description: 'Home telephone number for the contact',
			},
			{
				displayName: 'Jigsaw',
				name: 'jigsaw',
				type: 'string',
				default: '',
				description:
					'References the ID of a contact in Data.com. If a contact has a value in this field, it means that a contact was imported as a contact from Data.com.',
			},
			{
				displayName: 'Lead source name or ID',
				name: 'leadSource',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLeadSources',
				},
				default: '',
				description:
					'Source from which the lead was obtained. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Mailing city',
				name: 'mailingCity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing country',
				name: 'mailingCountry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mobile phone',
				name: 'mobilePhone',
				type: 'string',
				default: '',
				description: 'Contact’s mobile phone number',
			},
			{
				displayName: 'Mailing postal code',
				name: 'mailingPostalCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing state',
				name: 'mailingState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing street',
				name: 'mailingStreet',
				type: 'string',
				default: '',
				description: 'Street address for mailing address',
			},
			{
				displayName: 'Other city',
				name: 'otherCity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other country',
				name: 'otherCountry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other phone',
				name: 'otherPhone',
				type: 'string',
				default: '',
				description: 'Telephone for alternate address',
			},
			{
				displayName: 'Other postal code',
				name: 'otherPostalCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other state',
				name: 'otherState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other street',
				name: 'otherStreet',
				type: 'string',
				default: '',
				description: 'Street for alternate address',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				modes: [
					{
						displayName: 'From list',
						name: 'list',
						type: 'list',
						placeholder: 'Select a user...',
						typeOptions: {
							searchListMethod: 'searchUsers',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: '0051700000ABCDE',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^(?:[a-zA-Z0-9]{15}|[a-zA-Z0-9]{18})$',
									errorMessage: 'User ID must be 15 or 18 alphanumeric characters',
								},
							},
						],
					},
				],
				description: 'The user who owns the contact',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number for the contact',
			},
			{
				displayName: 'Record type name or ID',
				name: 'recordTypeId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getRecordTypes',
				},
				default: '',
			},
			{
				displayName: 'Salutation',
				name: 'salutation',
				type: 'string',
				default: '',
				description:
					'Honorific abbreviation, word, or phrase to be used in front of name in greetings, such as Dr. or Mrs.',
			},
			{
				displayName: 'Pronouns',
				name: 'pronouns',
				type: 'string',
				default: '',
				description: "The contact's personal pronouns",
			},
			{
				displayName: 'Gender identity',
				name: 'genderIdentity',
				type: 'string',
				default: '',
				description: "The contact's gender identity",
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the contact such as CEO or Vice President',
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
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		description: 'ID of contact that needs to be fetched',
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		options: [
			accountResourceLocator('acconuntId', 'The account that is the parent of this contact'),
			{
				displayName: 'Assistant name',
				name: 'assistantName',
				type: 'string',
				default: '',
				description: 'The name of the assistant',
			},
			{
				displayName: 'Assistant phone',
				name: 'Assistant Phone',
				type: 'string',
				default: '',
				description: 'The telephone number of the assistant',
			},
			{
				displayName: 'Birth date',
				name: 'birthdate',
				type: 'dateTime',
				default: '',
				description: 'The birth date of the contact',
			},
			{
				displayName: 'Custom fields',
				name: 'customFieldsUi',
				placeholder: 'Add custom field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom field',
						values: [
							{
								displayName: 'Field name or ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description:
									'The ID of the field to add custom field to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
				description: 'The department of the contact',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A description of the contact. Label is Contact Description. Limit: 32 KB.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email address for the contact',
			},
			{
				displayName: 'Email bounced date',
				name: 'emailBouncedDate',
				type: 'dateTime',
				default: '',
				description:
					'If bounce management is activated and an email sent to the contact bounces, the date and time the bounce occurred',
			},
			{
				displayName: 'Email bounced reason',
				name: 'emailBouncedReason',
				type: 'string',
				default: '',
				description:
					'If bounce management is activated and an email sent to the contact bounces, the reason the bounce occurred',
			},
			{
				displayName: 'Email opt out',
				name: 'hasOptedOutOfEmail',
				type: 'boolean',
				default: false,
				description: 'Whether the contact does not want to receive email from Salesforce',
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
				description: 'Fax number for the contact. Label is Business Fax.',
			},
			{
				displayName: 'First name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the contact. Maximum size is 40 characters.',
			},
			{
				displayName: 'Middle name',
				name: 'middleName',
				type: 'string',
				default: '',
				description: 'Middle name of the contact. Maximum size is 40 characters.',
			},
			{
				displayName: 'Suffix',
				name: 'suffix',
				type: 'string',
				default: '',
				description: 'Name suffix of the contact. Maximum size is 40 characters.',
			},
			{
				displayName: 'Home phone',
				name: 'homePhone',
				type: 'string',
				default: '',
				description: 'Home telephone number for the contact',
			},
			{
				displayName: 'Jigsaw',
				name: 'jigsaw',
				type: 'string',
				default: '',
				description:
					'References the ID of a contact in Data.com. If a contact has a value in this field, it means that a contact was imported as a contact from Data.com.',
			},
			{
				displayName: 'Last name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the contact. Limited to 80 characters.',
			},
			{
				displayName: 'Lead source name or ID',
				name: 'leadSource',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLeadSources',
				},
				default: '',
				description:
					'Source from which the lead was obtained. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Mailing city',
				name: 'mailingCity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing country',
				name: 'mailingCountry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing state',
				name: 'mailingState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing street',
				name: 'mailingStreet',
				type: 'string',
				default: '',
				description: 'Street address for mailing address',
			},
			{
				displayName: 'Mailing postal code',
				name: 'mailingPostalCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mobile phone',
				name: 'mobilePhone',
				type: 'string',
				default: '',
				description: 'Contact’s mobile phone number',
			},
			{
				displayName: 'Other city',
				name: 'otherCity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other country',
				name: 'otherCountry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other phone',
				name: 'otherPhone',
				type: 'string',
				default: '',
				description: 'Telephone for alternate address',
			},
			{
				displayName: 'Other postal code',
				name: 'otherPostalCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other state',
				name: 'otherState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other street',
				name: 'otherStreet',
				type: 'string',
				default: '',
				description: 'Street for alternate address',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				modes: [
					{
						displayName: 'From list',
						name: 'list',
						type: 'list',
						placeholder: 'Select a user...',
						typeOptions: {
							searchListMethod: 'searchUsers',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: '0051700000ABCDE',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^(?:[a-zA-Z0-9]{15}|[a-zA-Z0-9]{18})$',
									errorMessage: 'User ID must be 15 or 18 alphanumeric characters',
								},
							},
						],
					},
				],
				description: 'The user who owns the contact',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number for the contact',
			},
			{
				displayName: 'Record type name or ID',
				name: 'recordTypeId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getRecordTypes',
				},
				default: '',
			},
			{
				displayName: 'Salutation',
				name: 'salutation',
				type: 'string',
				default: '',
				description:
					'Honorific abbreviation, word, or phrase to be used in front of name in greetings, such as Dr. or Mrs.',
			},
			{
				displayName: 'Pronouns',
				name: 'pronouns',
				type: 'string',
				default: '',
				description: "The contact's personal pronouns",
			},
			{
				displayName: 'Gender identity',
				name: 'genderIdentity',
				type: 'string',
				default: '',
				description: "The contact's gender identity",
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the contact such as CEO or Vice President',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  contact:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
		description: 'ID of contact that needs to be fetched',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  contact:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['delete'],
			},
		},
		description: 'ID of contact that needs to be fetched',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['contact'],
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
				resource: ['contact'],
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
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Conditions',
				name: 'conditionsUi',
				placeholder: 'Add condition',
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
								displayName: 'Field name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getContactFields',
								},
								default: '',
								description:
									'For date, number, or boolean, please use expressions. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields to include separated by ,',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                            contact:addToCampaign                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['addToCampaign'],
			},
		},
		description: 'ID of contact that needs to be fetched',
	},
	{
		displayName: 'Campaign name or ID',
		name: 'campaignId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['addToCampaign'],
			},
		},
		description:
			'ID of the campaign that needs to be fetched. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['addToCampaign'],
			},
		},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'Controls the HasResponded flag on this object',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                             contact:addNote                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['addNote'],
			},
		},
		description: 'ID of contact that needs to be fetched',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['addNote'],
			},
		},
		description: 'Title of the note',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['addNote'],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				description: 'Body of the note. Limited to 32 KB.',
			},
			{
				displayName: 'Is private',
				name: 'isPrivate',
				type: 'boolean',
				default: false,
				description:
					'Whether only the note owner or a user with the “Modify All Data” permission can view the note or query it via the API',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				modes: [
					{
						displayName: 'From list',
						name: 'list',
						type: 'list',
						placeholder: 'Select a user...',
						typeOptions: {
							searchListMethod: 'searchUsers',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: '0051700000ABCDE',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^(?:[a-zA-Z0-9]{15}|[a-zA-Z0-9]{18})$',
									errorMessage: 'User ID must be 15 or 18 alphanumeric characters',
								},
							},
						],
					},
				],
				description: 'The user who owns the note',
			},
		],
	},
];
