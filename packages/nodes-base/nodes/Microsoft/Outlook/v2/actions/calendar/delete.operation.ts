import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { calendarRLC } from '../../descriptions';
import { executeDeletion } from '../../helpers/delete';

export const properties: INodeProperties[] = [
	calendarRLC,
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
					"Permanently delete a calendar folder and the events that it contains and remove them from the mailbox. Folders aren't placed in the purges folder when they're permanently deleted.",
			},
		],
	},
];

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
