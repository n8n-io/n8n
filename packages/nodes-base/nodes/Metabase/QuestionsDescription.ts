import {
	IDataObject,
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
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['questions'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific question',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/api/card/" + $parameter.questionId}}',
					},
				},
				action: 'Get a questions',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all the questions',
				routing: {
					request: {
						method: 'GET',
						url: '/api/card/',
					},
				},
				action: 'Get many questions',
			},
			{
				name: 'Result Data',
				value: 'resultData',
				description: 'Return the result of the question to a specific file format',
				routing: {
					request: {
						method: 'POST',
						url: '={{"/api/card/" + $parameter.questionId + "/query/" + $parameter.format}}',
						returnFullResponse: true,
						encoding: 'arraybuffer',
					},
					output: {
						postReceive: [
							// @ts-ignore
							async function (
								this: IExecuteSingleFunctions,
								_items: INodeExecutionData[],
								response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								const items = _items;
								const result: INodeExecutionData[] = [];
								for (let i = 0; i < items.length; i++) {
									const newItem: INodeExecutionData = {
										json: items[i].json,
										binary: {},
									};

									if (items[i].binary !== undefined) {
										Object.assign(newItem.binary, items[i].binary);
									}
									items[i] = newItem;
									if (this.getNode().parameters.format === 'json') {
										items[i].json = JSON.parse(
											items[i].json as unknown as string,
										)[0] as unknown as IDataObject;
										console.log(items[i].json);
										delete items[i].binary;
									} else {
										items[i].binary!['data'] = await this.helpers.prepareBinaryData(
											response.body as Buffer,
											'data',
											response.headers['content-type'],
										);
									}
									result.push(items[i]);
								}
								return result;
							},
						],
					},
				},
				action: 'Result Data a questions',
			},
		],
		default: 'getAll',
	},
];

export const questionsFields: INodeProperties[] = [
	{
		displayName: 'Question ID',
		name: 'questionId',
		type: 'string',
		required: true,
		placeholder: '0',
		displayOptions: {
			show: {
				resource: ['questions'],
				operation: ['get', 'resultData'],
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
				name: 'XLSX',
				value: 'xlsx',
			},
		],
		default: 'csv',
		displayOptions: {
			show: {
				resource: ['questions'],
				operation: ['resultData'],
			},
		},
	},
];
