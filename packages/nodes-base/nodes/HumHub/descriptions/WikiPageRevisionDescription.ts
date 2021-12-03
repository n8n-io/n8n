import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters
} from '../GenericFunctions';

export const wikiPageRevisionOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'wikiPageRevision',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all revisions for page',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get revision by id',
			},
			{
				name: 'Revert',
				value: 'revert',
				description: 'Revert page by revision id',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  wikiPageRevisionFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 wikiPageRevision:getAll                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'wikiPageRevision',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'ID of the wiki page.',
	},
    ...getPagingParameters('wikiPageRevision'),

	/* -------------------------------------------------------------------------- */
	/*                                 wikiPageRevision:get                              */
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
					'wikiPageRevision',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The id of the revision.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 wikiPageRevision:revert                              */
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
					'wikiPageRevision',
				],
				operation: [
					'revert',
				],
			},
		},
		default: '',
		description: 'The id of the revision.',
	},

] as INodeProperties[];
