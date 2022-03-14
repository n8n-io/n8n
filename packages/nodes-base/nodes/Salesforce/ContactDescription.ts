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
				name: 'Add Lead To Campaign',
				value: 'addToCampaign',
				description: 'Add lead to a campaign',
			},
			{
				name: 'Add Note',
				value: 'addNote',
				description: 'Add note to a contact',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a contact',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new contact, or update the current one if it already exists (upsert)',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
			},
			{
				name: 'Get Summary',
				value: 'getSummary',
				description: `Returns an overview of contact's metadata`,
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const contactFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                contact:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Match Against',
		name: 'externalId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getExternalIdFields',
			loadOptionsDependsOn: [
				'resource',
			],
		},
		required: true,
		default: '',
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
		description: `The field to check to see if the contact already exists`,
	},
	{
		displayName: 'Value to Match',
		name: 'externalIdValue',
		type: 'string',
		required: true,
		default: '',
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
		description: `If this value exists in the 'match against' field, update the contact. Otherwise create a new one`,
	},
	{
		displayName: 'Last Name',
		name: 'lastname',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
					'upsert',
				],
			},
		},
		description: 'Required. Last name of the contact. Limited to 80 characters.',
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
					'create',
					'upsert',
				],
			},
		},
		options: [
			{
				displayName: 'Account',
				name: 'acconuntId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				default: '',
				description: 'ID of the account that is the parent of this contact.',
			},
			{
				displayName: 'Assistant Name',
				name: 'assistantName',
				type: 'string',
				default: '',
				description: 'The name of the assistant.',
			},
			{
				displayName: 'Assistant Phone',
				name: 'Assistant Phone',
				type: 'string',
				default: '',
				description: 'The telephone number of the assistant.',
			},
			{
				displayName: 'Birth Date',
				name: 'birthdate',
				type: 'dateTime',
				default: '',
				description: 'The birth date of the contact.',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields ',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description: 'The ID of the field to add custom field to.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field.',
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
				description: 'The department of the contact.',
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
				default: '',
				description: 'Email address for the contact.',
			},
			{
				displayName: 'Email Bounced Date',
				name: 'otherPostalCode',
				type: 'dateTime',
				default: '',
				description: 'If bounce management is activated and an email sent to the contact bounces, the date and time the bounce occurred.',
			},
			{
				displayName: 'Email Bounced Reason',
				name: 'emailBouncedReason',
				type: 'string',
				default: '',
				description: 'If bounce management is activated and an email sent to the contact bounces, the reason the bounce occurred.',
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
				description: 'Fax number for the contact. Label is Business Fax.',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the contact. Maximum size is 40 characters.',
			},
			{
				displayName: 'Home Phone',
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
				description: `references the ID of a contact in Data.com.
				If a contact has a value in this field, it means that a contact was imported as a contact from Data.com.`,
			},
			{
				displayName: 'Lead Source',
				name: 'leadSource',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLeadSources',
				},
				default: '',
				description: 'Source from which the lead was obtained.',
			},
			{
				displayName: 'Mailing City',
				name: 'mailingCity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing Country',
				name: 'mailingCountry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobilePhone',
				type: 'string',
				default: '',
				description: `Contact’s mobile phone number.`,
			},
			{
				displayName: 'Mailing Postal Code',
				name: 'mailingPostalCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing State',
				name: 'mailingState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing Street',
				name: 'mailingStreet',
				type: 'string',
				default: '',
				description: 'Street address for mailing address.',
			},
			{
				displayName: 'Other City',
				name: 'otherCity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other Country',
				name: 'otherCountry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other Phone',
				name: 'otherPhone',
				type: 'string',
				default: '',
				description: 'Telephone for alternate address.',
			},
			{
				displayName: 'Other Postal Code',
				name: 'otherPostalCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other State',
				name: 'otherState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other Street',
				name: 'otherStreet',
				type: 'string',
				default: '',
				description: 'Street for alternate address.',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The owner of the contact.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number for the contact.',
			},
			{
				displayName: 'Record Type ID',
				name: 'recordTypeId',
				type: 'options',
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
				description: 'Honorific abbreviation, word, or phrase to be used in front of name in greetings, such as Dr. or Mrs.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the contact such as CEO or Vice President.',
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
				resource: [
					'contact',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'ID of contact that needs to be fetched.',
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
					'contact',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Account',
				name: 'acconuntId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				default: '',
				description: 'ID of the account that is the parent of this contact.',
			},
			{
				displayName: 'Assistant Name',
				name: 'assistantName',
				type: 'string',
				default: '',
				description: 'The name of the assistant.',
			},
			{
				displayName: 'Assistant Phone',
				name: 'Assistant Phone',
				type: 'string',
				default: '',
				description: 'The telephone number of the assistant.',
			},
			{
				displayName: 'Birth Date',
				name: 'birthdate',
				type: 'dateTime',
				default: '',
				description: 'The birth date of the contact.',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields ',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description: 'The ID of the field to add custom field to.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field.',
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
				description: 'The department of the contact.',
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
				default: '',
				description: 'Email address for the contact.',
			},
			{
				displayName: 'Email Bounced Date',
				name: 'emailBouncedDate',
				type: 'dateTime',
				default: '',
				description: 'If bounce management is activated and an email sent to the contact bounces, the date and time the bounce occurred.',
			},
			{
				displayName: 'Email Bounced Reason',
				name: 'emailBouncedReason',
				type: 'string',
				default: '',
				description: 'If bounce management is activated and an email sent to the contact bounces, the reason the bounce occurred.',
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
				description: 'Fax number for the contact. Label is Business Fax.',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the contact. Maximum size is 40 characters.',
			},
			{
				displayName: 'Home Phone',
				name: 'homePhone',
				type: 'string',
				default: '',
				description: 'Home telephone number for the contact.',
			},
			{
				displayName: 'Jigsaw',
				name: 'jigsaw',
				type: 'string',
				default: '',
				description: `references the ID of a contact in Data.com.
				If a contact has a value in this field, it means that a contact was imported as a contact from Data.com.`,
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the contact. Limited to 80 characters.',
			},
			{
				displayName: 'Lead Source',
				name: 'leadSource',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLeadSources',
				},
				default: '',
				description: 'Source from which the lead was obtained.',
			},
			{
				displayName: 'Mailing City',
				name: 'mailingCity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing Country',
				name: 'mailingCountry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing State',
				name: 'mailingState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing Street',
				name: 'mailingStreet',
				type: 'string',
				default: '',
				description: 'Street address for mailing address.',
			},
			{
				displayName: 'Mailing Postal Code',
				name: 'mailingPostalCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobilePhone',
				type: 'string',
				default: '',
				description: `Contact’s mobile phone number.`,
			},
			{
				displayName: 'Other City',
				name: 'otherCity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other Country',
				name: 'otherCountry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other Phone',
				name: 'otherPhone',
				type: 'string',
				default: '',
				description: 'Telephone for alternate address.',
			},
			{
				displayName: 'Other Postal Code',
				name: 'otherPostalCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other State',
				name: 'otherState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Other Street',
				name: 'otherStreet',
				type: 'string',
				default: '',
				description: 'Street for alternate address.',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The owner of the contact.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number for the contact.',
			},
			{
				displayName: 'Record Type ID',
				name: 'recordTypeId',
				type: 'options',
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
				description: 'Honorific abbreviation, word, or phrase to be used in front of name in greetings, such as Dr. or Mrs.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the contact such as CEO or Vice President.',
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
				resource: [
					'contact',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'ID of contact that needs to be fetched.',
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
				resource: [
					'contact',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'ID of contact that needs to be fetched',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:getAll                                */
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
		description: 'If all results should be returned or only up to a given limit.',
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
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
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
				displayName: 'Conditions',
				name: 'conditionsUi',
				placeholder: 'Add Condition',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'The condition to set.',
				default: {},
				options: [
					{
						name: 'conditionValues',
						displayName: 'Condition',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getContactFields',
								},
								default: '',
								description: 'For date, number, or boolean, please use expressions.',
							},
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{
										name: '=',
										value: 'equal',
									},
									{
										name: '>',
										value: '>',
									},
									{
										name: '<',
										value: '<',
									},
									{
										name: '>=',
										value: '>=',
									},
									{
										name: '<=',
										value: '<=',
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
				resource: [
					'contact',
				],
				operation: [
					'addToCampaign',
				],
			},
		},
		description: 'ID of contact that needs to be fetched.',
	},
	{
		displayName: 'Campaign',
		name: 'campaignId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'addToCampaign',
				],
			},
		},
		description: 'ID of the campaign that needs to be fetched.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'addToCampaign',
				],
			},
		},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'Controls the HasResponded flag on this object.',
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
				resource: [
					'contact',
				],
				operation: [
					'addNote',
				],
			},
		},
		description: 'ID of contact that needs to be fetched.',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'addNote',
				],
			},
		},
		description: 'Title of the note.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'addNote',
				],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Body of the note. Limited to 32 KB.',
			},
			{
				displayName: 'Is Private',
				name: 'isPrivate',
				type: 'boolean',
				default: false,
				description: 'If true, only the note owner or a user with the “Modify All Data” permission can view the note or query it via the API',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'ID of the user who owns the note.',
			},
		],
	},
];
