import {
	INodeProperties,
} from 'n8n-workflow';

export const webinarOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'get',
				value: 'Get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
			},
		},
	},
] as INodeProperties[];

export const webinarFields = [
	// ----------------------------------
	//         webinar: create
	// ----------------------------------

] as INodeProperties[];
