import {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

export const questionsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'questions',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the questions',
				routing: {
					request: {
						method: 'GET',
						url: '/api/card/',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific question',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/api/card/" + $parameter.questionId}}',
						returnFullResponse: true,
					},
				},
			},
						{
				name: 'Export',
				value: 'export',
				description: 'Export question to a specific file format',
				routing: {
					request: {
						method: 'POST',
						url: '={{"/api/card/" + $parameter.questionId + "/query/" + $parameter.format}}',
						returnFullResponse: true,
					},
				},
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];

export const questionsFields: INodeProperties[] = [
	{
		displayName: 'Question Id',
		name: 'questionId',
		type: 'string',
		required: true,
		placeholder: '0',
		displayOptions: {
			show: {
				resource: [
					'questions',
				],
								operation: [
										'get',
										'export',
								],
			},
		},
		default: '',
	},
		{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		required: true,
				options: [
						{
								name: 'CSV',
								value: 'csv',
						},
						{
								name: 'JSON',
								value: 'json',
						},
						{
								name: 'API',
								value: 'api',
						},
						{
								name: 'XLSX',
								value: 'xlsx',
						},
				],
				default: 'csv',
		displayOptions: {
			show: {
				resource: [
					'questions',
				],
								operation: [
										'export',
								],
			},
		},
	},
];
