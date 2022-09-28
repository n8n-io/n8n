import {INodeProperties} from "n8n-workflow";

export const uiProperties = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		placeholder: 'Resource URL',
		required: true,
		description: 'Resource URL',
	},
	{
		displayName: 'Method',
		name: 'method',
		type: 'options',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Post',
				value: 'post',
			},
			{
				name: 'Put',
				value: 'put',
			},
			{
				name: 'Patch',
				value: 'patch',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Query String',
		name: 'query',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				method: [
					'get',
				],
			},
		},
		description: 'Additional Query String for Get Method.',
	},
	{
		displayName: 'Request Body',
		name: 'body',
		type: 'string',
		required: true,
		placeholder: 'Should be a Valid JSON',
		displayOptions: {
			show: {
				method: [
					'post',
					'patch',
					'put',
				],
			},
		},
		typeOptions: {
			rows: 4,
		},
	},
] as INodeProperties[];
