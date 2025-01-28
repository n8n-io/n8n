import { type INodeProperties } from 'n8n-workflow';

export const responseHeaders: INodeProperties = {
	displayName: 'Response Headers',
	name: 'responseHeaders',
	placeholder: 'Add Response Header',
	description: 'Add headers to the webhook response',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	options: [
		{
			name: 'entries',
			displayName: 'Entries',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					description: 'Name of the header',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					description: 'Value of the header',
				},
			],
		},
	],
};

export const responseCode: INodeProperties = {
	displayName: 'Response Code',
	name: 'responseCode',
	type: 'number',
	typeOptions: {
		minValue: 100,
		maxValue: 599,
	},
	default: 200,
	description: 'The HTTP response code to return. Defaults to 200.',
};

export const responseDataSourceDescription: INodeProperties = {
	displayName: 'Response Data Source',
	name: 'responseDataSource',
	type: 'options',
	displayOptions: {
		show: {
			respondWith: ['binary'],
		},
	},
	options: [
		{
			name: 'Choose Automatically From Input',
			value: 'automatically',
			description: 'Use if input data will contain a single piece of binary data',
		},
		{
			name: 'Specify Myself',
			value: 'set',
			description: 'Enter the name of the input field the binary data will be in',
		},
	],
	default: 'automatically',
};

export const inputFieldName: INodeProperties = {
	displayName: 'Input Field Name',
	name: 'inputFieldName',
	type: 'string',
	required: true,
	default: 'data',
	displayOptions: {
		show: {
			respondWith: ['binary'],
			responseDataSource: ['set'],
		},
	},
	description: 'The name of the node input field with the binary data',
};
