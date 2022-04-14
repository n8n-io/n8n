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
								if(metabaseQuestion.result_metadata[0].fingerprint){
									return {
										json: {
											name: metabaseQuestion.name,
											id: metabaseQuestion.id,
											description: metabaseQuestion.description,
											average: metabaseQuestion.result_metadata[0].fingerprint.type['type/Number'].avg,
											min: metabaseQuestion.result_metadata[0].fingerprint.type['type/Number'].min,
											max: metabaseQuestion.result_metadata[0].fingerprint.type['type/Number'].max,
											creator_id: metabaseQuestion.creator_id,
											database_id: metabaseQuestion.database_id,
										},
									};
								}	else if(!this.getNode().parameters.simple){
										return {
											json: {
												...metabaseQuestion,
										},
									};
								} else{
									return {
										json: {
											name: metabaseQuestion.name,
											id: metabaseQuestion.id,
											description: metabaseQuestion.description,
											creator_id: metabaseQuestion.creator_id,
											database_id: metabaseQuestion.database_id,
										},
									};
								}
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
								if(metabaseQuestion.result_metadata[0].fingerprint && this.getNode().parameters.simple){
									return {
										json: {
											name: metabaseQuestion.name,
											id: metabaseQuestion.id,
											description: metabaseQuestion.description,
											average: metabaseQuestion.result_metadata[0].fingerprint.type['type/Number'].avg,
											min: metabaseQuestion.result_metadata[0].fingerprint.type['type/Number'].min,
											max: metabaseQuestion.result_metadata[0].fingerprint.type['type/Number'].max,
											creator_id: metabaseQuestion.creator_id,
											database_id: metabaseQuestion.database_id,
										},
									};
								} else if(!this.getNode().parameters.simple){
										return {
											json: {
												...metabaseQuestion,
										},
									};
								} else{
									return {
										json: {
											name: metabaseQuestion.name,
											id: metabaseQuestion.id,
											description: metabaseQuestion.description,
											creator_id: metabaseQuestion.creator_id,
											database_id: metabaseQuestion.database_id,
										},
									};
								}
							});
						},
						],
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
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'questions',
				],
				operation: [
					'get',
					'getAll',
				],
			},
		},
		default: true,
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
