import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import { highLevelApiRequest } from './GenericFunctions';

import moment from 'moment';


/*
import {
	 highLevelApiRequest,
} from './GenericFunctions';

import {
	 snakeCase,
} from 'change-case';
*/


export class HighLevelTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HighLevel Trigger',
		name: 'highLevelTrigger',
		icon: 'file:highLevel.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle HighLevel events via webhooks',
		defaults: {
			name: 'HighLevel Trigger',
			color: '#f1be40',
		},
		polling: true,
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'highLevelApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://rest.gohighlevel.com/v1',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
		},
		// webhooks: [
		// 	{
		// 		name: 'default',
		// 		httpMethod: 'POST',
		// 		responseMode: 'onReceived',
		// 		path: 'webhook',
		// 	},
		// ],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				required: true,
				options: [
					{
						name: 'New Opportunity',
						value: 'opportunity',
					},
				],
				default: 'opportunity',
			},
			{
				displayName: 'Pipeline ID',
				name: 'pipelineId',
				type: 'options',
				displayOptions: {
					show: {
						triggerOn: [
							'opportunity',
						],
					},
				},
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								url: '/pipelines',
								method: 'GET',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'pipelines',
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.name}}',
											value: '={{$responseItem.id}}',
										},
									},
									{
										type: 'sort',
										properties: {
											key: 'name',
										},
									},
								],
							},
						},
					}
				},
				default: '',
			}
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const triggerOn = this.getNodeParameter('triggerOn') as string;



		console.log(webhookData)

		if (triggerOn === 'opportunity') {
			const pipelineId = this.getNodeParameter('pipelineId') as string;
			const resource = `/pipelines/${pipelineId}/opportunities`;

			const limit = 100;
			const startDate = moment().valueOf();
			const endDate = moment().valueOf();
			const query = { limit, startDate, endDate };

			const responseData = await highLevelApiRequest.call(this, 'GET', resource, {}, query);
			const opportunities = responseData.opportunities;

			webhookData.lastTimeChecked = endDate;

			console.log(responseData)

			// if (Array.isArray(opportunities) && opportunities.length !== 0) {
			// 	return [this.helpers.returnJsonArray(opportunities)];
			// }
			return [this.helpers.returnJsonArray(opportunities)];
		}

		return null;
	}
}
