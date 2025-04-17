import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { caseRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	caseRLC,
	{
		displayName: 'Attachment Name or ID',
		name: 'attachmentId',
		type: 'options',
		default: '',
		required: true,
		description:
			'ID of the attachment. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'loadCaseAttachments',
		},
	},
];

const displayOptions = {
	show: {
		resource: ['case'],
		operation: ['deleteAttachment'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;
	const attachmentId = this.getNodeParameter('attachmentId', i) as string;

	await theHiveApiRequest.call(this, 'DELETE', `/v1/case/${caseId}/attachment/${attachmentId}`);

	const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
		itemData: { item: i },
	});

	return executionData;
}
