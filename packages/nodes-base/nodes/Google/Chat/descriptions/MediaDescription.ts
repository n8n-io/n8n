import {
	INodeProperties,
} from 'n8n-workflow';

export const mediaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'media',
				],
			},
		},
		options: [
			{
				name: 'Download',
				value: 'download',
				description: 'Download media',
			},
		],
		default: 'download',
	},
];

export const  mediaFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 media:download                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Resource Name',
		name: 'resourceName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'media',
				],
				operation: [
					'download',
				],
			},
		},
		default: '',
		description: 'Name of the media that is being downloaded',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'media',
				],
				operation: [
					'download',
				],
			},
		},
		description: 'Name of the binary property to which to write the data of the read file',
	},
];
