import {
	INodeProperties,
} from 'n8n-workflow';

export const formattingOptions = {
	displayName: 'Formatting Options',
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
			name: 'select_mask',
			type: 'string',
			default:'select_*',
			description:'Comma-separated list of wildcard-style selectors for fields that should be treated as multiselect fields, i.e. parsed as arrays',
		},
		{
			displayName: 'Number Mask',
			name: 'number_mask',
			type: 'string',
			default:'n_*, f_*',
			description:'Comma-separated list of wildcard-style selectors for fields that should be treated as numbers',
		},
	],
} as INodeProperties;
