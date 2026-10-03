import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { calendarPermanentDelete, calendarRLC } from '../../descriptions';
import { executeDeletion } from '../../helpers/delete';

export const properties: INodeProperties[] = [calendarRLC, calendarPermanentDelete];

const displayOptions = {
	show: {
		resource: ['calendar'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const calendarId = this.getNodeParameter('calendarId', index, undefined, {
		extractValue: true,
	}) as string;

	await executeDeletion.call(this, index, `/calendars/${calendarId}`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
