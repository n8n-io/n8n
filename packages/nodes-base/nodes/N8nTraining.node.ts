import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const data = [
	{
		'id': '23423532',
		'name': 'Thor',
		'email': 'thor@mount-olympus.net',
		'country': 'SE',
		'created': '1300-12-12',
	},
	{
		'id': '23423533',
		'name': 'Tom Hanks',
		'email': 'tom@hanks.co',
		'country': 'US',
		'created': '2021-12-12',
	},
];

export class N8nTraining implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'n8n Training',
		name: 'n8nTraining',
		icon: 'file:n8n.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'n8n training node',
		defaults: {
			name: 'n8n Training',
			color: '#ff6d5a',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Person',
						value: 'person',
					},
				],
				default: 'person',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'person',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a person',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all persons',
					},
				],
				default: 'get',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Person ID',
				name: 'personId',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'person',
						],
						operation: [
							'get',
						],
					},
				},
				default: '',
				description: 'The id of the person',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'person',
						],
						operation: [
							'getAll',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: [
							'person',
						],
						operation: [
							'getAll',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
				default: 5,
				description: 'How many results to return.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const operation = this.getNodeParameter('operation', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		let responseData;

		for (let i = 0; i < length; i++) {

			if (resource === 'person') {

				if (operation === 'get') {

					const personId = this.getNodeParameter('personId', i) as string;

					responseData = data.filter((person) => person.id === personId);
				}

				if (operation === 'getAll') {

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					if (returnAll === true) {
						responseData = data;
					} else {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = data.splice(0, limit);
					}
				}
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else if (responseData !== undefined) {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
