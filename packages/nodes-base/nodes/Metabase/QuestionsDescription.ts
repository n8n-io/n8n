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
					output: {
						postReceive: [
						// @ts-ignore
						function(
							this: IExecuteSingleFunctions,
							_items: INodeExecutionData[],
							response: MetabaseQuestionsResponse,
						): INodeExecutionData[] {
							// @ts-ignore
							return response.body.map((metabaseQuestion) => {
										return {
											json: {
												...metabaseQuestion,
										},
									};
							});
						},
						],
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
					},
					output: {
						postReceive: [
						// @ts-ignore
						function(
							this: IExecuteSingleFunctions,
							_items: INodeExecutionData[],
							response: MetabaseQuestionResponse,
						): INodeExecutionData[] {
							const items = [];
							items.push(response.body);
							// @ts-ignore
							return items.map((metabaseQuestion) => {
										return {
											json: {
												...metabaseQuestion,
										},
									};
							});
						},
						],
					},
					},
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
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
								properties: {
									destinationProperty: 'Result',
								},
							},
						],
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
										'resultData',
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
										'resultData',
								],
			},
		},
	},
];

type MetabaseQuestionsResponse = IN8nHttpFullResponse & {
		body: Array<{id: number,name: string, result_metadata: MetabaseResultMetadata[], description: string, creator_id: number, table_id: number, database_id: number }>
};

type MetabaseQuestionResponse = IN8nHttpFullResponse & {
	body: {id: number,name: string, result_metadata: MetabaseResultMetadata[], description: string, creator_id: number, table_id: number, database_id: number }
};

type MetabaseResultMetadata = {
	display_name: string,
	fingerprint: {
			type: {
					'type/Number': {
							avg: number
							min: number
							max: number
					}
				}
			}
};
