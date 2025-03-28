import type { INodeProperties } from '../Interfaces';

export const commonToolParameters: INodeProperties[] = [
	{
		displayName: 'Optimize Response',
		name: 'optimizeResponse',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		description:
			'Whether to optimize the tool response to reduce amount of data passed to the LLM, which can lead to better result and reduce cost',
	},
	{
		displayName: 'Expected Response Type',
		name: 'responseType',
		type: 'options',
		displayOptions: {
			show: {
				optimizeResponse: [true],
			},
		},
		options: [
			{
				name: 'JSON',
				value: 'json',
			},
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: 'Text',
				value: 'text',
			},
		],
		default: 'json',
	},
	{
		displayName: 'Field Containing Data',
		name: 'dataField',
		type: 'string',
		default: '',
		placeholder: 'e.g. records',
		description: 'Specify the name of the field in the response containing the data',
		hint: 'leave blank to use whole response',
		requiresDataPath: 'single',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['json'],
			},
		},
	},
	{
		displayName: 'Include Fields',
		name: 'fieldsToInclude',
		type: 'options',
		description: 'What fields response object should include',
		default: 'all',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['json'],
			},
		},
		options: [
			{
				name: 'All',
				value: 'all',
				description: 'Include all fields',
			},
			{
				name: 'Selected',
				value: 'selected',
				description: 'Include only fields specified below',
			},
			{
				name: 'Except',
				value: 'except',
				description: 'Exclude fields specified below',
			},
		],
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		default: '',
		placeholder: 'e.g. field1,field2',
		description:
			'Comma-separated list of the field names. Supports dot notation. You can drag the selected fields from the input panel.',
		requiresDataPath: 'multiple',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['json'],
			},
			hide: {
				fieldsToInclude: ['all'],
			},
		},
	},
	{
		displayName: 'Selector (CSS)',
		name: 'cssSelector',
		type: 'string',
		description:
			'Select specific element (e.g. body) or multiple elements (e.g. div) of the chosen type in the response HTML.',
		placeholder: 'e.g. body',
		default: 'body',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
			},
		},
	},
	{
		displayName: 'Return Only Content',
		name: 'onlyContent',
		type: 'boolean',
		default: false,
		description:
			'Whether to return only content of html elements, stripping html tags and attributes',
		hint: 'Uses less tokens and may be easier for model to understand',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
			},
		},
	},
	{
		displayName: 'Elements To Omit',
		name: 'elementsToOmit',
		type: 'string',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
				onlyContent: [true],
			},
		},
		default: '',
		placeholder: 'e.g. img, .className, #ItemId',
		description: 'Comma-separated list of selectors that would be excluded when extracting content',
	},
	{
		displayName: 'Truncate Response',
		name: 'truncateResponse',
		type: 'boolean',
		default: false,
		hint: 'Helps save tokens',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['text', 'html'],
			},
		},
	},
	{
		displayName: 'Max Response Characters',
		name: 'maxLength',
		type: 'number',
		default: 1000,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['text', 'html'],
				truncateResponse: [true],
			},
		},
	},
];
