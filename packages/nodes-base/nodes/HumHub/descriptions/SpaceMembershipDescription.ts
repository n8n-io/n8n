import {
	INodeProperties,
} from 'n8n-workflow';

import {
    getPagingParameters
} from '../GenericFunctions';

export const spaceMembershipOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'spaceMembership',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'List all memberships by given space id',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Add a new user to the space',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a space membership of a user',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Set the user membership role',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const spaceMembershipFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 spaceMembership:getAll              		  */
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
					'spaceMembership',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'The ID of the space.',
	},
	...getPagingParameters('spaceMembership'),

	/* -------------------------------------------------------------------------- */
	/*                                 spaceMembership:create                     */
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
					'spaceMembership',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The ID of the space.',
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'spaceMembership',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The ID of the user.',
	},
	{
		displayName: 'Silent',
		name: 'silent',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'spaceMembership',
				],
				operation: [
					'create',
				],
			},
		},
		default: false,
		description: 'Send added notification to the user.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 spaceMembership:delete            	      */
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
					'spaceMembership',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The ID of the space.',
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'spaceMembership',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The ID of the user.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 spaceMembership:update                     */
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
					'spaceMembership',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The ID of the space.',
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'spaceMembership',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The ID of the user.',
	},
	{
		displayName: 'Role',
		name: 'role',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'spaceMembership',
				],
				operation: [
					'update',
				],
			},
		},
		default: 'member',
		description: '',
		options: [
			{
				name: 'Member',
				value: 'member',
			},
			{
				name: 'Moderator',
				value: 'moderator',
			},
			{
				name: 'Admin',
				value: 'admin',
			},
		],
	},

] as INodeProperties[];
