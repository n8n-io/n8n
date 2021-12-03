import {
	INodeProperties,
} from 'n8n-workflow';

export const commentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get comment by id',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Deletes a comment by id',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  commentFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 comment:get                              */
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
					'comment',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The ID of the comment.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 comment:delete                              */
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
					'comment',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The ID of comment.',
	},

] as INodeProperties[];
