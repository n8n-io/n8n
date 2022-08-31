import { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new contact',
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
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts',
				action: 'Get all contacts',
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
	/*                                contact:create/update                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		placeholder: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['contact'],
			},
		},
		default: '',
		description: 'Name of the contact',
		required: true,
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['contact'],
			},
		},
		description:
			'Primary email address of the contact. If you want to associate additional email(s) with this contact, use the other_emails attribute.',
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['contact'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Address of the contact',
			},
			// {
			// 	displayName: 'Avatar',
			// 	name: 'avatar',
			// 	type: '',
			// 	default: '',
			// 	description: `Avatar image of the contact The maximum file size is 5MB
			// 	and the supported file types are .jpg, .jpeg, .jpe, and .png.`,
			// },
			{
				displayName: 'Company ID',
				name: 'company_id',
				type: 'number',
				default: '',
				description: 'ID of the primary company to which this contact belongs',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				type: 'fixedCollection',
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				description:
					'Key value pairs containing the name and value of the custom field. Only dates in the format YYYY-MM-DD are accepted as input for custom date fields.',
				default: [],
				options: [
					{
						displayName: 'Custom Field',
						name: 'customField',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: "Custom Field's name",
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: "Custom Field's values",
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
				description: 'A small description of the contact',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				displayOptions: {
					show: {
						'/operation': ['update'],
					},
				},
				description:
					'Primary email address of the contact. If you want to associate additional email(s) with this contact, use the other_emails attribute.',
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
				description: 'Job title of the contact',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				description:
					'Language of the contact. Default language is "en". This attribute can only be set if the Multiple Language feature is enabled (Garden plan and above).',
			},
			{
				displayName: 'Mobile',
				name: 'mobile',
				type: 'string',
				default: '',
				description: 'Mobile number of the contact',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						'/operation': ['update'],
					},
				},
				description: 'Name of the contact',
			},
			{
				displayName: 'Other Companies',
				name: 'other_companies',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Company',
				description:
					'Additional companies associated with the contact. This attribute can only be set if the Multiple Companies feature is enabled (Estate plan and above).',
			},
			{
				displayName: 'Other Emails',
				name: 'other_emails',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Email',
				description: 'Additional emails associated with the contact',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Telephone number of the contact',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
				},
				description: 'Tags associated with this contact',
			},
			{
				displayName: 'Time Zone',
				name: 'time_zone',
				type: 'string',
				default: '',
				description:
					'Time zone of the contact. Default value is the time zone of the domain. This attribute can only be set if the Multiple Time Zone feature is enabled (Garden plan and above).',
			},
			{
				displayName: 'Twitter ID',
				name: 'twitter_id',
				type: 'string',
				default: '',
				description: 'Twitter handle of the contact',
			},
			{
				displayName: 'Unique External ID',
				name: 'unique_external_id',
				type: 'string',
				default: '',
				description: 'External ID of the contact',
			},
			{
				displayName: 'View All Tickets',
				name: 'view_all_tickets',
				type: 'boolean',
				default: false,
				description:
					'Whether the contact can see all the tickets that are associated with the company to which they belong',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                contact:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['delete'],
			},
		},
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                contact:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                contact:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['contact'],
			},
		},
		options: [
			{
				displayName: 'Company ID',
				name: 'company_id',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Mobile',
				name: 'mobile',
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
				displayName: 'State',
				name: 'state',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Blocked',
						value: 'blocked',
					},
					{
						name: 'Deleted',
						value: 'deleted',
					},
					{
						name: 'Unverified',
						value: 'unverified',
					},
					{
						name: 'Verified',
						value: 'verified',
					},
				],
			},
			{
				displayName: 'Updated Since',
				name: 'updated_since',
				type: 'dateTime',
				default: '',
			},
		],
	},
];
