import type { INodeProperties, INodePropertyCollection } from 'n8n-workflow';

const attendeeValues: INodePropertyCollection = {
	displayName: 'Attendee',
	name: 'values',
	values: [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			required: true,
			default: '',
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Type',
			name: 'type',
			type: 'options',
			default: 'required',
			options: [
				{
					name: 'Optional',
					value: 'optional',
				},
				{
					name: 'Required',
					value: 'required',
				},
				{
					name: 'Resource',
					value: 'resource',
				},
			],
		},
	],
};

export const eventAttendeesField: INodeProperties = {
	displayName: 'Attendees',
	name: 'attendees',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	placeholder: 'Add attendee',
	options: [attendeeValues],
};

export const eventLocationField: INodeProperties = {
	displayName: 'Location',
	name: 'location',
	type: 'string',
	default: '',
	description: 'The location of the event (e.g. a meeting room name, address, or meeting link)',
};

export const returnAllOrLimit: INodeProperties[] = [
	{
		displayName: 'Return all',
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
		displayName: 'Assistant name',
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
		displayName: 'Business address',
		name: 'businessAddress',
		type: 'fixedCollection',
		placeholder: 'Add address',
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
						displayName: 'Country/region',
						name: 'countryOrRegion',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Postal code',
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
		displayName: 'Business home page',
		name: 'businessHomePage',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Business phones',
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
		displayName: 'Company name',
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
		displayName: 'Display name',
		name: 'displayName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Email address',
		name: 'emailAddresses',
		type: 'fixedCollection',
		placeholder: 'Add email',
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
		displayName: 'File as',
		name: 'fileAs',
		type: 'string',
		default: '',
		description: 'The name the contact is filed under',
	},
	{
		displayName: 'Home address',
		name: 'homeAddress',
		type: 'fixedCollection',
		placeholder: 'Add address',
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
						displayName: 'Country/region',
						name: 'countryOrRegion',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Postal code',
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
		displayName: 'Home phones',
		name: 'homePhones',
		type: 'string',
		default: '',
		hint: 'Multiple phones can be added separated by ,',
	},
	{
		displayName: 'Instant messaging addresses',
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
		displayName: 'Job title',
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
		displayName: 'Middle name',
		name: 'middleName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Mobile phone',
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
		displayName: 'Office location',
		name: 'officeLocation',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Other address',
		name: 'otherAddress',
		type: 'fixedCollection',
		placeholder: 'Add address',
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
						displayName: 'Country/region',
						name: 'countryOrRegion',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Postal code',
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
		displayName: 'Personal notes',
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
		displayName: 'Spouse name',
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
