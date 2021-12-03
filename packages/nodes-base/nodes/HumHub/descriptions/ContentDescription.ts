import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters
} from '../GenericFunctions';

export const contentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'content',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all content by container',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get content by id',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Deletes a content by id',
			},
			{
				name: 'Get All Containers',
				value: 'getAllContainers',
				description: 'Find all containers',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  contentFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 content:getAll                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            minValue: 0,
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'content',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'The id of the content container',
	},
	...getPagingParameters('content'),

	/* -------------------------------------------------------------------------- */
	/*                                 content:get                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            minValue: 0,
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'content',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The id of the content',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 content:delete                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            minValue: 0,
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'content',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The id of the content',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 container:getAllContainers                              */
	/* -------------------------------------------------------------------------- */

	...getPagingParameters('content', 'getAllContainers'),

] as INodeProperties[];
