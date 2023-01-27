import type { IPollFunctions } from 'n8n-core';
import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import moment from 'moment';
import { togglApiRequest } from './GenericFunctions';

export class TogglTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Toggl Trigger',
		name: 'togglTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:toggl.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Toggl events occur',
		defaults: {
			name: 'Toggl Trigger',
		},
		credentials: [
			{
				name: 'togglApi',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'New Time Entry',
						value: 'newTimeEntry',
					},
				],
				required: true,
				default: 'newTimeEntry',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const event = this.getNodeParameter('event') as string;
		let endpoint: string;

		if (event === 'newTimeEntry') {
			endpoint = '/time_entries';
		} else {
			throw new NodeOperationError(this.getNode(), `The defined event "${event}" is not supported`);
		}

		const qs: IDataObject = {};
		let timeEntries = [];
		qs.start_date = webhookData.lastTimeChecked;
		qs.end_date = moment().format();

		try {
			timeEntries = await togglApiRequest.call(this, 'GET', endpoint, {}, qs);
			webhookData.lastTimeChecked = qs.end_date;
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
		if (Array.isArray(timeEntries) && timeEntries.length !== 0) {
			return [this.helpers.returnJsonArray(timeEntries)];
		}

		return null;
	}
}
