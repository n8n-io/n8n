import {
	INodeProperties,
} from 'n8n-workflow';

export const mediaOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
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
				description: 'Downloads media.',
			},
		],
		default: 'download',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  mediaFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 media:download                              */
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
		description: 'Name of the media that is being downloaded.',
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
		description: 'Name of the binary property to which to write the data of the read file.',
	},

] as INodeProperties[];
