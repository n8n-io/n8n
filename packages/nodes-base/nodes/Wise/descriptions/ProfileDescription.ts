import {
	INodeProperties,
} from 'n8n-workflow';

export const profileOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'profile',
				],
			},
		},
	},
] as INodeProperties[];

export const profileFields = [
	// ----------------------------------
	//         profile: get
	// ----------------------------------
	{
		displayName: 'Profile ID',
		name: 'profileId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getProfiles',
		},
		description: 'ID of the user profile to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'profile',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];
