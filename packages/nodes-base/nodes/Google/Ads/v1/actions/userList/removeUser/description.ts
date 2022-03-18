import {
	UserListProperties,
} from '../../Interfaces';

export const userListDescription: UserListProperties = [
	{
		displayName: 'User List Resource Name',
		name: 'userListResourceName',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUserListResourceNames',
		},
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['removeUser'],
			},
		},
		default: '',
		description: 'The resource name of the user list',
	},
	{
		displayName: 'See <a href="https://developers.google.com/google-ads/api/rest/reference/rest/v9/UserIdentifier" target="_blank">Google Ads Guide</a> To User Identifiers',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['removeUser'],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['removeUser'],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'The email of the user',
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: 'The phone number of the user',
			},
			{
				displayName: 'Address Info',
				name: 'addressInfo',
				type: 'fixedCollection',
				placeholder: 'Add Address Info',
				default: { metadataValues:[] },
				description: 'The address info of the user',
				options: [
					{
						displayName: 'Metadata Values',
						name: 'metadataValues',
						values: [
							{
								displayName: 'First Name',
								name: 'firstName',
								required: true,
								type: 'string',
								default: '',
								description: 'The first name of the user',
							},
							{
								displayName: 'Last Name',
								name: 'lastName',
								required: true,
								type: 'string',
								default: '',
								description: 'The last name of the user',
							},
							{
								displayName: 'Country Code',
								name: 'countryCode',
								required: true,
								type: 'string',
								default: '',
								description: 'The country code of the user',
							},
							{
								displayName: 'Postal Code',
								name: 'postalCode',
								required: true,
								type: 'string',
								default: '',
								description: 'The postal code of the user',
							},
						],
					},
				],
			},
		],
	},
];
