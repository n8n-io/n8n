import {
	INodeProperties,
} from 'n8n-workflow';

export const leadOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
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
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Unsubscribe',
				value: 'unsubscribe',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
			},
		},
	},
] as INodeProperties[];

export const leadFields = [
	// ----------------------------------
	//        lead: get
	// ----------------------------------

] as INodeProperties[];
