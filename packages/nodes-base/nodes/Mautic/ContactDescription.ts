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
				name: 'Create',
				value: 'create',
				description: 'Create a new contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
			},
			{
				name: 'Edit Contact Points',
				value: 'editContactPoint',
				description: 'Edit contact\'s points',
			},
			{
				name: 'Edit Do Not Contact List',
				value: 'editDoNotContactList',
				description: 'Add/remove contacts from/to the do not contact list',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all contacts',
			},
			{
				name: 'Send Email',
				value: 'sendEmail',
				description: 'Send email to contact',
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
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contact',
				],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'Email address of the contact.',
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'First Name',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'Last Name',
	},
	{
		displayName: 'Primary Company',
		name: 'company',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCompanies',
		},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'Primary company',
	},
	{
		displayName: 'Position',
		name: 'position',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'Position',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'Title',
	},
	{
		displayName: 'Body',
		name: 'bodyJson',
		type: 'json',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contact',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'Contact parameters',
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
				displayName: 'B2B or B2C',
				name: 'b2bOrb2c',
				type: 'options',
				options: [
					{
						name: 'B2B',
						value: 'B2B',
					},
					{
						name: 'B2C',
						value: 'B2C',
					},
				],
				default: '',
			},
			{
				displayName: 'CRM ID',
				name: 'crmId',
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
									loadOptionsMethod: 'getContactFields',
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
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Has Purchased',
				name: 'hasPurchased',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				description: 'IP address to associate with the contact',
			},
			{
				displayName: 'Last Active',
				name: 'lastActive',
				type: 'dateTime',
				default: '',
				description: 'Date/time in UTC;',
			},
			{
				displayName: 'Mobile',
				name: 'mobile',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Owner ID',
				name: 'ownerId',
				type: 'string',
				default: '',
				description: 'ID of a Mautic user to assign this contact to',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Prospect or Customer',
				name: 'prospectOrCustomer',
				type: 'options',
				options: [
					{
						name: 'Prospect',
						value: 'Prospect',
					},
					{
						name: 'Customer',
						value: 'Customer',
					},
				],
				default: '',
			},
			{
				displayName: 'Sandbox',
				name: 'sandbox',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Stage',
				name: 'stage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getStages',
				},
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: '',
			},
			{
				displayName: 'Social Media',
				name: 'socialMediaUi',
				placeholder: 'Social Media',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						name: 'socialMediaValues',
						displayName: 'Social Media',
						values: [
							{
								displayName: 'Facebook',
								name: 'facebook',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Foursquare',
								name: 'foursquare',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Instagram',
								name: 'instagram',
								type: 'string',
								default: '',
							},
							{
								displayName: 'LinkedIn',
								name: 'linkedIn',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Skype',
								name: 'skype',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Twitter',
								name: 'twitter',
								type: 'string',
								default: '',
							},
						],
					},
				],
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
	/*                               contact:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'Contact ID',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
				],
			},
		},
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
				displayName: 'Body',
				name: 'bodyJson',
				type: 'json',
				displayOptions: {
					show: {
						'/jsonParameters': [
							true,
						],
					},
				},
				default: '',
				description: 'Contact parameters',
			},
			{
				displayName: 'Address',
				name: 'addressUi',
				placeholder: 'Address',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
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
				displayName: 'B2B or B2C',
				name: 'b2bOrb2c',
				type: 'options',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				options: [
					{
						name: 'B2B',
						value: 'B2B',
					},
					{
						name: 'B2C',
						value: 'B2C',
					},
				],
				default: '',
			},
			{
				displayName: 'CRM ID',
				name: 'crmId',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
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
									loadOptionsMethod: 'getContactFields',
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
				displayName: 'Email',
				name: 'email',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'Email address of the contact.',
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'First Name',
			},
			{
				displayName: 'Has Purchased',
				name: 'hasPurchased',
				type: 'boolean',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: false,
			},
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'IP address to associate with the contact',
			},
			{
				displayName: 'Last Active',
				name: 'lastActive',
				type: 'dateTime',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'Date/time in UTC;',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'LastName',
			},
			{
				displayName: 'Mobile',
				name: 'mobile',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
			},
			{
				displayName: 'Owner ID',
				name: 'ownerId',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'ID of a Mautic user to assign this contact to',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'Position',
			},
			{
				displayName: 'Primary Company',
				name: 'company',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'Primary company',
			},
			{
				displayName: 'Prospect or Customer',
				name: 'prospectOrCustomer',
				type: 'options',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				options: [
					{
						name: 'Prospect',
						value: 'Prospect',
					},
					{
						name: 'Customer',
						value: 'Customer',
					},
				],
				default: '',
			},
			{
				displayName: 'Sandbox',
				name: 'sandbox',
				type: 'boolean',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: false,
			},
			{
				displayName: 'Stage',
				name: 'stage',
				type: 'options',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getStages',
				},
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'Title',
			},
			{
				displayName: 'Social Media',
				name: 'socialMediaUi',
				placeholder: 'Social Media',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						name: 'socialMediaValues',
						displayName: 'Social Media',
						values: [
							{
								displayName: 'Facebook',
								name: 'facebook',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Foursquare',
								name: 'foursquare',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Instagram',
								name: 'instagram',
								type: 'string',
								default: '',
							},
							{
								displayName: 'LinkedIn',
								name: 'linkedIn',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Skype',
								name: 'skype',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Twitter',
								name: 'twitter',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
			},
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'IP address to associate with the contact',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                   contact:editDoNotContactList                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'editDoNotContactList',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'Contact ID',
	},
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		displayOptions: {
			show: {
				operation: [
					'editDoNotContactList',
				],
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
			},
			{
				name: 'Remove',
				value: 'remove',
			},
		],
		default: 'add',
	},
	{
		displayName: 'Channel',
		name: 'channel',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'editDoNotContactList',
				],
			},
		},
		options: [
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'SMS',
				value: 'sms',
			},
		],
		default: 'email',
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
					'editDoNotContactList',
				],
			},
		},
		options: [
			{
				displayName: 'Reason To Do Not Contact',
				name: 'reason',
				type: 'options',
				options: [
					{
						name: 'Unsubscribed',
						value: '1',
					},
					{
						name: 'Bounced',
						value: '2',
					},
					{
						name: 'Manual',
						value: '3',
					},
				],
				default: '3',
			},
			{
				displayName: 'Comments',
				name: 'comments',
				type: 'string',
				default: '',
				description: 'A text describing details of Do Not Contact entry',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                   contact:editContactPoint                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'editContactPoint',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'Contact ID',
	},
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		displayOptions: {
			show: {
				operation: [
					'editContactPoint',
				],
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
			},
			{
				name: 'Remove',
				value: 'remove',
			},
		],
		default: 'add',
	},
	{
		displayName: 'Points',
		name: 'points',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'editContactPoint',
				],
				resource: [
					'contact',
				],
			},
		},
		default: 0,
	},
	/* -------------------------------------------------------------------------- */
	/*                                 contact:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
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
		default: '',
		description: 'Contact ID',
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:getAll                              */
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
			maxValue: 30,
		},
		default: 30,
		description: 'How many results to return.',
	},

	/* -------------------------------------------------------------------------- */
	/*                               contact:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'Contact ID',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:all                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				'resource': [
					'contact',
				],
			},
			hide: {
				operation: [
					'sendEmail',
					'editDoNotContactList',
					'editContactPoint',
				],
			},
		},
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				displayOptions: {
					show: {
						'/resource': [
							'contact',
						],
						'/operation': [
							'getAll',
						],
					},
				},
				default: '',
				description: 'String or search command to filter entities by.',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'string',
				displayOptions: {
					show: {
						'/resource': [
							'contact',
						],
						'/operation': [
							'getAll',
						],
					},
				},
				default: '',
				description: 'Column to sort by. Can use any column listed in the response.',
			},
			{
				displayName: 'Order By Dir',
				name: 'orderByDir',
				type: 'options',
				displayOptions: {
					show: {
						'/resource': [
							'contact',
						],
						'/operation': [
							'getAll',
						],
					},
				},
				default: '',
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
				description: 'Sort direction: ASC or DESC.',
			},
			{
				displayName: 'Published Only',
				name: 'publishedOnly',
				type: 'boolean',
				displayOptions: {
					show: {
						'/resource': [
							'contact',
						],
						'/operation': [
							'getAll',
						],
					},
				},
				default: false,
				description: 'Only return currently published entities.',
			},
			{
				displayName: 'Minimal',
				name: 'minimal',
				type: 'boolean',
				displayOptions: {
					show: {
						'/resource': [
							'contact',
						],
						'/operation': [
							'getAll',
						],
					},
				},
				default: false,
				description: 'Return only array of entities without additional lists in it.',
			},
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				default: true,
				description: `By default only the data of the fields get returned. If this
							  options gets set the RAW response with all data gets returned.`,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                contact:sendEmail                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Campaign Email ID',
		name: 'campaignEmailId',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'sendEmail',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getCampaignEmails',
		},
		default: '',
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'sendEmail',
				],
			},
		},
		default: '',
	},
];
