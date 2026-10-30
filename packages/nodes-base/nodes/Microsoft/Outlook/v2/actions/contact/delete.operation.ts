import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { contactPermanentDelete, contactRLC } from '../../descriptions';
import { executeDeletion } from '../../helpers/delete';

export const properties: INodeProperties[] = [contactRLC, contactPermanentDelete];

const displayOptions = {
	show: {
		resource: ['contact'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const contactId = this.getNodeParameter('contactId', index, undefined, {
		extractValue: true,
	}) as string;

	await executeDeletion.call(this, index, `/contacts/${contactId}`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
