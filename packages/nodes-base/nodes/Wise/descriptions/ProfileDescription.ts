import {
	INodeProperties,
} from 'n8n-workflow';

export const profileOperations: INodeProperties[] = [
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
];

export const profileFields: INodeProperties[] = [
	// ----------------------------------
	//         profile: get
	// ----------------------------------
	{
		displayName: 'Profile ID',
		name: 'profileId',
		type: 'options',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-options
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
];
