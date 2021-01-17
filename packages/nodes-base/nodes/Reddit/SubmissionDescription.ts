import {
	INodeProperties,
} from 'n8n-workflow';

export const submissionOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'post',
		description: 'Operation to perform',
		options: [
			{
				name: 'Post',
				value: 'post',
				description: 'Post a submission to a subreddit',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
			},
		},
	},
] as INodeProperties[];

export const submissionFields = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Title of the submission, up to 300 characters long',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'post',
				],
			},
		},
	},
	{
		displayName: 'Subreddit',
		name: 'subreddit',
		type: 'string',
		required: true,
		default: '',
		description: 'Subreddit to post the submission to',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'post',
				],
			},
		},
	},
	{
		displayName: 'Kind',
		name: 'kind',
		type: 'options',
		options: [
			{
				name: 'Text Post',
				value: 'self',
			},
			{
				name: 'Link Post',
				value: 'link',
			},
			{
				name: 'Image Post',
				value: 'image',
			},
			{
				name: 'Video Post',
				value: 'video',
			},
			{
				name: 'Video GIF Post',
				value: 'videogif',
			},
		],
		default: 'text',
		description: 'The kind of the submission to be posted',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'post',
				],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		description: 'URL of the content of the submission',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'post',
				],
				kind: [
					'link',
					'image',
					'video',
					'videogif',
				],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		description: 'Text content of the submission (Markdown supported)',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'post',
				],
				kind: [
					'self',
				],
			},
		},
	},
	{
		displayName: 'Resubmit',
		name: 'resubmit',
		type: 'boolean',
		default: false,
		description: 'If toggled on, the URL will be submitted even if<br>it was already submitted to the subreddit before.<br>Otherwise, a resubmission will trigger an error.',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'post',
				],
				kind: [
					'link',
					'image',
					'video',
					'videogif',
				],
			},
		},
	},
] as INodeProperties[];
