import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { draftRLC } from '../../descriptions';
import { makeRecipient } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	draftRLC,
	{
		displayName: 'To',
		name: 'to',
		description: 'Comma-separated list of email addresses of recipients',
		type: 'string',
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['draft'],
		operation: ['send'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const draftId = this.getNodeParameter('draftId', index, undefined, { extractValue: true });
	const to = this.getNodeParameter('to', index) as string;

	if (to) {
		const recipients = to
			.split(',')
			.map((s) => s.trim())
			.filter((email) => email);

		if (recipients.length !== 0) {
			await microsoftApiRequest.call(this, 'PATCH', `/messages/${draftId}`, {
				toRecipients: recipients.map((recipient: string) => makeRecipient(recipient)),
			});
		}
	}

	await microsoftApiRequest.call(this, 'POST', `/messages/${draftId}/send`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
