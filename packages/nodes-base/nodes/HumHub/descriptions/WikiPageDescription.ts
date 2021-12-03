import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters
} from '../GenericFunctions';

export const wikiPageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'wikiPage',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all wiki pages',
			},
			{
				name: 'Get All By Container',
				value: 'getAllByContainer',
				description: 'Find all wiki pages by container',
			},
			{
				name: 'Delete By Container',
				value: 'deleteByContainer',
				description: 'Delete a wiki page by container',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new wiki page',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get wiki page by id',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update wiki page by id',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a wiki page by id',
			},
            {
				name: 'Change Index',
				value: 'changeIndex',
				description: 'Change page index',
			},
            {
				name: 'Move',
				value: 'move',
				description: 'Move page to another space',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  wikiPageFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 wikiPage:getAll                            */
	/* -------------------------------------------------------------------------- */

    ...getPagingParameters('wikiPage'),

	/* -------------------------------------------------------------------------- */
	/*                                 wikiPage:getAllByContainer                 */
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
					'wikiPage',
				],
				operation: [
					'getAllByContainer',
				],
			},
		},
		default: '',
		description: 'ID of content container.',
	},
    ...getPagingParameters('wikiPage', 'getAllByContainer'),

	/* -------------------------------------------------------------------------- */
	/*                                 wikiPage:deleteByContainer                 */
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
					'wikiPage',
				],
				operation: [
					'deleteByContainer',
				],
			},
		},
		default: '',
		description: 'The id of content container.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 wikiPage:create                            */
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
					'wikiPage',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The id of content container.',
	},
    {
		displayName: 'Wiki Page Title',
		name: 'wikiPageTitle',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'wikiPage',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The title of the wiki page.',
	},
	{
		displayName: 'Wiki Page Additional Fields',
		name: 'wikiPageAdditionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'wikiPage',
				],
				operation: [
					'create',
				],
			},
		},
		default: [],
		description: '',
		options: [
			{
				displayName: 'Is Home',
				name: 'is_home',
				type: 'boolean',
				default: false,
				description: 'If to override the wiki index start page.',
			},
			{
				displayName: 'Admin Only',
				name: 'admin_only',
				type: 'boolean',
				default: false,
				description: 'If the admin can edit.',
			},
			{
				displayName: 'Is Category',
				name: 'is_category',
				type: 'boolean',
				default: false,
				description: '',
			},
			{
				displayName: 'Parent Page ID',
				name: 'parent_page_id',
				type: 'number',
				default: '',
				description: 'The ID of the parent page.',
			},
		],
	},
	{
		displayName: 'Revision Content',
		name: 'revisionContent',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'wikiPage',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The wiki page revision content.',
	},
	{
		displayName: 'Page Edit Form',
		name: 'pageEditForm',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'wikiPage',
				],
				operation: [
					'create',
				],
			},
		},
		default: [],
		description: '',
		options: [
			{
				displayName: 'Is Public',
				name: 'is_public',
				type: 'boolean',
				default: true,
				description: 'If the non space members have read access.',
			},
			{
				displayName: 'Topics',
				name: 'topicsStr',
				type: 'string',
				default: '',
				description: 'Comma separated list of integers. Example: 1,2',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 wikiPage:get	                        	  */
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
					'wikiPage',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The ID of the wiki page.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 wikiPage:update                            */
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
					'wikiPage',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The ID of content container.',
	},
	{
		displayName: 'Wiki Page',
		name: 'wikiPage',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'wikiPage',
				],
				operation: [
					'update',
				],
			},
		},
		default: [],
		description: '',
		options: [
			{
				displayName: 'Wiki Page Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The title of the wiki page.',
			},
			{
				displayName: 'Is Home',
				name: 'is_home',
				type: 'boolean',
				default: false,
				description: 'If to override the wiki index start page.',
			},
			{
				displayName: 'Admin Only',
				name: 'admin_only',
				type: 'boolean',
				default: false,
				description: 'If only admin can edit.',
			},
			{
				displayName: 'Is Category',
				name: 'is_category',
				type: 'boolean',
				default: false,
				description: '',
			},
			{
				displayName: 'Parent Page ID',
				name: 'parent_page_id',
				type: 'number',
				default: '',
				description: 'The ID of the parent page.',
			},
		],
	},
	{
		displayName: 'Wiki Page Revision',
		name: 'wikiPageRevision',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'wikiPage',
				],
				operation: [
					'update',
				],
			},
		},
		default: [],
		description: '',
		options: [
			{
				displayName: 'Revision Content',
				name: 'revisionContent',
				type: 'string',
				default: '',
				description: 'Wiki page revision content.',
			},
		],
	},
	{
		displayName: 'Page Edit Form',
		name: 'pageEditForm',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'wikiPage',
				],
				operation: [
					'update',
				],
			},
		},
		default: [],
		description: '',
		options: [
			{
				displayName: 'Is Public',
				name: 'is_public',
				type: 'boolean',
				default: true,
				description: 'If the non space members have read access.',
			},
			{
				displayName: 'Topics',
				name: 'topicsStr',
				type: 'string',
				default: '',
				description: 'Comma separated list of integers. Example: 1,2',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 wikiPage:delete                            */
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
					'wikiPage',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The id of the wiki page.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 wikiPage:changeIndex		                  */
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
					'wikiPage',
				],
				operation: [
					'changeIndex',
				],
			},
		},
		default: '',
		description: 'The id of the wiki page.',
	},
	{
		displayName: 'Target ID',
		name: 'target_id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'wikiPage',
				],
				operation: [
					'changeIndex',
				],
			},
		},
		default: '',
		description: 'Wiki page target id. NOTE (2021.12.03): humhub returns 400 not found.',
	}, // todo: humhub returns error
	{
		displayName: 'Index',
		name: 'index',
		type: 'number',
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'wikiPage',
				],
				operation: [
					'changeIndex',
				],
			},
		},
		default: '',
		description: 'Index for the order. Default: 0',
	}, // todo: humhub returns error

	/* -------------------------------------------------------------------------- */
	/*                                 wikiPage:move		                      */
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
					'wikiPage',
				],
				operation: [
					'move',
				],
			},
		},
		default: '',
		description: 'The id of the wiki page.',
	},
	{
		displayName: 'Target',
		name: 'target',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'wikiPage',
				],
				operation: [
					'move',
				],
			},
		},
		default: '',
		description: 'Guid of target space container. NOTE (2021.12.03): humhub returns 500 server error.',
	}, // todo: humhub returns error

] as INodeProperties[];
