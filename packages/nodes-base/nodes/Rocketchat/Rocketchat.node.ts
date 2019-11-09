import {
	IExecuteSingleFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	rocketchatApiRequest
} from './GenericFunctions';


export class Rocketchat implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'Rocketchat',
		name: 'Rocketchat',
		icon: 'file:rocketchat.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Consume Rocketchat API',
		defaults: {
			name: 'Rocketchat',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'rocketchatApi',
				required: true,
			}
        ],
		properties: [
                {
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Chat',
						value: 'chat',
					},
				],
				default: '',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'chat',
						],
					},
				},
				options: [
					{
						name: 'Post Message',
						value: 'postMessage',
						description: 'Post a message to a channel or a direct message',
					},
				],
				default: '',
				description: 'The operation to perform.',
            },
            {
				displayName: 'Alias',
				name: 'alias',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'chat',
                        ],
                        operation: [
                            'postMessage'
                        ]
					},
				},
				default: '',
				description: 'This will cause the message’s name to appear as the given alias, but your username will still display.',
            },
            {
				displayName: 'Avatar',
				name: 'avatar',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'chat',
                        ],
                        operation: [
                            'postMessage'
                        ]
					},
				},
				default: '',
				description: 'If provided, this will make the avatar use the provided image url.',
            },
            {
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
                        resource: [
							'chat',
                        ],
						operation: [
							'postMessage',
                        ],
					},
				},
				options: [
                    {
                        displayName: 'Emoji',
                        name: 'emoji',
                        type: 'string',
                        default: '',
                        description: 'This will cause the message’s name to appear as the given alias, but your username will still display.',
                    }
                ]
            },
            {
				displayName: 'Attachments',
				name: 'attachments',
				type: 'collection',
                default: {},
                placeholder: 'Add Attachment Item',
                typeOptions: {
                    multipleValues: true,
                    multipleValueButtonText: 'Add Attachment',

				},
				displayOptions: {
					show: {
                        resource: [
                            'chat',
                        ],
						operation: [
							'postMessage',
                        ],
					},
				},
				options: [
                    {
                        displayName: 'Color',
                        name: 'color',
                        type: 'string',
                        default: '',
                        description: 'The color you want the order on the left side to be, any value background-css supports.',
                    },
                    {
                        displayName: 'Text',
                        name: 'text',
                        type: 'string',
                        default: '',
                        description: 'The text to display for this attachment, it is different than the message’s text.',
                    },
                    {
                        displayName: 'Timestamp',
                        name: 'timestamp',
                        type: 'dateTime',
                        default: '',
                        description: 'Displays the time next to the text portion.',
                    },
                    {
                        displayName: 'Thumb URL',
                        name: 'thumbUrl',
                        type: 'string',
                        default: '',
                        description: 'An image that displays to the left of the text, looks better when this is relatively small.',
                    },
                    {
                        displayName: 'Message Link',
                        name: 'messageLink',
                        type: 'string',
                        default: '',
                        description: 'Only applicable if the timestamp is provided, as it makes the time clickable to this link.',
                    },
                    {
                        displayName: 'Collapsed',
                        name: 'collapsed',
                        type: 'boolean',
                        default: false,
                        description: 'Causes the image, audio, and video sections to be hiding when collapsed is true.',
                    },
                    {
                        displayName: 'Author Name',
                        name: 'authorName',
                        type: 'string',
                        default: '',
                        description: 'Name of the author.',
                    },
                    {
                        displayName: 'Author Link',
                        name: 'authorLink',
                        type: 'string',
                        default: '',
                        description: 'Providing this makes the author name clickable and points to this link.',
                    },
                    {
                        displayName: 'Author Icon',
                        name: 'authorIcon',
                        type: 'string',
                        default: '',
                        placeholder: 'https://site.com/img.png',
                        description: 'Displays a tiny icon to the left of the Author’s name.',
                    },
                    {
                        displayName: 'Title',
                        name: 'title',
                        type: 'string',
                        default: '',
                        description: 'Title to display for this attachment, displays under the author.',
                    },
                    {
                        displayName: 'Title Link',
                        name: 'titleLink',
                        type: 'string',
                        default: '',
                        description: 'Providing this makes the title clickable, pointing to this link.',
                    },
                    {
                        displayName: 'Title Link Download',
                        name: 'titleLinkDownload',
                        type: 'boolean',
                        default: false,
                        description: 'When this is true, a download icon appears and clicking this saves the link to file.',
                    },
                    {
                        displayName: 'Image URL',
                        name: 'imageUrl',
                        type: 'string',
                        default: '',
                        description: 'The image to display, will be “big” and easy to see.',
                    },
                    {
                        displayName: 'Audio URL',
                        name: 'AudioUrl',
                        type: 'string',
                        default: '',
                        placeholder: 'https://site.com/aud.mp3',
                        description: 'Audio file to play, only supports what html audio does.',
                    },
                    {
                        displayName: 'video URL',
                        name: 'videoUrl',
                        type: 'string',
                        default: '',
                        placeholder: 'https://site.com/vid.mp4',
                        description: 'Video file to play, only supports what html video does.',
                    },
                    {
                        displayName: 'Fields',
                        name: 'fields',
                        type: 'fixedCollection',
                        placeholder: 'Add Field Item',
                        typeOptions: {
                            multipleValues: true,
                        },
                        default: '',
                        options: [
                            {
                                name: 'fieldsValues',
                                displayName: 'Fields',
                                values: [
                                    {
                                        displayName: 'Short',
                                        name: 'short',
                                        type: 'boolean',
                                        default: false,
                                        description: 'Whether this field should be a short field.'
                                    },
                                    {
                                        displayName: 'Title',
                                        name: 'title',
                                        type: 'string',
                                        default: '',
                                        description: 'The title of this field.'
                                    },
                                    {
                                        displayName: 'Value',
                                        name: 'value',
                                        type: 'string',
                                        default: '',
                                        description: 'The value of this field, displayed underneath the title value.'
                                    },
                                ],
                            },
                        ],
                    },
                ]
            }
        ]
	};

	methods = {
	
    };

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
        return {
            json: {}
        };
    }
}
