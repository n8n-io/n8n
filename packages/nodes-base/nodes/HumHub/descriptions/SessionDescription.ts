import {
	INodeProperties,
} from 'n8n-workflow';

export const sessionOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'session',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Deletes all sessions for a particular user.',
			},
		],
		default: 'delete',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  sessionFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 session:delete                              */
	/* -------------------------------------------------------------------------- */

    {
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'session',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The id of the user.',
	},

] as INodeProperties[];
