import {
	INodeProperties,
} from 'n8n-workflow';

export const regionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['region'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		default: 'getAll',
	},
];

export const regionFields: INodeProperties[] = [

	/*-------------------------------------------------------------------------- */
	/*                          	 region:add	 	                    	 	 */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Parent ID',
		name: 'parentId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: ['region'],
				operation: ['add'],
			},
		},
		default: '',
		description: 'The ID of the parent site',
	},
	{
		displayName: 'Name',
		name: 'name',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: ['region'],
				operation: ['add'],
			},
		},
		default: '',
		description: 'The site name',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['region'],
				operation: ['add'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The site description',
			},
		],
	},

	/*-------------------------------------------------------------------------- */
	/*                 				 region:getAll			        			 */
	/* ------------------------------------------------------------------------- */

	// No params

];