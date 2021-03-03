import {
	INodeProperties,
} from 'n8n-workflow';

export const activityOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'getAll',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
			},
		},
	},
] as INodeProperties[];

export const activityFields = [
	// ----------------------------------
	//        activity: getAll
	// ----------------------------------

] as INodeProperties[];
