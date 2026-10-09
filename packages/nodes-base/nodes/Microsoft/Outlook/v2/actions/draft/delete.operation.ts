import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { draftPermanentDelete, draftRLC } from '../../descriptions';
import { executeDeletion } from '../../helpers/delete';

export const properties: INodeProperties[] = [draftRLC, draftPermanentDelete];

const displayOptions = {
	show: {
		resource: ['draft'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const draftId = this.getNodeParameter('draftId', index, undefined, {
		extractValue: true,
	}) as string;

	await executeDeletion.call(this, index, `/messages/${draftId}`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
