import {
	INodeProperties,
} from 'n8n-workflow';

export const attendeeOperations = [
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
			{
				name: 'Get Details',
				value: 'getDetails',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'attendee',
				],
			},
		},
	},
] as INodeProperties[];

export const attendeeFields = [
	// ----------------------------------
	//         attendee: create
	// ----------------------------------

] as INodeProperties[];
