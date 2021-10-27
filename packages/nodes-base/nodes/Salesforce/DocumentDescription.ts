import {
	INodeProperties,
} from 'n8n-workflow';

export const documentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
			},
		},
		options: [
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a document',
			},
		],
		default: 'upload',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const documentFields = [

	/* -------------------------------------------------------------------------- */
	/*                                document:upload                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'upload',
				],
			},
		},
		description: 'Name of the file',
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
					'document',
				],
				operation: [
					'upload',
				],
			},
		},
		placeholder: '',
		description: 'Name of the binary property which contains the data for the file to be uploaded.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'upload',
				],
			},
		},
		options: [
			{
				displayName: 'File Extension',
				name: 'fileExtension',
				type: 'string',
				default: '',
				placeholder: 'pdf',
				description: 'File extension to use. If none is set, the value from the binary data will be used.',
			},
			{
				displayName: 'Link To Object ID',
				name: 'linkToObjectId',
				type: 'string',
				default: '',
				description: 'ID of the object you want to link this document to',
			},
			{
				displayName: 'Owner ID',
				name: 'ownerId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'ID of the owner of this document',
			},
		],
	},
] as INodeProperties[];
