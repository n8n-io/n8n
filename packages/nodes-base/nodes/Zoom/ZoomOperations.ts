import {
	INodeProperties,
} from 'n8n-workflow';

export const meetingOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'meeting',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a meeting',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a meeting',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a meeting',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all meetings',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a meeting',
			}
		],
		default: 'create',
		description: 'The operation to perform.',
	}
] as INodeProperties[];

export const meetingFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 meeting:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User Id',
		name: 'userId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'meeting',
				],
			},
		},
		description: 'User ID.',
	},
] as INodeProperties[];
