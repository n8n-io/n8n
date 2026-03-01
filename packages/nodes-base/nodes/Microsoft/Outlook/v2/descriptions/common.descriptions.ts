import type { INodeProperties } from 'n8n-workflow';

export const returnAllOrLimit: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 100,
		description: 'Max number of results to return',
	},
];

export const folderFields = [
	{
		name: 'Child Folder Count',
		value: 'childFolderCount',
	},
	{
		name: 'Display Name',
		value: 'displayName',
	},
	{
		name: 'Is Hidden',
		value: 'isHidden',
	},
	{
		name: 'Parent Folder ID',
		value: 'parentFolderId',
	},
	{
		name: 'Total Item Count',
		value: 'totalItemCount',
	},
	{
		name: 'Unread Item Count',
		value: 'unreadItemCount',
	},
];

export const contactFields: INodeProperties[] = [
	{
		displayName: 'Assistant Name',
		name: 'assistantName',
		type: 'string',
		default: '',
		description: "The name of the contact's assistant",
	},
	{
		displayName: 'Birthday',
		name: 'birthday',
		type: 'dateTime',
		default: '',
	},
	{
		displayName: 'Business Address',
		name: 'businessAddress',
		type: 'fixedCollection',
		placeholder: 'Add Address',
		default: {
			values: { sity: '', street: '', postalCode: '', countryOrRegion: '', state: '' },
		},
		options: [
			{
				displayName: 'Address',
				name: 'values',
				values: [
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country/Region',
						name: 'countryOrRegion',
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
						displayName: 'State',
						name: 'state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Street',
						name: 'street',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Business Home Page',
		name: 'businessHomePage',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Business Phones',
		name: 'businessPhones',
		type: 'string',
		description: 'Comma-separated list of business phone numbers',
		default: '',
	},
	{
		displayName: 'Categories',
		name: 'categories',
		description: 'Comma-separated list of categories associated with the contact',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Children',
		name: 'children',
		description: "Comma-separated list of names of the contact's children",
		type: 'string',
		default: '',
	},
	{
		displayName: 'Company Name',
		name: 'companyName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Department',
		name: 'department',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Email Address',
		name: 'emailAddresses',
		type: 'fixedCollection',
		placeholder: 'Add Email',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Email',
				name: 'values',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Address',
						name: 'address',
						type: 'string',
						default: '',
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
		description: 'The name the contact is filed under',
	},
	{
		displayName: 'Home Address',
		name: 'homeAddress',
		type: 'fixedCollection',
		placeholder: 'Add Address',
		default: {
			values: { sity: '', street: '', postalCode: '', countryOrRegion: '', state: '' },
		},
		options: [
			{
				displayName: 'Address',
				name: 'values',
				values: [
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country/Region',
						name: 'countryOrRegion',
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
						displayName: 'State',
						name: 'state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Street',
						name: 'street',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Home Phones',
		name: 'homePhones',
		type: 'string',
		default: '',
		hint: 'Multiple phones can be added separated by ,',
	},
	{
		displayName: 'Instant Messaging Addresses',
		name: 'imAddresses',
		description: "The contact's instant messaging (IM) addresses",
		type: 'string',
		default: '',
		hint: 'Multiple addresses can be added separated by ,',
	},
	{
		displayName: 'Initials',
		name: 'initials',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Job Title',
		name: 'jobTitle',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Manager',
		name: 'manager',
		type: 'string',
		default: '',
		description: "The name of the contact's manager",
	},
	{
		displayName: 'Middle Name',
		name: 'middleName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Mobile Phone',
		name: 'mobilePhone',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Name',
		name: 'givenName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				'/operation': ['update'],
			},
		},
	},
	{
		displayName: 'Nickname',
		name: 'nickName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Office Location',
		name: 'officeLocation',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Other Address',
		name: 'otherAddress',
		type: 'fixedCollection',
		placeholder: 'Add Address',
		default: {
			values: { sity: '', street: '', postalCode: '', countryOrRegion: '', state: '' },
		},
		options: [
			{
				displayName: 'Address',
				name: 'values',
				values: [
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country/Region',
						name: 'countryOrRegion',
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
						displayName: 'State',
						name: 'state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Street',
						name: 'street',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Personal Notes',
		name: 'personalNotes',
		type: 'string',
		default: '',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
	},
	{
		displayName: 'Profession',
		name: 'profession',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Spouse Name',
		name: 'spouseName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Surname',
		name: 'surname',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
	},
];
