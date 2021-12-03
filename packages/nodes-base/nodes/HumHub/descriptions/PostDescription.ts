import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters
} from '../GenericFunctions';

export const postOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
			},
		},
		options: [
			{
				name: 'Get All By Container',
				value: 'getAllByContainer',
				description: 'Find all posts by container',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Creates a new post',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all posts',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get post by id',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Updates a post by id',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Deletes a post by id',
			},
		],
		default: 'getAllByContainer',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  postFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 post:getAllByContainer                       */
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
					'post',
				],
				operation: [
					'getAllByContainer',
				],
			},
		},
		default: '',
		description: 'ID of content container',
	},
	{
		displayName: 'Topics',
		name: 'topics',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'getAllByContainer',
				],
			},
		},
		default: '',
		description: 'Comma separated list of topics to filter. Example: Music,Dancing',
	},
	...getPagingParameters('post', 'getAllByContainer'),

	/* -------------------------------------------------------------------------- */
	/*                                 post:create                         		     */
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
					'post',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'ID of content container to post to.',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The text of the post.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:getAll                            	  */
	/* -------------------------------------------------------------------------- */

	...getPagingParameters('post'),

	/* -------------------------------------------------------------------------- */
	/*                                 post:get                             		 */
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
					'post',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The ID of the post.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:update                     		         */
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
					'post',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The ID of the post.',
	},
    {
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The text of the post.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:delete                          	    */
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
					'post',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The ID of the post.',
	},

] as INodeProperties[];
