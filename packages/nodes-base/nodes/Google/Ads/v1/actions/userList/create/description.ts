import {
	UserListProperties,
} from '../../Interfaces';

export const userListDescription: UserListProperties = [
	{
		displayName: 'Name',
		name: 'name',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the user list',
	},
	{
		displayName: 'Upload Key Type',
		name: 'uploadKeyType',
		type: 'options',
		default: 'CONTACT_INFO',
		description: 'Matching key type of the list. Mixed data types are not allowed on the same list. This field is required for an ADD operation.',
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Unspecified',
				value: 'UNSPECIFIED',
				description: 'Not specified',
			},
			{
				name: 'Unknown',
				value: 'UNKNOWN',
				description: 'Used for return value only. Represents value unknown in this version.',
			},
			{
				name: 'Contact Info',
				value: 'CONTACT_INFO',
				description: 'Members are matched from customer info such as email address, phone number or physical address',
			},
			{
				name: 'CRM ID',
				value: 'CRM_ID',
				description: 'Members are matched from a user ID generated and assigned by the advertiser',
			},
			{
				name: 'Mobile Advertising ID',
				value: 'MOBILE_ADVERTISING_ID',
				description: 'Members are matched from mobile advertising IDs',
			},
		],
	},
	{
		displayName: 'App ID',
		name: 'appId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['create'],
				uploadKeyType: ['MOBILE_ADVERTISING_ID'],
			},
		},
		default: '',
		description: 'A string that uniquely identifies a mobile application from which the data was collected. For iOS, the ID string is the 9 digit string that appears at the end of an App Store URL (example: 476943146). For Android, the ID string is the application\'s package name (example: com.labpixies.colordrips).',
	},
	{
		displayName: 'Data Source Type',
		name: 'dataSourceType',
		type: 'options',
		default: 'UNSPECIFIED',
		description: 'Data source of the list. Default value is FIRST_PARTY. Only customers on the allow-list can create third-party sourced CRM lists.',
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Unspecified',
				value: 'UNSPECIFIED',
				description: 'Not specified',
			},
			{
				name: 'First Party',
				value: 'FIRST_PARTY',
				description: 'The uploaded data is first-party data',
			},
			{
				name: 'Third Party Credit Bureau',
				value: 'THIRD_PARTY_CREDIT_BUREAU',
				description: 'The uploaded data is from a third-party credit bureau',
			},
			{
				name: 'Third Party Voter File',
				value: 'THIRD_PARTY_VOTER_FILE',
				description: 'The uploaded data is from a third-party voter file',
			},
		],
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
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of this user list',
			},
			{
				displayName: 'Integration Code',
				name: 'integrationCode',
				type: 'string',
				default: '',
				description: 'An ID from external system. It is used by user list sellers to correlate IDs on their systems.',
			},
			{
				displayName: 'Membership Life Span',
				name: 'membershipLifeSpan',
				type: 'number',
				default: '',
				description: 'Number of days a user\'s cookie stays on your list since its most recent addition to the list.\n' +
					'This field must be between 0 and 540 inclusive.\n' +
					'However, for CRM based userlists, this field can be set to 10000 which means no expiration.',
			},
			{
				displayName: 'Eligible For Search',
				name: 'eligibleForSearch',
				type: 'boolean',
				default: false,
				description: 'Whether the user list is eligible for Google Search Network',
			},
		],
	},
	{
		displayName: 'Simplify Output',
		name: 'simplifyOutput',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['userList'],
				operation: ['create'],
			},
		},
		description: 'Whether to simplify the output data',
	},
];
