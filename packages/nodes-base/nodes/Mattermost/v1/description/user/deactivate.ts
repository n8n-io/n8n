import {
	UserProperties,
} from '../../actions/Interfaces';

const userDeactiveDescription: UserProperties = [
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'deactive',
				],
			},
		},
		default: '',
		description: 'User GUID',
	},
];

export { userDeactiveDescription };
