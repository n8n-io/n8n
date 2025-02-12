import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import * as send from './send.operation';
import * as sendAndWait from './sendAndWait.operation';
import { sendAndWaitWebhooksDescription } from '../../../utils/sendAndWait/descriptions';
import { sendAndWaitWebhook } from '../../../utils/sendAndWait/utils';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Quick Mail>',
	name: 'quickMail',
	icon: 'fa:envelope',
	group: ['output'],
	version: [1],
	description: 'Sends an email to a local user',
	defaults: {
		name: 'Quick Mail',
		color: '#00bb88',
	},
	inputs: [NodeConnectionType.Main],
	outputs: [NodeConnectionType.Main],
	usableAsTool: true,
	webhooks: sendAndWaitWebhooksDescription,
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'hidden',
			noDataExpression: true,
			default: 'email',
			options: [
				{
					name: 'Email',
					value: 'email',
				},
			],
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			default: 'send',
			options: [
				{
					name: 'Send',
					value: 'send',
					action: 'Send an Email',
				},
				{
					name: 'Send and Wait for Response',
					value: SEND_AND_WAIT_OPERATION,
					action: 'Send message and wait for response',
				},
			],
		},
		...send.description,
		...sendAndWait.description,
	],
};

export class QuickMailV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	webhook = sendAndWaitWebhook;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let returnData: INodeExecutionData[][] = [];
		const operation = this.getNodeParameter('operation', 0);

		if (operation === SEND_AND_WAIT_OPERATION) {
			returnData = await sendAndWait.execute.call(this);
		}

		if (operation === 'send') {
			returnData = await send.execute.call(this);
		}

		return returnData;
	}
}
