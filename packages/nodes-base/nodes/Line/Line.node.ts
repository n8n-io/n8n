import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import { notificationFields, notificationOperations } from './NotificationDescription';

export class Line implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Line',
		name: 'line',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:line.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Line API',
		hidden: true,
		defaults: {
			name: 'Line',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'lineNotifyOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						resource: ['notification'],
					},
				},
			},
		],
		properties: [
			{
				displayName:
					'Line Notify API has been shut down as of March 31, 2025 and this node will no longer function. See the <a href="https://notify-bot.line.me/closing-announce" target="_blank">official shutdown announcement</a>.',
				name: 'deprecated',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Notification',
						value: 'notification',
					},
				],
				default: 'notification',
			},
			...notificationOperations,
			...notificationFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		throw new NodeApiError(this.getNode(), {
			message: 'Line Notify API was shut down on March 31, 2025 and is no longer available.',
			level: 'warning',
		});
	}
}
