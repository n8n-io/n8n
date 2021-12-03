import {
	INodeProperties,
} from 'n8n-workflow';

import {
    getPagingParameters
} from '../GenericFunctions';

export const spaceOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'space',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all spaces',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create new space',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get space by id',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update existing space',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete space by id',
			},
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive the space by id',
			},
			{
				name: 'Unarchive',
				value: 'unarchive',
				description: 'Archive the space by id',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const spaceFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 space:getAll              			  */
	/* -------------------------------------------------------------------------- */

	...getPagingParameters('space'),

	/* -------------------------------------------------------------------------- */
	/*                                 space:create                           */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'space',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Name of the space.',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'space',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Description of the space.',
	},
	{
		displayName: 'Is Visible',
		name: 'visibility',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'space',
				],
				operation: [
					'create',
				],
			},
		},
		default: true,
		description: 'If the space is public (members only) or private (invisible).',
	},
	{
		displayName: 'Join Policy',
		name: 'join_policy',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'space',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				name: '1 - only by invite',
				value: 1,
			},
			{
				name: '2 - invite and request',
				value: 2,
			},
			{
				name: '3 - everyone can enter',
				value: 3,
			},
		],
		default: 1,
		description: 'Join policy of the space.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 space:get                                  */
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
					'space',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The ID of the space.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 space:update                               */
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
					'space',
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
		displayName: 'Json Parameter Space',
		name: 'jsonParameterSpace',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'space',
				],
				operation: [
					'update',
				],
			},
		},
		default: false,
		description: 'If space fields should be passed as JSON.',
	},
	{
		displayName: 'See <a href="https://www.humhub.com/en/marketplace/rest/docs/html/space.html#tag/Space/paths/~1space~1{id}/put" target="_blank">HumHub guide</a> to updating a space',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'space',
				],
				operation: [
					'update',
				],
				jsonParameterSpace: [
					true,
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Space (JSON)',
		name: 'spaceJson',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'space',
				],
				operation: [
					'update',
				],
				jsonParameterSpace: [
					true,
				],
			},
		},
		default: '',
		description: 'The space fields as JSON or JSON string.',
	},
	{
		displayName: 'Space',
		name: 'spaceUi',
		type: 'collection',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'space',
				],
				operation: [
					'update',
				],
				jsonParameterSpace: [
					false,
				],
			},
		},
		default: [],
		description: '',
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the space.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the space.',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Tags of the space.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'string',
				default: '',
				description: 'Color of the space.',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'URL of the space.',
			},
			{
				displayName: 'Index URL',
				name: 'indexUrl',
				type: 'string',
				default: '',
				description: 'Index URL of the space.',
			},
			{
				displayName: 'Index Guest URL',
				name: 'indexGuestUrl',
				type: 'string',
				default: '',
				description: 'Index guest URL of the space.',
			},
			{
				displayName: 'Is Visible',
				name: 'visibility',
				type: 'boolean',
				default: true,
				description: 'If the space is public (members only) or private (invisible).',
			},
			{
				displayName: 'Join Policy',
				name: 'join_policy',
				type: 'options',
				options: [
					{
						name: '1 - only by invite',
						value: 1,
					},
					{
						name: '2 - invite and request',
						value: 2,
					},
					{
						name: '3 - everyone can enter',
						value: 3,
					},
				],
				default: 1,
				description: 'Join policy of the space.',
			},
			{
				displayName: 'Default Content Visibility',
				name: 'default_content_visibility',
				type: 'boolean',
				default: true,
				description: 'If the space content is visible by default.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 space:delete                               */
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
					'space',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The ID of the space.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 space:archive                              */
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
					'space',
				],
				operation: [
					'archive',
				],
			},
		},
		default: '',
		description: 'The ID of the space.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 space:unarchive                            */
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
					'space',
				],
				operation: [
					'unarchive',
				],
			},
		},
		default: '',
		description: 'The ID of the space.',
	},

] as INodeProperties[];
