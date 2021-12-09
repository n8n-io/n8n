import {
	INodeProperties,
} from 'n8n-workflow';

export const attachmentOptions = [
	{
		displayName: 'Attachment Options',
		name: 'attachmentOptions',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'File Size',
				name: 'version',
				type: 'options',
				default:'download_url',
				description:'Attachment size to retrieve, if multiple versions are available',
				options: [
					{name: 'Original', value: 'download_url'},
					{name: 'Small',    value: 'download_small_url'},
					{name: 'Medium',   value: 'download_medium_url'},
					{name: 'Large',    value: 'download_large_url'},
				],
			},
			{
				displayName: 'Name downloaded files from',
				name: 'filename',
				type: 'options',
				default:'related_question',
				description:'The strategy to name the downloaded files',
				options: [
					{name: 'Related Form Question',        value: 'related_question'},
					{name: 'Original Server File Name',    value: 'filename'},
				],
			},
		],
	},
] as INodeProperties[];
