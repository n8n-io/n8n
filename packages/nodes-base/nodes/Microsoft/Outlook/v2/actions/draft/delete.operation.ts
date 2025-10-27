import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { draftRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [draftRLC];

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
	await microsoftApiRequest.call(this, 'DELETE', `/messages/${draftId}`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
