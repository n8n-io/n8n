import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { calendarRLC, eventRLC } from '../../descriptions';
import { decodeOutlookId } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [calendarRLC, eventRLC];

const displayOptions = {
	show: {
		resource: ['event'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const eventId = decodeOutlookId(
		this.getNodeParameter('eventId', index, undefined, {
			extractValue: true,
		}) as string,
	);

	await microsoftApiRequest.call(this, 'DELETE', `/calendar/events/${eventId}`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
