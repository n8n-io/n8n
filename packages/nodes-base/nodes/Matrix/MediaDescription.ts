import { INodeProperties } from 'n8n-workflow';

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
				name: 'Create',
				value: 'upload',
				description: 'Upload media',
			},
		],
		default: 'upload',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const mediaFields = [

/* -------------------------------------------------------------------------- */
/*                               media upload                                 */
/* -------------------------------------------------------------------------- */
    
    
    {
        displayName: 'Binary Data',
        name: 'binaryData',
        type: 'boolean',
        default: false,
        displayOptions: {
            show: {
                operation: [
                    'upload'
                ],
                resource: [
                    'media',
                ],
            },
        },
        description: 'If the data to upload should be taken from binary field.',
    },
    {
        displayName: 'File Content',
        name: 'fileContent',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: [
                    'media',
                ],
                operation: [
                    'upload'
                ],
                binaryData: [
                    false
                ],
            },

        },
        placeholder: '',
        description: 'The text content of the file to upload.',
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
                    'upload'
                ],
                binaryData: [
                    true
                ],
            },

        },
	},
	{
		displayName: 'Room ID',
		name: 'roomId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'media',
				],
				operation: [
					'upload',
				]
			},
		},
		description: 'Room ID to post ',
		required: true,
	},
	{
		displayName: 'Media type',
		name: 'mediaType',
		type: 'options',
		default: 'image',
		displayOptions: {
			show: {
				resource: [
					'media',
				],
				operation: [
					'upload',
				]
			},
        },
        options: [
			{
				name: 'File',
				value: 'file',
				description: 'General file',
			},
			{
				name: 'Image',
				value: 'image',
				description: 'Image media type',
			},
		],
        description: 'Name of the uploaded file',
        placeholder: 'mxc://matrix.org/uploaded-media-uri',
		required: true,
	},
	{
		displayName: 'File name',
		name: 'filename',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'media',
				],
				operation: [
					'upload',
				],
				binaryData: [
                    false
                ],
			},
        },
        description: 'File name to be displayed',
        placeholder: 'some-file-name.txt',
		required: true,
	},


] as INodeProperties[];
