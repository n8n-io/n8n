import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class RespondToTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Respond to Trigger',
		icon: 'file:trigger.svg',
		name: 'respondToTrigger',
		group: ['transform'],
		version: 1,
		description: 'Returns data for Trigger',
		defaults: {
			name: 'Respond to Trigger',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
		],
		properties: [
			{
				displayName: 'Acknowledge',
				name: 'acknowledge',
				type: 'boolean',
				default: true,
				description: 'Set \'true\' for acknowledge or \'false\' for not acknowledge.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const acknowledge = this.getNodeParameter('acknowledge', 0, false) as boolean;
		const response = {ack: acknowledge} as IDataObject;

		this.sendResponse(response);

		return this.prepareOutputData(items);
	}
}
