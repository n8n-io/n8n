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
			{
				name: 'Post',
				value: 'post',
				description: 'Post an uploaded media to a channel',
			},
		],
		default: 'upload',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const mediaFields = [

/* -------------------------------------------------------------------------- */
/*                              meedia create                                 */
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
                operation: [
                    'upload'
                ],
                resource: [
                    'media',
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
                operation: [
                    'upload'
                ],
                resource: [
                    'media',
                ],
                binaryData: [
                    true
                ],
            },

        },
    },

/* ----------------------------------------------------------------------- */
/*                                meedia post                              */
/* ----------------------------------------------------------------------- */
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
					'post',
				]
			},
		},
		description: 'Room ID to post ',
		required: true,
	},
	{
		displayName: 'Media URL',
		name: 'mediaUrl',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'media',
				],
				operation: [
					'post',
				]
			},
		},
        description: '',
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
					'post',
				]
			},
		},
        description: 'Name of the uploaded file',
        placeholder: 'mxc://matrix.org/uploaded-media-uri',
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
					'post',
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


] as INodeProperties[];
