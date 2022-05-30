import {
	INodeProperties,
} from 'n8n-workflow';


export const messageFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'mediaOperation',
		type: 'options',
		placeholder: '',
		options: [
			{
				name: 'Upload media',
				value: 'mediaUpload',
			},
			{
				name: 'Get media URL. All media URLs expire after 5 minutes.',
				value: 'mediaUrlGet',
			},
			{
				name: 'Delete media',
				value: 'mediaDelete',
			},
			{
				name: 'Download media from URL',
				value: 'mediaDownload',
			}
		],
		default: 'mediaUpload',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-weak
		description: 'The operation to perform on the media',
	},
];

export const messageTypeFields: INodeProperties[] = [
	// ----------------------------------
	//         operation: mediaUpload
	// ----------------------------------
	{
		displayName: 'Phone number ID',
		name: 'phoneNumberId',
		type: 'string',
		default: '',
		placeholder: '',
    displayOptions: {
      show: {
        mediaOperation: [
          'mediaUpload',
        ]
      }
    },
		required: true,
		description: 'The ID of the business account\'s phone number to store the media',
	},
  {
    displayName: 'File path',
    name: 'mediaFilePath',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        mediaOperation: [
          'mediaUpload',
        ]
      }
    },
    required: true,
    description: 'The path to the media file stored in your local directory',
  },
	// ----------------------------------
	//         type: mediaUrlGet
	//         type: mediaDelete
	// ----------------------------------
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'string',
		default: '',
		displayOptions: {
      show: {
        mediaOperation: [
          "mediaUrlGet",
          'mediaDelete'
        ],
			},
		},
    required: true,
    description: 'The ID of the media',
	},
	// ----------------------------------
	//         type: mediaDownload
	// ----------------------------------
	{
		displayName: 'Media URL',
		name: 'mediaUrl',
		default: '',
		type: 'string',
		displayOptions: {
			show: {
				mediaOperation: [
					'mediaDownload',
				],
			},
		},
		required: true,
		description: 'URL of the media to be downloaded',
	},
];
