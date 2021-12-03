import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters,
} from '../GenericFunctions';

export const groupOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find All Groups',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Add a new group',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get group by id',
			},
			{
				name: 'Get All Members',
				value: 'getAllMembers',
				description: 'List members',
			},
			{
				name: 'Add Member',
				value: 'addMember',
				description: 'Add a new member',
			},
			{
				name: 'Delete Member',
				value: 'deleteMember',
				description: 'Remove a member',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  groupFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 group:getAll                               */
	/* -------------------------------------------------------------------------- */

	...getPagingParameters('group', 'getAll'),

	/* -------------------------------------------------------------------------- */
	/*                                 group:create			                      */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Name of the group.',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Description of the group.',
	},
	{
		displayName: 'Show At Directory',
		name: 'show_at_directory',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'create',
				],
			},
		},
		default: false,
		description: 'Show the group in the directory.',
	},
	{
		displayName: 'Show At Registration',
		name: 'show_at_registration',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'create',
				],
			},
		},
		default: false,
		description: 'Make the group selectable at registration.',
	},
	{
		displayName: 'Sort Order',
		name: 'sort_order',
		type: 'number',
		typeOptions: {
			numberStepSize: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Values between 0 and 10000, the existing elements usually use steps of 100.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 group:get		                          */
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
					'group',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The ID of the group.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 group:getAllMembers                        */
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
					'group',
				],
				operation: [
					'getAllMembers',
				],
			},
		},
		default: '',
		description: 'The ID of the group they belong to.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 group:addMember                            */
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
					'group',
				],
				operation: [
					'addMember',
				],
			},
		},
		default: '',
		description: 'The ID of the group that the member belongs to.',
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
					'group',
				],
				operation: [
					'addMember',
				],
			},
		},
		default: '',
		description: 'The ID of the user who will be added.',
	},
	{
		displayName: 'Is Manager',
		name: 'isManager',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'addMember',
				],
			},
		},
		default: false,
		description: 'If the user is manager.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 group:deleteMember                         */
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
					'group',
				],
				operation: [
					'deleteMember',
				],
			},
		},
		default: '',
		description: 'The ID of the group that the member belongs to.',
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
					'group',
				],
				operation: [
					'deleteMember',
				],
			},
		},
		default: '',
		description: 'The ID of the user who will be deleted.',
	},

] as INodeProperties[];
