import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters
} from '../GenericFunctions';

export const likeOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'like',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get like by id',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Deletes a like by id',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all likes by content id',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  likeFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 like:get                              */
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
					'like',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The ID of the like.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 like:delete                              */
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
					'like',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The ID of the like.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 like:getAll                              */
	/* -------------------------------------------------------------------------- */

    {
		displayName: 'Model',
		name: 'model',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'like',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'The model record class. Example: humhub\\\\modules\\\\post\\\\models\\\\Post',
	},
    {
		displayName: 'Primary Key',
		name: 'pk',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'like',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'The primary key of the record.',
	},
	...getPagingParameters('like'),

] as INodeProperties[];
