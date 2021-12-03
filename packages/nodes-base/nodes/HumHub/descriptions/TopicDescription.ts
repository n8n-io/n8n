import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters
} from '../GenericFunctions';

export const topicOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'topic',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all topics',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get topic by id',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update existing topic',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete topic by id',
			},
			{
				name: 'Get All By Container',
				value: 'getAllByContainer',
				description: 'Get all topics by container',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create new topic',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const topicFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 topic:getAll                        		  */
	/* -------------------------------------------------------------------------- */

	...getPagingParameters('topic'),

	/* -------------------------------------------------------------------------- */
	/*                                 topic:get                              	  */
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
					'topic',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The ID of the topic.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 topic:update                               */
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
					'topic',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The ID of the topic.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'topic',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The topic name.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 topic:delete                               */
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
					'topic',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The ID of the topic.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 topic:getAllByContainer                    */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Container ID',
		name: 'containerId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'topic',
				],
				operation: [
					'getAllByContainer',
				],
			},
		},
		default: '',
		description: 'The ID of the container.',
	},
	...getPagingParameters('topic', 'getAllByContainer'),

	/* -------------------------------------------------------------------------- */
	/*                                 topic:create                               */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Container ID',
		name: 'containerId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'topic',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The ID of the container.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'topic',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The topic name.',
	},

] as INodeProperties[];
