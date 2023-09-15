import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';
import { messageRLC } from '../../descriptions';
import { updateDisplayOptions } from '@utils/utilities';

export const properties: INodeProperties[] = [messageRLC];

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
	await microsoftApiRequest.call(this, 'DELETE', `/messages/${messageId}`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
