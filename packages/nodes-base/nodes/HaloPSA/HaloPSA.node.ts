import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

export class HaloPSA implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'HaloPSA',
			name: 'haloPSA',
			icon: 'file:halopsa.svg',
			group: ['input'],
			version: 1,
			description: 'Consume HaloPSA API',
			defaults: {
					name: 'HaloPSA',
					color: '#fd314e',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'haloPSAApi',
					required: true,
					// displayOptions: {
					// 	show: {
					// 		authentication: [
					// 			'accessToken',
					// 		],
					// 	},
					// },
				}
			],
			properties: [
				// {
				// 	displayName: 'Authentication',
				// 	name: 'authentication',
				// 	type: 'options',
				// 	options: [
				// 		{
				// 			name: 'Access Token',
				// 			value: 'accessToken',
				// 		},
				// 		{
				// 			name: 'OAuth2',
				// 			value: 'oAuth2',
				// 		},
				// 	],
				// 	default: 'accessToken',
				// 	description: 'Means of authenticating with the service.',
				// },
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					options: [
						{
							name: 'Ticket',
							value: 'ticket',
						},
						{
							name: 'Invoice',
							value: 'invoice',
						},
						{
							name: 'Client',
							value: 'client',
						},
					],
					default: 'ticket',
					required: true,
					description: 'Resource to consume',
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					displayOptions: {
						show: {
							resource: [
								'client',
								'invoice',
								'ticket'
							],
						},
					},
					options: [
						{
							name: 'Get All',
							value: 'getAll',
						},
						{
							name: 'Create',
							value: 'create',
						},
						{
							name: 'Delete',
							value: 'delete',
						},
					],
					default: 'getAll',
					description: 'The operation to perform.',
				},
				{
					displayName: 'Return All',
					name: 'returnAll',
					type: 'boolean',
					displayOptions: {
						show: {
							resource: [
								'client',
								'invoice',
								'ticket'
							],
							operation: [
								'getAll',
							],
						},
					},
					default: false,
					description: 'If set to true, all the results will be returned.',
				},
				{
					displayName: 'Limit',
					name: 'limit',
					type: 'number',
					displayOptions: {
						show: {
							resource: [
								'client',
								'invoice',
								'ticket'
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
						maxValue: 1000,
					},
					default: 100,
					description: 'How many results to return.',
				},
			],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		console.log(operation, resource);

		return [[]];
	}
}
