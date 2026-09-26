import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { messagePermanentDelete, messageRLC } from '../../descriptions';
import { executeDeletion } from '../../helpers/delete';

export const properties: INodeProperties[] = [messageRLC, messagePermanentDelete];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const messageId = this.getNodeParameter('messageId', index, undefined, {
		extractValue: true,
	}) as string;

	await executeDeletion.call(this, index, `/messages/${messageId}`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
