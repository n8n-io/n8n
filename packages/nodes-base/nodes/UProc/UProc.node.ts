/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { uprocApiRequest } from './GenericFunctions';

import { groupOptions } from './GroupDescription';

import { toolOperations, toolParameters } from './ToolDescription';

export class UProc implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'uProc',
		name: 'uproc',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:uproc.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["tool"]}}',
		description: 'Consume uProc API',
		defaults: {
			name: 'uProc',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'uprocApi',
				required: true,
			},
		],
		properties: [
			...groupOptions,
			...toolOperations,
			...toolParameters,
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						group: [
							'audio',
							'communication',
							'company',
							'finance',
							'geographic',
							'image',
							'internet',
							'personal',
							'product',
							'security',
							'text',
						],
					},
				},
				options: [
					{
						displayName: 'Data Webhook',
						name: 'dataWebhook',
						type: 'string',
						description: 'URL to send tool response when tool has resolved your request',
						default: '',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const group = this.getNodeParameter('group', 0) as string;
		const tool = this.getNodeParameter('tool', 0) as string;
		const additionalOptions = this.getNodeParameter('additionalOptions', 0) as IDataObject;

		const dataWebhook = additionalOptions.dataWebhook as string;

		interface LooseObject {
			[key: string]: any; // tslint:disable-line:no-any
		}

		const fields = toolParameters
			.filter((field) => {
				return (
					field &&
					field.displayOptions &&
					field.displayOptions.show &&
					field.displayOptions.show.group &&
					field.displayOptions.show.tool &&
					field.displayOptions.show.group.indexOf(group) !== -1 &&
					field.displayOptions.show.tool.indexOf(tool) !== -1
				);
			})
			.map((field) => {
				return field.name;
			});

		const requestPromises = [];
		for (let i = 0; i < length; i++) {
			try {
				const toolKey = tool.replace(/([A-Z]+)/g, '-$1').toLowerCase();
				const body: LooseObject = {
					processor: toolKey,
					params: {},
				};

				fields.forEach((field) => {
					if (field && field.length) {
						const data = this.getNodeParameter(field, i) as string;
						body.params[field] = data + '';
					}
				});

				if (dataWebhook && dataWebhook.length) {
					body.callback = {};
				}

				if (dataWebhook && dataWebhook.length) {
					body.callback.data = dataWebhook;
				}

				//Change to multiple requests
				responseData = await uprocApiRequest.call(this, 'POST', body);

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
