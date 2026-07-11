import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { calendarRLC, eventRLC } from '../../descriptions';
import { executeDeletion } from '../../helpers/delete';
import { decodeOutlookId } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	calendarRLC,
	eventRLC,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Permanent Delete',
				name: 'permanentDelete',
				type: 'boolean',
				default: false,
				description:
					"Permanently delete an event and place it in the purges folder at the user's mailbox.",
			},
		],
	},
];

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

	await executeDeletion.call(this, index, `/calendar/events/${eventId}`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
