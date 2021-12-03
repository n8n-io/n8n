import {
	INodeProperties,
} from 'n8n-workflow';

export const fileOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'file',
				],
			},
		},
		options: [
			{
				name: 'Download',
				value: 'download',
				description: 'Downloads a file by id',
			},
		],
		default: 'download',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  fileFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 file:download                              */
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
					'file',
				],
				operation: [
					'download',
				],
			},
		},
		default: '',
		description: 'The ID of the file to download.',
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
					'file',
				],
				operation: [
					'download',
				],
			},
		},
		description: 'Name of the binary property to which to write the data of the read file.',
	},

] as INodeProperties[];
