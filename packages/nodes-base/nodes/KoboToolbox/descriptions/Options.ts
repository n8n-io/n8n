import {
	INodeProperties,
} from 'n8n-workflow';

export const options = {
	displayName: 'Options',
	placeholder: 'Add Option',
	name: 'formatOptions',
	type: 'collection',
	default: {},
	options: [
		{
			displayName: 'Reformat?',
			name: 'reformat',
			type: 'boolean',
			default: false,
			description:'Apply some reformatting to the submission data, such as parsing GeoJSON coordinates',
		},
		{
			displayName: 'Multiselect Mask',
			name: 'selectMask',
			type: 'string',
			default:'select_*',
			description:'Comma-separated list of wildcard-style selectors for fields that should be treated as multiselect fields, i.e. parsed as arrays',
		},
		{
			displayName: 'Number Mask',
			name: 'numberMask',
			type: 'string',
			default:'n_*, f_*',
			description:'Comma-separated list of wildcard-style selectors for fields that should be treated as numbers',
		},
		{
			displayName: 'Download Attachments?',
			name: 'download',
			type: 'boolean',
			default: false,
			description:'Download submitted attachments',
		},
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
			default:'relatedQuestion',
			description:'The strategy to name the downloaded files',
			options: [
				{name: 'Related Form Question',        value: 'relatedQuestion'},
				{name: 'Original Server File Name',    value: 'filename'},
			],
		},
	],
} as INodeProperties;
