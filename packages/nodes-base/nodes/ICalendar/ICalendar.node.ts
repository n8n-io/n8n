/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as createEvent from './createEvent.operation';

export class ICalendar implements INodeType {
	description: INodeTypeDescription = {
		hidden: true,
		displayName: 'iCalendar',
		name: 'iCal',
		icon: 'fa:calendar',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Create iCalendar file',
		defaults: {
			name: 'iCalendar',
			color: '#408000',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create Event File',
						value: 'createEventFile',
					},
				],
				default: 'createEventFile',
			},
			...createEvent.description,
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);

		let returnData: INodeExecutionData[] = [];

		if (operation === 'createEventFile') {
			returnData = await createEvent.execute.call(this, items);
		}

		return [returnData];
	}
}
