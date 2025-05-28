import type {
	INodeExecutionData,
	INodeProperties,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
} from 'n8n-workflow';

import { sendErrorPostReceive } from '../GenericFunctions';

export const chatOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chat'],
			},
		},
		options: [
			{
				name: 'Complete',
				value: 'complete',
				action: 'Создать завершение',
				description: 'Создать одно или несколько завершений для заданного текста',
				routing: {
					request: {
						method: 'POST',
						url: '/chat/completions',
					},
					output: { postReceive: [sendErrorPostReceive] },
				},
			},
		],
		default: 'complete',
	},
];

const completeOperations: INodeProperties[] = [
	{
		displayName: 'Модель',
		name: 'model',
		type: 'options',
		description: 'Модель, которая будет генерировать завершение',
		displayOptions: {
			show: {
				operation: ['complete'],
				resource: ['chat'],
			},
		},
		options: [
			{
				name: 'GigaChat',
				value: 'GigaChat',
			},
			{
				name: 'GigaChat-Pro',
				value: 'GigaChat-Pro',
			},
			{
				name: 'GigaChat-Pro-preview',
				value: 'GigaChat-Pro-preview',
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
		default: 'GigaChat',
	},
	{
		displayName: 'Сообщения',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			sortable: true,
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['complete'],
			},
		},
		placeholder: 'Добавить сообщение',
		default: {},
		routing: {
			send: {
				type: 'body',
				property: 'messages',
				value: '={{$parameter.messages.messages}}',
			},
		},
		options: [
			{
				displayName: 'Сообщения',
				name: 'messages',
				values: [
					{
						displayName: 'Роль',
						name: 'role',
						type: 'options',
						options: [
							{
								name: 'Ассистент',
								value: 'assistant',
							},
							{
								name: 'Система',
								value: 'system',
							},
							{
								name: 'Пользователь',
								value: 'user',
							},
							{
								name: 'Функция',
								value: 'function',
							},
						],
						default: 'user',
					},
					{
						displayName: 'Содержимое',
						name: 'content',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
];

const sharedOperations: INodeProperties[] = [
	{
		displayName: 'Упростить вывод',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: ['complete'],
				resource: ['chat'],
			},
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{$value}}',
						properties: {
							value: '={{ { "data": $response.body.choices } }}',
						},
					},
					{
						type: 'rootProperty',
						enabled: '={{$value}}',
						properties: {
							property: 'data',
						},
					},
					async function (
						this: IExecuteSingleFunctions,
						items: INodeExecutionData[],
						_response: IN8nHttpFullResponse,
					): Promise<INodeExecutionData[]> {
						if (this.getNode().parameters.simplifyOutput === false) {
							return items;
						}
						return items.map((item) => {
							return {
								json: {
									...item.json,
									message: item.json.message,
								},
							};
						});
					},
				],
			},
		},
		description: 'Возвращать ли упрощенную версию ответа вместо необработанных данных',
	},

	{
		displayName: 'Опции',
		name: 'options',
		placeholder: 'Добавить опцию',
		description: 'Дополнительные опции',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				operation: ['complete'],
				resource: ['chat'],
			},
		},
		options: [
			{
				displayName: 'Температура',
				name: 'temperature',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'Контролирует случайность: более низкие значения дают менее случайные завершения',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'temperature',
					},
				},
			},
			{
				displayName: 'Top P',
				name: 'topP',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description: 'Контролирует разнообразие через ядерную выборку',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'top_p',
					},
				},
			},
			{
				displayName: 'Максимальное количество токенов',
				name: 'maxTokens',
				default: 2048,
				description: 'Максимальное количество токенов для генерации в завершении',
				type: 'number',
				typeOptions: {
					maxValue: 32768,
				},
				routing: {
					send: {
						type: 'body',
						property: 'max_tokens',
					},
				},
			},
			{
				displayName: 'Штраф за повторение',
				name: 'repetition_penalty',
				default: 1.0,
				description: 'Штраф за повторение слов. Значение больше 1 уменьшает вероятность повторения',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'repetition_penalty',
					},
				},
			},
			{
				displayName: 'Потоковая передача',
				name: 'stream',
				default: false,
				description: 'Передавать ли сообщения по частям в потоке',
				type: 'boolean',
				routing: {
					send: {
						type: 'body',
						property: 'stream',
					},
				},
			},
		],
	},
];

export const chatFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                               chat:complete                                */
	/* -------------------------------------------------------------------------- */
	...completeOperations,

	/* -------------------------------------------------------------------------- */
	/*                                chat:ALL                                    */
	/* -------------------------------------------------------------------------- */
	...sharedOperations,
];
