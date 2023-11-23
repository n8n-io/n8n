import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { theHiveApiRequest } from '../../transport';
import { commentRLC } from '../../descriptions';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

const properties: INodeProperties[] = [commentRLC];

const displayOptions = {
	show: {
		resource: ['comment'],
		operation: ['deleteComment'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const commentId = this.getNodeParameter('commentId', i, '', { extractValue: true }) as string;

	await theHiveApiRequest.call(this, 'DELETE', `/v1/comment/${commentId}`);

	const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
		itemData: { item: i },
	});

	return executionData;
}
